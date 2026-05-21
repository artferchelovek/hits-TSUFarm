import {
  type Birth,
  type Buildings,
  BuildingType,
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
  VillagerStatus,
  Weather,
} from "../Types.ts";
import {
  REPRODUCTION,
  VILLAGER_CONFIG,
} from "../Constants.ts";
import { GridService } from "./GridService.ts";
import { FarmerService } from "./FarmerService.ts";
import { TransportService } from "./TransportService.ts";
import { BuildingProcessor } from "./BuildingProcessor.ts";
import {
  getEvcDist,
  WANDER_CHANCE,
  WANDER_RADIUS,
  WANDER_ATTEMPTS,
} from "./utils.ts";

class CitizenWorker {
  private residents: Record<string, Resident> = {};
  private buildings: Record<string, Buildings> = {};

  private gridService = new GridService();
  private farmerService = new FarmerService(this.gridService);
  private transportService = new TransportService(this.gridService);
  private buildingProcessor = new BuildingProcessor();

  init(
    tiles: Uint8Array,
    buildings: Record<string, Buildings>,
    width: number,
    height: number,
  ) {
    this.buildings = buildings;
    this.gridService.init(tiles, width, height, buildings);
  }

  constructor() {}

  public isPositionWalkable(x: number, y: number): boolean {
    return this.gridService.isPositionWalkable(x, y);
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
    return this.gridService.getGrid();
  }

  public calculatePath(start: Position, end: Position): Position[] {
    return this.gridService.calculatePath(start, end);
  }

  public serialize(): Uint8Array {
    return this.gridService.serialize();
  }

  public updateBuilding(building: Buildings): void {
    this.buildings[building.id] = building;
    this.gridService.updateObstacle(
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
    this.gridService.updateObstacle(x, y, w, l, type);
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
      this.buildingProcessor.processPlantGrowth(
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
      this.buildingProcessor.processMill(mill);
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

    const deathChance =
      (resident.age / 1000) * VILLAGER_CONFIG.baseDeathChance;
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

  private birthEvents(
    parentFirst: Resident,
    parentSecond: Resident,
  ): boolean {
    if (parentFirst.homeId !== parentSecond.homeId) return false;
    if (parentFirst.gender === parentSecond.gender) return false;

    const home = this.buildings[parentFirst.homeId ?? ""] as House;
    if (home && home.residentsId.length >= home.capacity) return false;

    const chance =
      this.getBirthChance(parentFirst.age) *
      this.getBirthChance(parentSecond.age);
    return Math.random() < chance;
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

  private updateMovement(resident: Resident, isNight: boolean): void {
    if (
      moveStatuses.includes(resident.status) &&
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
            const tc = resident.taskContext;
            if (tc) {
              const dest = this.buildings[tc.targetId];
              if (dest && dest.id !== tc.sourceId) {
                dest.incoming[tc.resourceType] =
                  (dest.incoming[tc.resourceType] ?? 1) - 1;
              }
            }
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

    if (resident.status === VillagerStatus.Unloading) {
      if (this.farmerService.unloadToGranary(resident, this.buildings)) {
        resident.status = VillagerStatus.Idle;
      }
    }
    if (resident.status === VillagerStatus.Harvesting) {
      if (this.farmerService.harvesting(resident, this.buildings)) {
        resident.status = VillagerStatus.Idle;
      }
    }
    if (resident.status === VillagerStatus.Planting) {
      if (this.farmerService.planting(resident, this.buildings)) {
        resident.status = VillagerStatus.Idle;
      }
    }
    if (resident.status === VillagerStatus.CollectingWater) {
      if (this.farmerService.collectWater(resident, this.buildings)) {
        resident.status = VillagerStatus.Idle;
      }
    }
    if (resident.status === VillagerStatus.Watering) {
      if (this.farmerService.wateringPlant(resident, this.buildings)) {
        resident.status = VillagerStatus.Idle;
      }
    }

    if (resident.status === VillagerStatus.LoadingExport) {
      if (this.transportService.loadingExport(resident, this.buildings)) {
        resident.status = VillagerStatus.Idle;
      }
    }
    if (resident.status === VillagerStatus.UnloadingExport) {
      if (this.transportService.unloadingExport(resident, this.buildings)) {
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

        if (
          resident.position.x === entryX &&
          resident.position.y === entryY
        ) {
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
      this.farmerService.update(resident, this.buildings);
    }
    if (
      resident.status === VillagerStatus.Idle &&
      resident.profession.type === ProfessionType.Transporter
    ) {
      this.transportService.updateTransporter(resident, this.buildings);
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
