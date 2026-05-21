import {
  type Birth,
  type Buildings,
  BuildingType,
  type Bakery,
  type CropState,
  type GameLog,
  Gender,
  type Granary,
  type House,
  type Mill,
  moveStatuses,
  type PlantPlace,
  type Position,
  ProfessionType,
  type Resident,
  ResourceType,
  Season,
  type TaskContext,
  type Transporter,
  VillagerStatus,
  Weather,
  type Well,
} from "../Types.ts";
import { TileType } from "../WorldMap.ts";
import {
  DROUGHT_DAMAGE_TICK,
  FARMER_TASK_DURATION,
  getMaxInventoryCapacity,
  getSpeedWork,
  getXpForNextLevel,
  PLANT_CONFIG,
  PLANT_EFFECTS,
  PROFESSION_SETTINGS,
  REPRODUCTION,
  TRANSPORTER_TASK_DURATION,
  VILLAGER_CONFIG,
  WeatherEffects,
  XP_REWARDS,
} from "../Constants.ts";
import { PathFinding } from "./pathfinding.ts";

export const TERRAIN_WEIGHTS = {
  ROAD: 1,
  BRIDGE: 2,
  DEFAULT: 5,
  WATER: 1111,
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
            : tile === TileType.Water
              ? TERRAIN_WEIGHTS.WATER
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
    return this.grid[y][x] <= TERRAIN_WEIGHTS.OBSTACLE;
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
    const oldBuilding = this.buildings[building.id];
    if (oldBuilding) {
      for (let i = oldBuilding.position.y; i < oldBuilding.position.y + oldBuilding.length; i++) {
        for (let j = oldBuilding.position.x; j < oldBuilding.position.x + oldBuilding.width; j++) {
          if (i < this.height && j < this.width) {
            this.grid[i][j] = TERRAIN_WEIGHTS.DEFAULT;
          }
        }
      }
    }

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
  public removeBuilding(id: string): void {
    const building = this.buildings[id];
    if (!building) return;

    for (let i = building.position.y; i < building.position.y + building.length; i++) {
      for (let j = building.position.x; j < building.position.x + building.width; j++) {
        if (i < this.height && j < this.width) {
          this.grid[i][j] = TERRAIN_WEIGHTS.DEFAULT;
        }
      }
    }
    delete this.buildings[id];
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

      if (
        resident.status === VillagerStatus.Idle &&
        resident.pendingProfession
      ) {
        resident.profession = resident.pendingProfession;
        delete resident.pendingProfession;
      }
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

    const mills = Object.values(this.buildings).filter(
      (b): b is Mill => b.type === BuildingType.Mill,
    );
    for (const mill of mills) {
      this.processMill(mill);
    }

    const bakeries = Object.values(this.buildings).filter(
      (b): b is Bakery => b.type === BuildingType.Bakery,
    );
    for (const bakery of bakeries) {
      this.processBakery(bakery);
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
      if (resident.homeId) {
        const home = this.buildings[resident.homeId] as House | undefined;
        if (home && "residentsId" in home) {
          home.residentsId = home.residentsId.filter(
            (id) => id !== resident.id,
          );
        }
      }
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
    const home = this.buildings[parentFirst.homeId ?? ""] as House;
    if (home && home.residentsId.length >= home.capacity) {
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

    const hasWater =
      (resident.inventory.resources[ResourceType.Water] ?? 0) > 0 ||
      (resident.inventory.resources[ResourceType.WellWater] ?? 0) > 0;

    const needsWater = (b: PlantPlace) =>
      !!b.harvest && !b.harvest.isReady && !b.isWatered;
    const isReadyToHarvest = (b: PlantPlace) => !!b.harvest?.isReady;
    const isEmptyForPlanting = (b: PlantPlace) => !b.harvest && !!b.harvestType;

    if (hasWater) {
      const gardenToWater = this.findNearestPlantPlace(resident, needsWater);
      if (gardenToWater) {
        resident.taskContext = {
          targetId: gardenToWater.id,
          resourceType: ResourceType.Water,
          neededAmount: 0,
          currentAmount: 0,
        };
        resident.pathIndex = 0;
        resident.status = VillagerStatus.MovingToWatering;
        resident.path = this.calculatePath(
          resident.position,
          this.getExitPos(gardenToWater),
        );
        return;
      }
    }

    if (
      resident.inventory.totalAmount >=
      getMaxInventoryCapacity(ProfessionType.Farmer, resident.profession.level)
    ) {
      const granary = this.findNearestGranary(resident);
      if (granary) {
        resident.pathIndex = 0;
        resident.path = this.calculatePath(resident.position, {
          x: granary.position.x,
          y: granary.position.y - 1,
        });
        resident.taskContext = {
          targetId: granary.id,
          resourceType: granary.resourceType!,
          neededAmount: 0,
          currentAmount: 0,
        };
        resident.status = VillagerStatus.MovingToStorage;
      }
      return;
    }

    const gardenForWatering = !hasWater
      ? this.findNearestPlantPlace(resident, needsWater)
      : undefined;
    if (!hasWater && gardenForWatering) {
      const needWaterAmount =
        gardenForWatering.length *
        gardenForWatering.width *
        PLANT_CONFIG[gardenForWatering.harvest?.type ?? ResourceType.Wheat]
          .neededWater;

      const waterSource = this.findNearestWaterSource(resident);
      if (waterSource) {
        resident.taskContext = {
          targetId: waterSource.id,
          resourceType:
            waterSource.type === "well"
              ? ResourceType.WellWater
              : ResourceType.Water,
          neededAmount: needWaterAmount,
          currentAmount: 0,
        };
        resident.pathIndex = 0;
        resident.status = VillagerStatus.MovingToWater;
        resident.path = this.calculatePath(
          resident.position,
          waterSource.position,
        );
        return;
      }
    }

    const gardenForHarvesting = this.findNearestPlantPlace(
      resident,
      isReadyToHarvest,
    );
    if (gardenForHarvesting) {
      resident.taskContext = {
        targetId: gardenForHarvesting.id,
        resourceType: gardenForHarvesting.harvest!.type,
        neededAmount: 0,
        currentAmount: 0,
      };
      resident.pathIndex = 0;
      resident.status = VillagerStatus.MovingToHarvest;
      resident.path = this.calculatePath(
        resident.position,
        this.getExitPos(gardenForHarvesting),
      );
      return;
    }
    const gardenForPlanting = this.findNearestPlantPlace(
      resident,
      isEmptyForPlanting,
    );
    if (gardenForPlanting) {
      resident.taskContext = {
        targetId: gardenForPlanting.id,
        resourceType: gardenForPlanting.harvestType!,
        neededAmount: 0,
        currentAmount: 0,
      };
      resident.pathIndex = 0;
      resident.status = VillagerStatus.MovingToPlant;
      resident.path = this.calculatePath(
        resident.position,
        this.getExitPos(gardenForPlanting),
      );
    }
  }
  private getExitPos(build: Buildings): Position {
    return { x: build.position.x, y: build.position.y - 1 };
  }
  private getPlantPlaces(resident: Resident): PlantPlace[] {
    const prof = resident.profession;
    const ids =
      prof.type === ProfessionType.Farmer ? prof.assignedGardenIds : undefined;
    if (ids && ids.length > 0) {
      return ids
        .map((id: string) => this.buildings[id])
        .filter(
          (b): b is PlantPlace =>
            !!b &&
            (b.type === BuildingType.Garden ||
              b.type === BuildingType.Greenhouse),
        );
    }
    return Object.values(this.buildings).filter(
      (b): b is PlantPlace =>
        b.type === BuildingType.Garden || b.type === BuildingType.Greenhouse,
    );
  }

  private findNearestPlantPlace(
    resident: Resident,
    filter: (b: PlantPlace) => boolean,
  ): PlantPlace | undefined {
    return this.closestByDistance(
      resident.position,
      this.getPlantPlaces(resident).filter(filter),
    );
  }

  private closestByDistance<T extends { position: Position }>(
    from: Position,
    candidates: T[],
  ): T | undefined {
    let best: T | undefined;
    let bestDist = Infinity;
    for (const c of candidates) {
      const d = this.getEvcDist(from, c.position);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best;
  }

  private findNearestGranary(resident: Resident): Granary | null {
    let minDist = Infinity;
    let nearestGranary: Granary | null = null;

    for (const build of Object.values(this.buildings)) {
      if (build.type !== BuildingType.Granary) continue;

      const granary = build as Granary;
      if (!granary.resourceType) continue;

      const availableAmount =
        resident.inventory.resources[granary.resourceType] ?? 0;
      if (availableAmount === 0) continue;

      const freeSpace = granary.storage.maxCapacity - granary.storage.amount;
      if (freeSpace < availableAmount) continue;

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

  private findNearestWaterSource(resident: Resident): {
    id: string;
    position: Position;
    type: "well" | "water";
  } | null {
    let minDist = Infinity;
    let nearestSource: {
      id: string;
      position: Position;
      type: "well" | "water";
    } | null = null;

    for (const build of Object.values(this.buildings)) {
      if (build.type === BuildingType.Well) {
        const well = build as Well;
        if (well.currentAmount > 0) {
          const dist = this.getEvcDist(resident.position, {
            x: build.position.x,
            y: build.position.y - 1,
          });
          if (dist < minDist) {
            minDist = dist;
            nearestSource = {
              id: build.id,
              position: { x: build.position.x, y: build.position.y - 1 },
              type: "well",
            };
          }
        }
      }
    }

    for (let y = -20; y < 20; y++) {
      for (let x = -20; x < 20; x++) {
        const posX = resident.position.x + x;
        const posY = resident.position.y + y;
        if (
          posX >= 0 &&
          posX < this.width &&
          posY >= 0 &&
          posY < this.height &&
          this.grid[posY][posX] === TERRAIN_WEIGHTS.WATER &&
          this.isPositionWalkable(posX - 1, posY)
        ) {
          const dist = this.getEvcDist(resident.position, { x: posX, y: posY });
          if (dist < minDist) {
            minDist = dist;
            nearestSource = {
              id: `water-${posX}-${posY}`,
              position: { x: posX - 1, y: posY },
              type: "water",
            };
          }
        }
      }
    }
    return nearestSource;
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

    const granary = this.buildings[
      resident.taskContext?.targetId ?? ""
    ] as Granary;
    if (!granary) {
      return false;
    }

    if (!granary.resourceType) {
      return false;
    }

    const availableAmount =
      resident.inventory.resources[granary.resourceType] ?? 0;
    if (availableAmount === 0) {
      resident.taskContext = null;
      return false;
    }

    const freeSpace = granary.storage.maxCapacity - granary.storage.amount;
    if (freeSpace < availableAmount) {
      resident.taskContext = null;
      return false;
    }

    if (resident.workProgress < FARMER_TASK_DURATION.UNLOADING) {
      resident.workProgress += getSpeedWork(
        ProfessionType.Farmer,
        resident.profession.level,
      );
      return false;
    }

    granary.storage.amount += availableAmount;

    delete resident.inventory.resources[granary.resourceType];
    resident.inventory.totalAmount = Object.values(
      resident.inventory.resources,
    ).reduce((sum, amount) => sum + amount, 0);

    resident.workProgress = 0;
    resident.taskContext = null;
    this.addExperience(resident, XP_REWARDS[ProfessionType.Farmer].UNLOADING);

    return true;
  }

  private harvesting(resident: Resident): boolean {
    if (resident.profession.type !== ProfessionType.Farmer) {
      return false;
    }
    const garden = this.buildings[
      resident.taskContext?.targetId ?? ""
    ] as PlantPlace;
    if (!garden) {
      return false;
    }

    const gardenSize = (garden.width || 1) * (garden.length || 1);
    const harvestDuration = FARMER_TASK_DURATION.HARVESTING * gardenSize;

    if (resident.workProgress < harvestDuration) {
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

    const amount = calculateHarvestAmount(garden.harvest, garden) * gardenSize;
    this.addItemToInventory(resident, garden.harvest.type, amount);
    resident.workProgress = 0;
    resident.taskContext = null;
    this.addExperience(resident, XP_REWARDS[ProfessionType.Farmer].HARVEST);
    const targetGarden = this.buildings[garden.id] as PlantPlace;
    targetGarden.harvest = null;
    targetGarden.moisture = 0;
    targetGarden.isWatered = false;
    return true;
  }

  private planting(resident: Resident): boolean {
    if (resident.profession.type !== ProfessionType.Farmer) {
      return false;
    }
    const garden = this.buildings[
      resident.taskContext?.targetId ?? ""
    ] as PlantPlace;
    if (!garden) {
      return false;
    }

    if (!garden.harvestType) {
      resident.taskContext = null;
      return false;
    }

    const gardenSize = (garden.width || 1) * (garden.length || 1);
    const plantDuration = FARMER_TASK_DURATION.PLANTING * gardenSize;

    if (resident.workProgress < plantDuration) {
      resident.workProgress += getSpeedWork(
        ProfessionType.Farmer,
        resident.profession.level,
      );
      return false;
    }
    garden.harvest = {
      type: garden.harvestType,
      growthProgress: 0,
      isReady: false,
    };
    garden.growthCoefficient = 1;
    garden.moisture = 5;
    garden.isWatered = true;
    garden.health = 100;

    resident.workProgress = 0;
    resident.taskContext = null;
    this.addExperience(resident, XP_REWARDS[ProfessionType.Farmer].PLANTING);

    return true;
  }

  private collectWater(resident: Resident): boolean {
    if (resident.profession.type !== ProfessionType.Farmer) {
      return false;
    }
    const tc = resident.taskContext;
    if (!tc) return false;

    const isWell = tc.targetId
      ? this.buildings[tc.targetId]?.type === BuildingType.Well
      : false;
    if (resident.workProgress < FARMER_TASK_DURATION.SET_WATER) {
      resident.workProgress += getSpeedWork(
        ProfessionType.Farmer,
        resident.profession.level,
      );
      const typeWater = isWell ? ResourceType.WellWater : ResourceType.Water;
      const stepAmount = Math.round(
        (resident.taskContext!.neededAmount +
          resident.taskContext!.currentAmount) /
          FARMER_TASK_DURATION.SET_WATER,
      );
      const remainingNeeded = tc.neededAmount - tc.currentAmount;
      const taken = Math.min(stepAmount, remainingNeeded);

      const well = isWell ? (this.buildings[tc.targetId] as Well) : null;
      let canGetWater = true;

      if (well?.type === BuildingType.Well && well.currentAmount < taken) {
        canGetWater = false;
      }
      if (canGetWater && taken > 0) {
        resident.inventory.resources[typeWater] =
          taken + (resident.inventory.resources[typeWater] ?? 0);
        tc.currentAmount += taken;

        if (well) {
          well.currentAmount -= taken;
        }
      }
      console.log(resident.inventory.resources[typeWater]);
      return false;
    }

    resident.workProgress = 0;
    resident.taskContext = null;
    return true;
  }

  private wateringPlant(resident: Resident): boolean {
    if (resident.profession.type !== ProfessionType.Farmer) {
      return false;
    }
    const garden = this.buildings[
      resident.taskContext?.targetId ?? ""
    ] as PlantPlace;
    if (!garden || !garden.harvest || garden.harvest.isReady) {
      return false;
    }

    const gardenSize = (garden.width || 1) * (garden.length || 1);
    const waterDuration = FARMER_TASK_DURATION.SET_WATER * gardenSize;

    if (resident.workProgress < waterDuration) {
      resident.workProgress += getSpeedWork(
        ProfessionType.Farmer,
        resident.profession.level,
      );
      garden.moisture = Math.min(
        100,
        100 *
          (resident.workProgress /
            (FARMER_TASK_DURATION.SET_WATER * gardenSize)),
      );

      return false;
    }

    const wellWaterAmt =
      resident.inventory.resources[ResourceType.WellWater] ?? 0;
    const hasWellWater = wellWaterAmt > 0;

    if (hasWellWater) {
      garden.growthCoefficient *= PLANT_EFFECTS.WELL_WATER_EFFECT;
      delete resident.inventory.resources[ResourceType.WellWater];
    } else {
      delete resident.inventory.resources[ResourceType.Water];
    }
    resident.inventory.totalAmount = Object.values(
      resident.inventory.resources,
    ).reduce((sum, amount) => sum + amount, 0);

    resident.workProgress = 0;
    resident.taskContext = null;
    this.addExperience(resident, XP_REWARDS[ProfessionType.Farmer].WATERING);

    return true;
  }
  private addExperience(resident: Resident, amount: number): void {
    const prof = resident.profession;
    if (prof.type === ProfessionType.Jobless) return;
    const settings = PROFESSION_SETTINGS[prof.type];
    if (!settings || prof.level >= settings.maxLevel) return;

    prof.xp += amount;
    while (prof.level < settings.maxLevel) {
      const xpNeeded = getXpForNextLevel(prof.type, prof.level);
      if (prof.xp >= xpNeeded) {
        prof.xp -= xpNeeded;
        prof.level += 1;
        console.log(`${resident.name} повысил уровень до ${prof.level}!`);
      } else {
        break;
      }
    }
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
  private processMill(mill: Mill) {
    const currentWheat = mill.storage[ResourceType.Wheat] ?? 0;
    const currentFlour = mill.storage[ResourceType.Flour] ?? 0;

    if (
      currentWheat < mill.recipe.importCount ||
      currentFlour + mill.recipe.exportCount > mill.maxCapacity
    ) {
      mill.progress = 0;
      return;
    }

    mill.progress += 1 / mill.recipe.durationPerTick;

    if (mill.progress >= 1) {
      mill.storage[ResourceType.Wheat] = currentWheat - mill.recipe.importCount;
      if (mill.storage[ResourceType.Wheat]! <= 0) {
        delete mill.storage[ResourceType.Wheat];
      }
      mill.storage[ResourceType.Flour] = currentFlour + mill.recipe.exportCount;
      
      mill.capacity =
        (mill.storage[ResourceType.Wheat] ?? 0) +
        (mill.storage[ResourceType.Flour] ?? 0);
      
      mill.progress = 0;
    }
  }

  private processBakery(bakery: Bakery) {
    const currentFlour = bakery.storage[ResourceType.Flour] ?? 0;
    const currentBread = bakery.storage[ResourceType.Bread] ?? 0;

    if (
      currentFlour < bakery.recipe.importCount ||
      currentBread + bakery.recipe.exportCount > bakery.maxCapacity
    ) {
      bakery.progress = 0;
      return;
    }

    bakery.progress += 1 / bakery.recipe.durationPerTick;

    if (bakery.progress >= 1) {
      bakery.storage[ResourceType.Flour] = currentFlour - bakery.recipe.importCount;
      if (bakery.storage[ResourceType.Flour]! <= 0) {
        delete bakery.storage[ResourceType.Flour];
      }
      bakery.storage[ResourceType.Bread] = currentBread + bakery.recipe.exportCount;
      
      bakery.capacity =
        (bakery.storage[ResourceType.Flour] ?? 0) +
        (bakery.storage[ResourceType.Bread] ?? 0);
      
      bakery.progress = 0;
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
  private findBestExportSource(resident: Resident): {
    source: Buildings;
    resourceType: ResourceType;
    takeAmount: number;
  } | null {
    let bestSource: Buildings | null = null;
    let bestResourceType: ResourceType | null = null;
    let bestScore = -Infinity;
    let bestAmount = 0;

    for (const build of Object.values(this.buildings)) {
      const exportArr = (build as any).export;
      if (!Array.isArray(exportArr) || exportArr.length === 0) continue;

      const availableResources: {
        type: ResourceType;
        amount: number;
        max: number;
      }[] = [];

      if (build.type === BuildingType.Granary) {
        const g = build as Granary;
        if (g.resourceType && g.storage.amount > 0) {
          availableResources.push({
            type: g.resourceType,
            amount: g.storage.amount,
            max: g.storage.maxCapacity,
          });
        }
      } else if (build.type === BuildingType.Mill) {
        const m = build as Mill;
        const exportKey = m.recipe.export;
        const amount = m.storage[exportKey] ?? 0;
        if (amount > 0) {
          availableResources.push({
            type: exportKey,
            amount: amount,
            max: m.maxCapacity,
          });
        }
      } else if (build.type === BuildingType.Bakery) {
        const b = build as Bakery;
        const exportKey = b.recipe.export;
        const amount = b.storage[exportKey] ?? 0;
        if (amount > 0) {
          availableResources.push({
            type: exportKey,
            amount: amount,
            max: b.maxCapacity,
          });
        }
      }

      for (const res of availableResources) {
        const hasValidDest = this.findBestExportDestination(
          exportArr,
          res.type,
          build.position,
        );
        if (!hasValidDest) continue;

        const dist = this.getEvcDist(resident.position, build.position);

        const fullness = res.amount / res.max;
        const score = fullness / (dist + 1);

        if (score > bestScore) {
          bestScore = score;
          bestSource = build;
          bestResourceType = res.type;
          bestAmount = res.amount;
        }
      }
    }

    if (!bestSource || !bestResourceType) return null;

    const transporterLevel = (resident.profession as Transporter).level;
    const maxCarry = getMaxInventoryCapacity(
      ProfessionType.Transporter,
      transporterLevel,
    );
    const freeInv = maxCarry - resident.inventory.totalAmount;
    const takeAmount = Math.min(bestAmount, freeInv);

    if (takeAmount <= 0) return null;

    bestSource.incoming[bestResourceType] =
      (bestSource.incoming[bestResourceType] ?? 0) + 1;

    return {
      source: bestSource,
      resourceType: bestResourceType,
      takeAmount,
    };
  }

  private getDestinationNeed(
    dest: Buildings,
    resourceType: ResourceType,
  ): number {
    if (dest.type === BuildingType.Mill) {
      const m = dest as Mill;
      if (m.recipe.import !== resourceType) return 0;
      return m.maxCapacity - m.capacity;
    }
    if (dest.type === BuildingType.Bakery) {
      const b = dest as Bakery;
      if (b.recipe.import !== resourceType) return 0;
      return b.maxCapacity - b.capacity;
    }
    if (dest.type === BuildingType.Granary) {
      const g = dest as Granary;
      if (!g.resourceType || g.resourceType !== resourceType) return 0;
      return g.storage.maxCapacity - g.storage.amount;
    }
    return 0;
  }

  private findBestExportDestination(
    exportArr: string[],
    resourceType: ResourceType,
    pos: Position,
  ): Buildings | null {
    let bestDest: Buildings | null = null;
    let bestScore = -Infinity;

    for (const destId of exportArr) {
      const dest = this.buildings[destId];
      if (!dest) continue;
      if ((dest.incoming[resourceType] ?? 0) > 0) continue;

      const need = this.getDestinationNeed(dest, resourceType);
      if (need <= 0) continue;

      let maxCapacity = 100;
      if (dest.type === BuildingType.Mill)
        maxCapacity = (dest as Mill).maxCapacity;
      if (dest.type === BuildingType.Bakery)
        maxCapacity = (dest as Bakery).maxCapacity;
      if (dest.type === BuildingType.Granary)
        maxCapacity = (dest as Granary).storage.maxCapacity;

      const dist = this.getEvcDist(pos, dest.position);

      const deficitRatio = need / maxCapacity;
      const score = Math.pow(deficitRatio, 2) / (dist + 1);

      if (score > bestScore) {
        bestScore = score;
        bestDest = dest;
      }
    }

    return bestDest;
  }

  private routeRemainder(resident: Resident, tc: TaskContext): void {
    if (tc.sourceId) {
      const source = this.buildings[tc.sourceId];
      if (source && Array.isArray((source as any).export)) {
        const next = this.findBestExportDestination(
          (source as any).export,
          tc.resourceType,
          resident.position,
        );
        if (next) {
          next.incoming[tc.resourceType] =
            (next.incoming[tc.resourceType] ?? 0) + 1;
          tc.targetId = next.id;
          return;
        }
      }
      if (source) {
        let canAccept = false;
        if (source.type === BuildingType.Granary) {
          canAccept =
            (source as Granary).storage.amount <
            (source as Granary).storage.maxCapacity;
        } else if (source.type === BuildingType.Mill) {
          canAccept = (source as Mill).capacity < (source as Mill).maxCapacity;
        } else if (source.type === BuildingType.Bakery) {
          canAccept =
            (source as Bakery).capacity < (source as Bakery).maxCapacity;
        }
        if (canAccept) {
          tc.targetId = tc.sourceId;
          return;
        }
      }
    }
    tc.targetId = "";
  }

  private updateTransporter(resident: Resident): void {
    if (resident.profession.type !== ProfessionType.Transporter) return;

    const tc = resident.taskContext;

    if (resident.inventory.totalAmount > 0) {
      if (tc?.targetId && this.buildings[tc.targetId]) {
        const dest = this.buildings[tc.targetId];
        resident.path = this.calculatePath(
          resident.position,
          this.getExitPos(dest),
        );
        resident.pathIndex = 0;
        resident.status = VillagerStatus.MovingToExportTarget;
        return;
      }

      const carriedType = (
        Object.keys(resident.inventory.resources) as ResourceType[]
      ).find((k) => (resident.inventory.resources[k] ?? 0) > 0);
      if (!carriedType) return;

      if (tc?.sourceId) {
        const source = this.buildings[tc.sourceId];
        if (source && Array.isArray((source as any).export)) {
          const dest = this.findBestExportDestination(
            (source as any).export,
            carriedType,
            resident.position,
          );
          if (dest) {
            dest.incoming[carriedType] = (dest.incoming[carriedType] ?? 0) + 1;
            tc.targetId = dest.id;
            resident.path = this.calculatePath(
              resident.position,
              this.getExitPos(dest),
            );
            resident.pathIndex = 0;
            resident.status = VillagerStatus.MovingToExportTarget;
            return;
          }

          let canAccept = false;
          if (source.type === BuildingType.Granary) {
            canAccept =
              (source as Granary).storage.amount <
              (source as Granary).storage.maxCapacity;
          } else if (source.type === BuildingType.Mill) {
            canAccept =
              (source as Mill).capacity < (source as Mill).maxCapacity;
          }
          if (canAccept) {
            tc.targetId = tc.sourceId;
            resident.path = this.calculatePath(
              resident.position,
              this.getExitPos(source),
            );
            resident.pathIndex = 0;
            resident.status = VillagerStatus.MovingToExportTarget;
            return;
          }
        }
      }

      if (tc) tc.targetId = "";
      return;
    }

    const result = this.findBestExportSource(resident);
    if (!result) return;

    resident.taskContext = {
      targetId: result.source.id,
      sourceId: result.source.id,
      resourceType: result.resourceType,
      neededAmount: result.takeAmount,
      currentAmount: 0,
    };
    resident.path = this.calculatePath(
      resident.position,
      this.getExitPos(result.source),
    );
    resident.pathIndex = 0;
    resident.status = VillagerStatus.MovingToExportSource;
  }

  private loadingExport(resident: Resident): boolean {
    if (resident.profession.type !== ProfessionType.Transporter) return false;

    const tc = resident.taskContext;
    if (!tc) return false;

    const source = this.buildings[tc.targetId];
    if (!source) {
      resident.taskContext = null;
      return true;
    }

    let availableAmount = 0;
    if (source.type === BuildingType.Granary) {
      const g = source as Granary;
      if (!g.resourceType || g.storage.amount <= 0) return false;
      availableAmount = g.storage.amount;
    } else if (source.type === BuildingType.Mill) {
      const m = source as Mill;
      const millKey = tc.resourceType as
        | ResourceType.Flour
        | ResourceType.Bread;
      availableAmount = m.storage[millKey] ?? 0;
      if (availableAmount <= 0) return false;
    } else if (source.type === BuildingType.Bakery) {
      const b = source as Bakery;
      availableAmount = b.storage[ResourceType.Bread] ?? 0;
      if (availableAmount <= 0) return false;
    } else {
      return false;
    }

    const transporterLevel = (resident.profession as Transporter).level;
    const maxCarry = getMaxInventoryCapacity(
      ProfessionType.Transporter,
      transporterLevel,
    );
    const freeInv = maxCarry - resident.inventory.totalAmount;
    const toTake = Math.min(availableAmount, tc.neededAmount, freeInv);
    if (toTake <= 0) return false;

    if (resident.workProgress < TRANSPORTER_TASK_DURATION.LOADING) {
      resident.workProgress += getSpeedWork(
        ProfessionType.Transporter,
        transporterLevel,
      );
      return false;
    }

    if (source.type === BuildingType.Granary) {
      (source as Granary).storage.amount -= toTake;
    } else if (source.type === BuildingType.Mill) {
      const m = source as Mill;
      const millKey = tc.resourceType as
        | ResourceType.Flour
        | ResourceType.Bread;
      m.storage[millKey] = (m.storage[millKey] ?? 0) - toTake;
      if (m.storage[millKey]! <= 0) delete m.storage[millKey];
      m.capacity -= toTake;
    } else if (source.type === BuildingType.Bakery) {
      const b = source as Bakery;
      b.storage[ResourceType.Bread] =
        (b.storage[ResourceType.Bread] ?? 0) - toTake;
      if (b.storage[ResourceType.Bread]! <= 0)
        delete b.storage[ResourceType.Bread];
      b.capacity -= toTake;
    }

    resident.inventory.resources[tc.resourceType] =
      (resident.inventory.resources[tc.resourceType] ?? 0) + toTake;
    resident.inventory.totalAmount += toTake;

    const exportArr = (source as any).export as string[];
    const dest = this.findBestExportDestination(
      exportArr,
      tc.resourceType,
      resident.position,
    );

    if (!dest) {
      if (source.type === BuildingType.Granary) {
        (source as Granary).storage.amount += toTake;
      } else if (source.type === BuildingType.Mill) {
        const m = source as Mill;
        const millKey = tc.resourceType as
          | ResourceType.Flour
          | ResourceType.Bread;
        m.storage[millKey] = (m.storage[millKey] ?? 0) + toTake;
        m.capacity += toTake;
      } else if (source.type === BuildingType.Bakery) {
        const b = source as Bakery;
        b.storage[ResourceType.Bread] =
          (b.storage[ResourceType.Bread] ?? 0) + toTake;
        b.capacity += toTake;
      }
      delete resident.inventory.resources[tc.resourceType];
      resident.inventory.totalAmount = Math.max(
        0,
        resident.inventory.totalAmount - toTake,
      );
      resident.workProgress = 0;
      resident.taskContext = null;
      return true;
    }

    this.addExperience(
      resident,
      XP_REWARDS[ProfessionType.Transporter].LOADING,
    );

    dest.incoming[tc.resourceType] = (dest.incoming[tc.resourceType] ?? 0) + 1;
    tc.targetId = dest.id;
    tc.neededAmount = toTake;
    tc.currentAmount = 0;
    resident.workProgress = 0;
    return true;
  }

  private unloadingExport(resident: Resident): boolean {
    if (resident.profession.type !== ProfessionType.Transporter) return false;

    const tc = resident.taskContext;
    if (!tc) return false;

    const dest = this.buildings[tc.targetId];
    if (!dest) {
      resident.taskContext = null;
      return true;
    }

    const availableAmount = resident.inventory.resources[tc.resourceType] ?? 0;
    if (availableAmount <= 0) {
      resident.taskContext = null;
      return true;
    }

    let freeSpace = 0;

    if (dest.id === tc.sourceId) {
      if (dest.type === BuildingType.Granary) {
        freeSpace =
          (dest as Granary).storage.maxCapacity -
          (dest as Granary).storage.amount;
      } else if (dest.type === BuildingType.Mill) {
        freeSpace = (dest as Mill).maxCapacity - (dest as Mill).capacity;
      } else if (dest.type === BuildingType.Bakery) {
        freeSpace = (dest as Bakery).maxCapacity - (dest as Bakery).capacity;
      } else {
        resident.taskContext = null;
        return true;
      }
    } else {
      if (dest.type === BuildingType.Mill) {
        const m = dest as Mill;
        if (m.recipe.import !== tc.resourceType) {
          resident.taskContext = null;
          return true;
        }
        freeSpace = m.maxCapacity - m.capacity;
      } else if (dest.type === BuildingType.Bakery) {
        const b = dest as Bakery;
        if (b.recipe.import !== tc.resourceType) {
          resident.taskContext = null;
          return true;
        }
        freeSpace = b.maxCapacity - b.capacity;
      } else if (dest.type === BuildingType.Granary) {
        const g = dest as Granary;
        if (g.resourceType && g.resourceType !== tc.resourceType) {
          resident.taskContext = null;
          return true;
        }
        freeSpace = g.storage.maxCapacity - g.storage.amount;
      } else {
        resident.taskContext = null;
        return true;
      }
    }

    const toUnload = Math.min(availableAmount, freeSpace);
    if (toUnload <= 0) {
      if (
        dest.id !== tc.sourceId &&
        (dest.incoming[tc.resourceType] ?? 0) > 0
      ) {
        dest.incoming[tc.resourceType]! -= 1;
      }
      this.routeRemainder(resident, tc);
      return true;
    }

    const transporterLevel = (resident.profession as Transporter).level;
    if (resident.workProgress < TRANSPORTER_TASK_DURATION.UNLOADING) {
      resident.workProgress += getSpeedWork(
        ProfessionType.Transporter,
        transporterLevel,
      );
      return false;
    }

    if (dest.type === BuildingType.Granary) {
      (dest as Granary).storage.amount += toUnload;
    } else if (dest.type === BuildingType.Mill) {
      const m = dest as Mill;
      const millKey = tc.resourceType as
        | ResourceType.Wheat
        | ResourceType.Flour
        | ResourceType.Bread;
      m.storage[millKey] = (m.storage[millKey] ?? 0) + toUnload;
      m.capacity += toUnload;
    } else if (dest.type === BuildingType.Bakery) {
      const b = dest as Bakery;
      const bakeryKey = tc.resourceType as
        | ResourceType.Flour
        | ResourceType.Bread;
      b.storage[bakeryKey] = (b.storage[bakeryKey] ?? 0) + toUnload;
      b.capacity += toUnload;
    }

    resident.inventory.resources[tc.resourceType]! -= toUnload;
    resident.inventory.totalAmount -= toUnload;
    if (resident.inventory.resources[tc.resourceType]! <= 0) {
      delete resident.inventory.resources[tc.resourceType];
    }
    if (dest.id !== tc.sourceId && (dest.incoming[tc.resourceType] ?? 0) > 0) {
      dest.incoming[tc.resourceType]! -= 1;
    }
    if ((resident.inventory.resources[tc.resourceType] ?? 0) > 0) {
      this.routeRemainder(resident, tc);
      if (tc.targetId) {
        const nextDest = this.buildings[tc.targetId];
        resident.path = this.calculatePath(
          resident.position,
          this.getExitPos(nextDest),
        );
        resident.pathIndex = 0;
        resident.status = VillagerStatus.MovingToExportTarget;
        resident.workProgress = 0;
        return true;
      }
      resident.taskContext = null;
    } else {
      this.addExperience(
        resident,
        XP_REWARDS[ProfessionType.Transporter].UNLOADING,
      );
      resident.taskContext = null;
    }

    resident.workProgress = 0;
    return true;
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
          if (resident.status === VillagerStatus.MovingToPlant) {
            resident.status = VillagerStatus.Planting;
            return;
          }
          if (resident.status === VillagerStatus.MovingToWater) {
            resident.status = VillagerStatus.CollectingWater;
            return;
          }
          if (resident.status === VillagerStatus.MovingToWatering) {
            resident.status = VillagerStatus.Watering;
            return;
          }
          if (resident.status === VillagerStatus.MovingToExportSource) {
            const tc = resident.taskContext;
            if (tc) {
              const src = this.buildings[tc.sourceId ?? ""];
              if (src) {
                src.incoming[tc.resourceType] =
                  (src.incoming[tc.resourceType] ?? 1) - 1;
              }
            }
            resident.status = VillagerStatus.LoadingExport;
            return;
          }
          if (resident.status === VillagerStatus.MovingToExportTarget) {
            resident.status = VillagerStatus.UnloadingExport;
            return;
          }
          resident.status = VillagerStatus.Idle;
        }
      } else {
        resident.path = [];
        resident.status = VillagerStatus.Idle;
      }
    }
    /// потом создать функцию, где это будет все проверяться
    if (resident.status === VillagerStatus.Unloading) {
      if (this.unloadToGranary(resident)) {
        resident.status = VillagerStatus.Idle;
      }
    }
    if (resident.status === VillagerStatus.Harvesting) {
      if (this.harvesting(resident)) {
        resident.status = VillagerStatus.Idle;
      }
    }
    if (resident.status === VillagerStatus.Planting) {
      if (this.planting(resident)) {
        resident.status = VillagerStatus.Idle;
      }
    }
    if (resident.status === VillagerStatus.CollectingWater) {
      if (this.collectWater(resident)) {
        resident.status = VillagerStatus.Idle;
      }
    }
    if (resident.status === VillagerStatus.Watering) {
      if (this.wateringPlant(resident)) {
        resident.status = VillagerStatus.Idle;
      }
    }

    if (resident.status === VillagerStatus.LoadingExport) {
      if (this.loadingExport(resident)) {
        resident.status = VillagerStatus.Idle;
      }
    }
    if (resident.status === VillagerStatus.UnloadingExport) {
      if (this.unloadingExport(resident)) {
        if (resident.status === VillagerStatus.UnloadingExport) {
          resident.status = VillagerStatus.Idle;
        }
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
        resident.pathIndex = 0;
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
      resident.profession.type === ProfessionType.Transporter
    ) {
      this.updateTransporter(resident);
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
