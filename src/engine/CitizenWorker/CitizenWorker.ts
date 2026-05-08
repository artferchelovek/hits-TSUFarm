import {
  type Birth,
  type Buildings,
  BuildingType,
  type GameLog,
  Gender,
  type PlantPlace,
  type Position,
  type Resident,
  Season,
  VillagerStatus,
  Weather,
} from "../Types.ts";
import { TileType } from "../WorldMap.ts";
import {
  PLANT_CONFIG,
  REPRODUCTION,
  VILLAGER_CONFIG,
  WeatherEffects,
} from "../Constants.ts";
import { PathFinding } from "./pathfinding.ts";

export interface WorkerMessage {
  type: string;
  payload: unknown;
}

export const TERRAIN_WEIGHTS = {
  ROAD: 1,
  BRIDGE: 2,
  DEFAULT: 5,
  OBSTACLE: 999,
};

const WANDER_CHANCE = 0.5;
const WANDER_RADIUS = 5;
const WANDER_ATTEMPTS = 5;

class CitizenWorker {
  private residents: Record<string, Resident> = {};
  private buildings: Record<string, Buildings> = {};
  private grid: number[][] = [];
  private width: number = 0;
  private height: number = 0;

  init(
    tiles: Uint8Array,
    buildings: Record<string, Buildings>,
    width: number,
    height: number,
  ) {
    this.width = width;
    this.height = height;
    this.buildings = buildings;
    this.buildGrid(tiles);
  }
  constructor() {}

  private buildGrid(tiles: Uint8Array): void {
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.width; x++) {
        const tile = tiles[y * this.width + x];
        row.push(
          this.isWalkable(tile)
            ? TERRAIN_WEIGHTS.DEFAULT
            : TERRAIN_WEIGHTS.OBSTACLE,
        );
      }
      this.grid.push(row);
    }

    Object.values(this.buildings).forEach((building) => {
      this.updateObstacle(
        building.position.x,
        building.position.y,
        building.width,
        building.length,
        building.type,
      );
    });
  }

  private isWalkable(tile: TileType): boolean {
    return (
      tile === TileType.Grass ||
      tile === TileType.Sand ||
      tile === TileType.PreHill
    );
  }

  public isPositionWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    return this.grid[y][x] < TERRAIN_WEIGHTS.OBSTACLE;
  }

  public setResidents(residents: Record<string, Resident>): void {
    this.residents = residents;
  }

  public getResidents(): Record<string, Resident> {
    return this.residents;
  }

  public getResident(id: string): Resident | undefined {
    return this.residents[id];
  }

  public getGrid(): number[][] {
    return this.grid;
  }

  public calculatePath(start: Position, end: Position): Position[] {
    const pathfinder = new PathFinding(this.grid);
    const path = pathfinder.findPath(start, end);
    return path;
  }

  public serialize(): Uint8Array {
    const data = new Uint8Array(this.width * this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        data[y * this.width + x] = this.grid[y][x];
      }
    }
    return data;
  }
  public updateBuilding(building: Buildings): void {
    this.buildings[building.id] = building;
    this.updateObstacle(
      building.position.x,
      building.position.y,
      building.width,
      building.length,
      building.type,
    );
  }
  public updateObstacle(
    x: number,
    y: number,
    w: number,
    l: number,
    type: BuildingType,
  ): void {
    let cost = TERRAIN_WEIGHTS.OBSTACLE;

    if (type === BuildingType.Road) cost = TERRAIN_WEIGHTS.ROAD;
    if (type === BuildingType.Bridge) cost = TERRAIN_WEIGHTS.BRIDGE;

    for (let i = y; i < y + l; i++) {
      for (let j = x; j < x + w; j++) {
        if (i < this.height && j < this.width) {
          this.grid[i][j] = cost;
        }
      }
    }
  }
  public tick(payload: {
    isNight: boolean;
    weather: Weather;
    season: Season;
    plantBuildings: PlantPlace[];
    tick: number;
  }) {
    const deadResidentIds: string[] = [];
    const logs: GameLog[] = [];
    const births: Birth[] = [];
    for (const id in this.residents) {
      const resident = this.residents[id];
      if (
        payload.isNight &&
        resident.status === VillagerStatus.Idle &&
        resident.age >= REPRODUCTION.MIN_FERTILITY_AGE &&
        resident.gender === Gender.Male
      ) {
        const home = resident.homeId
          ? this.residents[resident.homeId]
          : undefined;
        if (!home) continue;

        const homeX = home.position.x - 1;
        const homeY = home.position.y - 1;
        const isAtHome =
          resident.position.x === homeX && resident.position.y === homeY;

        if (!isAtHome) continue;

        const partner = Object.values(this.residents).find(
          (r) =>
            r.id !== resident.id &&
            r.homeId === resident.homeId &&
            r.age >= REPRODUCTION.MIN_FERTILITY_AGE &&
            r.gender !== resident.gender &&
            r.parents.parentFirst !== resident.id &&
            r.parents.parentSecond !== resident.id &&
            r.position.x === homeX &&
            r.position.y === homeY,
        );
        if (partner) {
          if (this.birthEvents(resident, partner)) {
            births.push({ parentFirst: resident.id, parentSecond: partner.id });
          }
        }
      }
      this.updateResidentBio(
        this.residents[id],
        deadResidentIds,
        logs,
        payload.tick,
      );

      this.updateMovement(resident, payload.isNight);
    }

    for (const building of payload.plantBuildings) {
      this.processPlantGrowth(
        building,
        payload.isNight,
        payload.season,
        payload.weather,
      );
    }

    return {
      residents: this.residents,
      deadIds: deadResidentIds,
      plants: payload.plantBuildings,
      logs: logs,
      births: births,
    };
  }
  private updateResidentBio(
    resident: Resident,
    deadIds: string[],
    logs: GameLog[],
    currentTick: number,
  ): void {
    resident.hunger = Math.max(
      0,
      resident.hunger - VILLAGER_CONFIG.hungerPerTick,
    );

    if (resident.hunger <= 0) {
      resident.health = Math.max(
        0,
        resident.health - VILLAGER_CONFIG.starvationDamagePerTick,
      );
    } else if (resident.health < VILLAGER_CONFIG.maxHealth) {
      resident.health = Math.min(
        VILLAGER_CONFIG.maxHealth,
        resident.health + VILLAGER_CONFIG.healPerTick,
      );
    }

    resident.age += VILLAGER_CONFIG.agePerTick;

    const deathChance = (resident.age / 1000) * VILLAGER_CONFIG.baseDeathChance;
    if (Math.random() < deathChance || resident.health <= 0) {
      logs.push({
        id: crypto.randomUUID(),
        tick: currentTick,
        message: `${resident.name} скончался в возрасте ${Math.floor(resident.age)} лет  ${resident.health}.`,
        type: "warning",
      });
      deadIds.push(resident.id);
      delete this.residents[resident.id];
    }
  }
  private birthEvents(parentFirst: Resident, parentSecond: Resident): boolean {
    if (parentFirst.homeId !== parentSecond.homeId) {
      return false;
    }
    if (parentFirst.gender === parentSecond.gender) {
      return false;
    }

    const chance =
      this.getBirthChance(parentFirst.age) *
      this.getBirthChance(parentSecond.age);
    const successBirth = Math.random() < chance;
    console.log(successBirth);
    return successBirth;
  }

  private getBirthChance(age: number): number {
    if (age < REPRODUCTION.MIN_FERTILITY_AGE) return 0;
    if (age > REPRODUCTION.MAX_FERTILITY_AGE) return 0;

    if (age <= REPRODUCTION.PEAK_FERTILITY_AGE) {
      return REPRODUCTION.BASE_REPRODUCTION_CHANCE;
    }

    const decayRange =
      REPRODUCTION.MAX_FERTILITY_AGE - REPRODUCTION.PEAK_FERTILITY_AGE;
    const yearsLeft = REPRODUCTION.MAX_FERTILITY_AGE - age;

    return REPRODUCTION.BASE_REPRODUCTION_CHANCE * (yearsLeft / decayRange);
  }
  private processPlantGrowth(
    building: PlantPlace,
    isNight: boolean,
    currentSeason: Season,
    currentWeather: Weather,
  ): void {
    if (building.harvest && !building.harvest.isReady) {
      const config = PLANT_CONFIG[building.harvest.type];
      const consumption = config.waterConsumptionPerTick;

      const RAIN_FILL_RATE = 0.5;
      const isRaining = currentWeather === Weather.Rain;

      if (isRaining) {
        if (building.type === BuildingType.Garden) {
          building.moisture = Math.min(100, building.moisture + RAIN_FILL_RATE);
        } else if (building.type === BuildingType.Greenhouse) {
          building.waterTank.current = Math.min(
            building.waterTank.max,
            building.waterTank.current + RAIN_FILL_RATE,
          );
        }
      }

      if (building.type === BuildingType.Garden) {
        building.moisture = Math.max(0, building.moisture - consumption);
        building.isWatered = building.moisture > 0;
      } else if (building.type === BuildingType.Greenhouse) {
        building.waterTank.current = Math.max(
          0,
          building.waterTank.current - consumption,
        );
        building.isWatered = building.waterTank.current > 0;
      }

      if (building.isWatered) {
        const growthBonus = isNight
          ? WeatherEffects.NIGHT_GROWTH_COEFFICIENT
          : 1;
        building.harvest.growthProgress +=
          building.growthCoefficient * growthBonus;

        if (currentSeason === Season.Winter) {
          building.health -= WeatherEffects.WINTER_PLANT_DAMAGE;
        }

        if (building.harvest.growthProgress >= 100) {
          building.harvest.growthProgress = 100;
          building.harvest.isReady = true;
        }
      } else {
        building.health = Math.max(0, building.health - 0.1);
        if (building.health <= 0) {
          building.harvest = null;
        }
      }
    }
  }
  private updateMovement(resident: Resident, isNight: boolean): void {
    if (
      resident.status === VillagerStatus.Moving &&
      resident.pathIndex < resident.path.length
    ) {
      const nextStep = resident.path[resident.pathIndex];

      if (nextStep && this.isPositionWalkable(nextStep.x, nextStep.y)) {
        resident.position = nextStep;
        resident.pathIndex += 1;
        if (
          resident.path.length === 0 ||
          resident.pathIndex >= resident.path.length
        ) {
          resident.status = VillagerStatus.Idle;
        }
      } else {
        resident.path = [];
        resident.status = VillagerStatus.Idle;
      }
    }

    if (isNight && resident.homeId) {
      const home = this.buildings[resident.homeId];
      if (home) {
        const entryX = home.position.x - 1;
        const entryY = home.position.y - 1;

        if (resident.position.x === entryX && resident.position.y === entryY) {
          resident.status = VillagerStatus.Idle;
          console.log(`HOOOME ${resident.name}`);
          return;
        }
        if (
          resident.status === VillagerStatus.Moving &&
          resident.path.length > 0
        ) {
          return;
        }
        resident.path = this.calculatePath(resident.position, {
          x: entryX,
          y: entryY,
        });
        resident.status = VillagerStatus.Moving;
      }
    }
    if (
      resident.status === VillagerStatus.Idle &&
      Math.random() < WANDER_CHANCE &&
      !isNight
    ) {
      const randomTarget = this.getRandomWanderTarget(
        resident.position,
        WANDER_RADIUS,
      );
      if (randomTarget) {
        const path = this.calculatePath(resident.position, randomTarget);
        resident.pathIndex = 0;
        if (path.length > 0) {
          resident.path = path;
          resident.status = VillagerStatus.Moving;
        }
      }
    }
  }
  private getRandomWanderTarget(
    start: Position,
    radius: number,
  ): Position | null {
    for (let attempt = 0; attempt < WANDER_ATTEMPTS; attempt++) {
      const dx = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
      const dy = Math.floor(Math.random() * (radius * 2 + 1)) - radius;

      const tx = start.x + dx;
      const ty = start.y + dy;

      if (this.isPositionWalkable(tx, ty)) {
        return { x: tx, y: ty };
      }
    }
    return null;
  }
}

export default CitizenWorker;
