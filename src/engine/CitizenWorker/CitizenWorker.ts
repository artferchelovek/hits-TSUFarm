import {
  type Buildings,
  BuildingType,
  type Resident,
  type Position,
  VillagerStatus,
  Weather,
  Season,
  type GameLog,
  type PlantPlace,
} from "../Types.ts";
import { TileType } from "../WorldMap.ts";
import { PLANT_CONFIG, VILLAGER_CONFIG, WeatherEffects } from "../Constants.ts";
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

const WANDER_CHANCE = 0.1;
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

    for (const id in this.residents) {
      this.updateResidentBio(
        this.residents[id],
        deadResidentIds,
        logs,
        payload.tick,
      );

      if (this.residents[id]) {
        this.updateMovement(this.residents[id], payload.isNight);
      }
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

    const deathChance = (resident.age / 100) * VILLAGER_CONFIG.baseDeathChance;
    if (Math.random() < deathChance || resident.health <= 0) {
      logs.push({
        id: crypto.randomUUID(),
        tick: currentTick,
        message: `${resident.name} скончался в возрасте ${Math.floor(resident.age)} лет.`,
        type: "warning",
      });
      deadIds.push(resident.id);
      delete this.residents[resident.id];
    }
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
      resident.status === "Moving" &&
      resident.path &&
      resident.path.length > 0
    ) {
      const nextStep = resident.path[0];

      if (this.isPositionWalkable(nextStep.x, nextStep.y)) {
        resident.position = nextStep;
        resident.path.shift();

        if (resident.path.length === 0) {
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
        if (
          resident.position.x !== home.position.x ||
          resident.position.y !== home.position.y
        ) {
          resident.path = this.calculatePath(resident.position, home.position);
          resident.status = VillagerStatus.Moving;
          return;
        }
      }
    }
    if (resident.status === VillagerStatus.Idle && Math.random() < WANDER_CHANCE) {
      const randomTarget = this.getRandomWanderTarget(resident.position, WANDER_RADIUS);

      if (randomTarget) {
        const path = this.calculatePath(resident.position, randomTarget);
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
