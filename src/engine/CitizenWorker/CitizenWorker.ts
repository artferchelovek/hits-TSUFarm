import {
  type Birth,
  type Buildings,
  BuildingType,
  type CropState,
  type CropType,
  type GameLog,
  type Garden,
  Gender,
  type Granary,
  type Greenhouse,
  type House,
  moveStatuses,
  type PlantPlace,
  type Position,
  ProfessionType,
  type Resident,
  ResourceType,
  Season,
  VillagerStatus,
  Weather,
} from "../Types.ts";
import { TileType } from "../WorldMap.ts";
import {
  DROUGHT_DAMAGE_TICK,
  FARMER_TASK_DURATION,
  getMaxInventoryCapacity,
  getSpeedWork,
  PLANT_CONFIG,
  REPRODUCTION,
  VILLAGER_CONFIG,
  WeatherEffects,
} from "../Constants.ts";
import { PathFinding } from "./pathfinding.ts";

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
      tile === TileType.PreHill ||
      tile === TileType.Hill
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
    for (const externalPlant of payload.plantBuildings) {
      this.buildings[externalPlant.id] = externalPlant;
    }
    for (const id in this.residents) {
      const resident = this.residents[id];
      if (
        payload.isNight &&
        resident.status === VillagerStatus.Idle &&
        resident.age >= REPRODUCTION.MIN_FERTILITY_AGE &&
        resident.gender === Gender.Male
      ) {
        const home = resident.homeId
          ? (this.buildings[resident.homeId] as House)
          : undefined;
        console.log("DA");
        if (!home) {
          continue;
        }
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
            births.push({
              parentFirst: resident.id,
              parentSecond: partner.id,
            });
          }
        }
      }
      this.updateResidentBio(
        this.residents[id],
        deadResidentIds,
        logs,
        payload.tick,
        payload.isNight,
      );

      this.updateMovement(resident, payload.isNight);
    }
    const internalPlants = Object.values(this.buildings).filter(
      (b): b is PlantPlace =>
        b.type === BuildingType.Garden || b.type === BuildingType.Greenhouse,
    );

    for (const plant of internalPlants) {
      this.processPlantGrowth(
        plant,
        payload.isNight,
        payload.season,
        payload.weather,
      );
    }

    return {
      residents: this.residents,
      deadIds: deadResidentIds,
      plants: internalPlants,
      buildings: this.buildings,
      logs: logs,
      births: births,
    };
  }
  private updateResidentBio(
    resident: Resident,
    deadIds: string[],
    logs: GameLog[],
    currentTick: number,
    isNight: boolean,
  ): void {
    resident.hunger = Math.max(
      0,
      resident.hunger - VILLAGER_CONFIG.hungerPerTick,
    );

    if (resident.homeId === null && isNight) {
      resident.health = Math.max(
        0,
        resident.health - VILLAGER_CONFIG.homelessDamagePerTick,
      );
    }
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
  private updateFarmer(resident: Resident): void {
    if (resident.profession.type !== ProfessionType.Farmer) {
      return;
    }
    if (
      resident.inventory.totalAmount >=
      getMaxInventoryCapacity(ProfessionType.Farmer, resident.profession.level)
    ) {
      const granary = this.findNearestGranary(
        resident,
        resident.inventory.totalAmount,
      );
      if (granary) {
        resident.pathIndex = 0;
        resident.path = this.calculatePath(resident.position, {
          x: granary.position.x,
          y: granary.position.y - 1,
        });
        resident.targetId = granary.id;
        resident.status = VillagerStatus.MovingToStorage;
      }
      return;
    }
    const gardenForHarvesting = this.findNearestGardenToHarvesting(resident);
    if (gardenForHarvesting) {
      resident.targetId = gardenForHarvesting.id;
      resident.pathIndex = 0;
      resident.status = VillagerStatus.MovingToHarvest;
      resident.path = this.calculatePath(
        resident.position,
        this.getExitPos(gardenForHarvesting),
      );
    }
  }
  private getExitPos(build: Buildings): Position {
    return { x: build.position.x, y: build.position.y - 1 };
  }
  private findNearestGardenToHarvesting(
    resident: Resident,
  ): Garden | Greenhouse | undefined {
    if (resident.profession.type !== ProfessionType.Farmer) {
      return;
    }
    const needHarvesting: (Garden | Greenhouse)[] = [];
    for (const gardenId of resident.profession.assignedGardenIds) {
      const build = this.buildings[gardenId];
      console.log(build);
      if (!build) continue;
      if (
        (build.type === BuildingType.Garden ||
          build.type === BuildingType.Greenhouse) &&
        build.harvest?.isReady
      ) {
        needHarvesting.push(build as Garden | Greenhouse);
      }
    }

    if (needHarvesting.length > 0) {
      const closest = needHarvesting.reduce((prev, curr) => {
        const distPrev = prev
          ? this.getEvcDist(resident.position, prev.position)
          : Infinity;
        const distCurr = curr
          ? this.getEvcDist(resident.position, curr.position)
          : Infinity;
        return distCurr < distPrev ? curr : prev;
      });
      return closest;
    }
  }
  private findNearestGranary(
    resident: Resident,
    currentAmount: number,
  ): Granary | null {
    let minDist = Infinity;
    let nearestGranary: Granary | null = null;

    for (const build of Object.values(this.buildings)) {
      if (build.type !== BuildingType.Granary) continue;

      const granary = build as Granary;
      const freeSpace =
        granary.storage.maxCapacity - granary.storage.currentAmount;
      if (freeSpace < currentAmount) continue;

      const dist = this.getEvcDist(resident.position, {
        x: granary.position.x,
        y: granary.position.y - 1,
      });

      if (dist < minDist) {
        minDist = dist;
        nearestGranary = granary;
      }
    }

    return nearestGranary;
  }
  private getEvcDist(a: Position, b: Position): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return dx + dy - Math.min(dx, dy);
  }
  private unloadToGranary(resident: Resident): boolean {
    if (resident.profession.type !== ProfessionType.Farmer) {
      return false;
    }

    const granary = this.buildings[resident.targetId ?? ""] as Granary;
    if (!granary) {
      return false;
    }

    const freeSpace =
      granary.storage.maxCapacity - granary.storage.currentAmount;
    if (freeSpace < resident.inventory.totalAmount) {
      resident.targetId = null;
      return false;
    }

    if (resident.workProgress < FARMER_TASK_DURATION.UNLOADING) {
      resident.workProgress += getSpeedWork(
        ProfessionType.Farmer,
        resident.profession.level,
      );
      return false;
    }

    for (const [resourceType, amount] of Object.entries(
      resident.inventory.resources,
    )) {
      if (amount > 0) {
        const cropType = resourceType as CropType;
        granary.storage.resources[cropType] =
          (granary.storage.resources[cropType] ?? 0) + amount;
      }
    }

    granary.storage.currentAmount += resident.inventory.totalAmount;
    resident.inventory.resources = {};
    resident.inventory.totalAmount = 0;
    resident.workProgress = 0;
    resident.targetId = null;

    return true;
  }

  private harvesting(resident: Resident): boolean {
    if (resident.profession.type !== ProfessionType.Farmer) {
      return false;
    }
    const garden = this.buildings[resident.targetId ?? ""] as PlantPlace;
    if (!garden) {
      return false;
    }

    if (resident.workProgress < FARMER_TASK_DURATION.HARVESTING) {
      resident.workProgress += getSpeedWork(
        ProfessionType.Farmer,
        resident.profession.level,
      );
      return false;
    }
    if (!garden.harvest || !garden.harvest?.isReady) {
      return false;
    }
    const calculateHarvestAmount = (
      namePlant: CropState,
      garden: PlantPlace,
    ): number => {
      const plant = PLANT_CONFIG[namePlant.type];
      const baseYield = Math.floor(
        Math.random() * (plant.maxYield - plant.minYield + 1) + plant.minYield,
      );
      const healthFactor = garden.health / 100;
      const total = Math.round(baseYield * healthFactor);
      return Math.max(1, total);
    };

    const amount = calculateHarvestAmount(garden.harvest, garden);
    this.addItemToInventory(resident, garden.harvest.type, amount);
    resident.workProgress = 0;
    resident.targetId = null;
    const targetGarden = this.buildings[garden.id] as PlantPlace;
    targetGarden.harvest = null;
    targetGarden.moisture = 0;
    targetGarden.isWatered = false;
    return true;
  }

  private addItemToInventory = (
    resident: Resident,
    type: ResourceType,
    amount: number,
  ) => {
    if (!resident.inventory.resources[type]) {
      resident.inventory.resources[type] = 0;
    }
    resident.inventory.resources[type]! += amount;
    resident.inventory.totalAmount += amount;
  };

  private processPlantGrowth(
    building: PlantPlace,
    isNight: boolean,
    currentSeason: Season,
    currentWeather: Weather,
  ): void {
    if (building.harvest && !building.harvest.isReady) {
      const config = PLANT_CONFIG[building.harvest.type];
      const consumption = config.waterConsumptionPerTick;

      const isRaining = currentWeather === Weather.Rain;

      if (isRaining) {
        if (building.type === BuildingType.Garden) {
          building.moisture = Math.min(
            100,
            building.moisture + WeatherEffects.RAIN_MOISTURE_GAIN,
          );
        } else if (building.type === BuildingType.Greenhouse) {
          building.waterTank.current = Math.min(
            building.waterTank.max,
            building.waterTank.current + WeatherEffects.RAIN_MOISTURE_GAIN,
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
        building.health = Math.max(0, building.health - DROUGHT_DAMAGE_TICK);
        if (building.health <= 0) {
          building.harvest = null;
        }
      }
    }
  }
  private updateMovement(resident: Resident, isNight: boolean): void {
    if (
      moveStatuses.includes(resident.status) &&
      resident.pathIndex < resident.path.length
    ) {
      const nextStep = resident.path[resident.pathIndex];

      if (nextStep && this.isPositionWalkable(nextStep.x, nextStep.y)) {
        resident.position = nextStep;
        resident.pathIndex += 1;
        if (resident.gender === Gender.Male) {
          console.log(resident.position);
        }
        if (
          resident.path.length === 0 ||
          resident.pathIndex >= resident.path.length
        ) {
          if (resident.status === VillagerStatus.MovingToStorage) {
            resident.status = VillagerStatus.Unloading;
            return;
          }
          if (resident.status === VillagerStatus.MovingToHarvest) {
            resident.status = VillagerStatus.Harvesting;
            return;
          }
          resident.status = VillagerStatus.Idle;
        }
      } else {
        resident.path = [];
        resident.status = VillagerStatus.Idle;
      }
    }

    if (resident.status === VillagerStatus.Unloading) {
      if (this.unloadToGranary(resident)) {
        resident.status = VillagerStatus.Idle;
      }
    }
    if (resident.status === VillagerStatus.Harvesting) {
      if (this.harvesting(resident)) {
        resident.status = VillagerStatus.Idle;
        console.log("ВСЕ СОБРАЛ");
      }
    }

    if (isNight && resident.homeId) {
      const home = this.buildings[resident.homeId];
      if (home) {
        const entryX = home.position.x - 1;
        const entryY = home.position.y - 1;

        if (resident.position.x === entryX && resident.position.y === entryY) {
          resident.status = VillagerStatus.Idle;
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
      resident.profession.type === ProfessionType.Farmer
    ) {
      this.updateFarmer(resident);
    }
    if (
      resident.status === VillagerStatus.Idle &&
      Math.random() < WANDER_CHANCE &&
      !isNight &&
      resident.age >= VILLAGER_CONFIG.minWalkableAge
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
