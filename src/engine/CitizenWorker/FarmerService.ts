import {
  BuildingType,
  type Buildings,
  type Granary,
  type Greenhouse,
  type PlantPlace,
  type Position,
  ProfessionType,
  type Resident,
  ResourceType,
  VillagerStatus,
  type Well,
} from "../Types.ts";
import {
  BUILDING_CONFIG,
  FARMER_TASK_DURATION,
  getMaxInventoryCapacity,
  getSpeedWork,
  PLANT_CONFIG,
  PLANT_EFFECTS,
  XP_REWARDS,
} from "../Constants.ts";
import {
  addExperience,
  addItemToInventory,
  closestByDistance,
  getEvcDist,
  getExitPos,
  TERRAIN_WEIGHTS,
} from "./utils.ts";
import { GridService } from "./GridService.ts";

export class FarmerService {
  constructor(private grid: GridService) {}

  update(resident: Resident, buildings: Record<string, Buildings>): void {
    if (resident.profession.type !== ProfessionType.Farmer) return;

    const hasWater =
      (resident.inventory.resources[ResourceType.Water] ?? 0) > 0 ||
      (resident.inventory.resources[ResourceType.WellWater] ?? 0) > 0;

    const needsWater = (b: PlantPlace) =>
      !!b.harvest && !b.harvest.isReady && !b.isWatered;
    const isReadyToHarvest = (b: PlantPlace) => !!b.harvest?.isReady;
    const isEmptyForPlanting = (b: PlantPlace) => !b.harvest && !!b.harvestType;

    if (hasWater) {
      const gardenToWater = this.findNearestPlantPlace(
        resident,
        buildings,
        needsWater,
      );
      if (gardenToWater) {
        resident.taskContext = {
          targetId: gardenToWater.id,
          resourceType: ResourceType.Water,
          neededAmount: 0,
          currentAmount: 0,
        };
        resident.pathIndex = 0;
        resident.status = VillagerStatus.MovingToWatering;
        resident.path = this.grid.calculatePath(
          resident.position,
          getExitPos(gardenToWater),
        );
        return;
      }
    }

    if (
      resident.inventory.totalAmount >=
      getMaxInventoryCapacity(ProfessionType.Farmer, resident.profession.level)
    ) {
      const granary = this.findNearestGranary(resident, buildings);
      if (granary) {
        resident.pathIndex = 0;
        resident.path = this.grid.calculatePath(resident.position, {
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
      ? this.findNearestPlantPlace(resident, buildings, needsWater)
      : undefined;
    if (!hasWater && gardenForWatering) {
      const needWaterAmount =
        gardenForWatering.type === BuildingType.Greenhouse
          ? (gardenForWatering as Greenhouse).waterTank.max -
            (gardenForWatering as Greenhouse).waterTank.current
          : gardenForWatering.length *
            gardenForWatering.width *
            PLANT_CONFIG[gardenForWatering.harvest?.type ?? ResourceType.Wheat]
              .neededWater;

      const waterSource = this.findNearestWaterSource(resident, buildings);
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
        resident.path = this.grid.calculatePath(
          resident.position,
          waterSource.position,
        );
        return;
      }
    }

    const gardenForHarvesting = this.findNearestPlantPlace(
      resident,
      buildings,
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
      resident.path = this.grid.calculatePath(
        resident.position,
        getExitPos(gardenForHarvesting),
      );
      return;
    }
    const gardenForPlanting = this.findNearestPlantPlace(
      resident,
      buildings,
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
      resident.path = this.grid.calculatePath(
        resident.position,
        getExitPos(gardenForPlanting),
      );
    }
  }

  private getPlantPlaces(
    resident: Resident,
    buildings: Record<string, Buildings>,
  ): PlantPlace[] {
    const prof = resident.profession;
    const ids =
      prof.type === ProfessionType.Farmer ? prof.assignedGardenIds : undefined;
    if (ids && ids.length > 0) {
      return ids
        .map((id: string) => buildings[id])
        .filter(
          (b): b is PlantPlace =>
            !!b &&
            (b.type === BuildingType.Garden ||
              b.type === BuildingType.Greenhouse),
        );
    }
    return Object.values(buildings).filter(
      (b): b is PlantPlace =>
        b.type === BuildingType.Garden || b.type === BuildingType.Greenhouse,
    );
  }

  private findNearestPlantPlace(
    resident: Resident,
    buildings: Record<string, Buildings>,
    filter: (b: PlantPlace) => boolean,
  ): PlantPlace | undefined {
    return closestByDistance(
      resident.position,
      this.getPlantPlaces(resident, buildings).filter(filter),
    );
  }

  private findNearestGranary(
    resident: Resident,
    buildings: Record<string, Buildings>,
  ): Granary | null {
    let minDist = Infinity;
    let nearestGranary: Granary | null = null;

    for (const build of Object.values(buildings)) {
      if (build.type !== BuildingType.Granary) continue;

      const granary = build as Granary;
      if (!granary.resourceType) continue;

      const availableAmount =
        resident.inventory.resources[granary.resourceType] ?? 0;
      if (availableAmount === 0) continue;

      const freeSpace = granary.storage.maxCapacity - granary.storage.amount;
      if (freeSpace < availableAmount) continue;

      const dist = getEvcDist(resident.position, {
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

  private findNearestWaterSource(
    resident: Resident,
    buildings: Record<string, Buildings>,
  ): {
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

    for (const build of Object.values(buildings)) {
      if (build.type === BuildingType.Well) {
        const well = build as Well;
        if (well.currentAmount > 0) {
          const dist = getEvcDist(resident.position, {
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
          posX < this.grid.getGrid()[0].length &&
          posY >= 0 &&
          posY < this.grid.getGrid().length &&
          this.grid.getGrid()[posY][posX] === TERRAIN_WEIGHTS.WATER &&
          this.grid.isPositionWalkable(posX - 1, posY)
        ) {
          const dist = getEvcDist(resident.position, { x: posX, y: posY });
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

  unloadToGranary(
    resident: Resident,
    buildings: Record<string, Buildings>,
  ): boolean {
    if (resident.profession.type !== ProfessionType.Farmer) return false;

    const granary = buildings[resident.taskContext?.targetId ?? ""] as Granary;
    if (!granary) return false;

    if (!granary.resourceType) return false;

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
    addExperience(resident, XP_REWARDS[ProfessionType.Farmer].UNLOADING);

    return true;
  }

  harvesting(
    resident: Resident,
    buildings: Record<string, Buildings>,
  ): boolean {
    if (resident.profession.type !== ProfessionType.Farmer) return false;
    const garden = buildings[
      resident.taskContext?.targetId ?? ""
    ] as PlantPlace;
    if (!garden) return false;

    const gardenSize = (garden.width || 1) * (garden.length || 1);
    const harvestDuration = FARMER_TASK_DURATION.HARVESTING * gardenSize;

    if (resident.workProgress < harvestDuration) {
      resident.workProgress += getSpeedWork(
        ProfessionType.Farmer,
        resident.profession.level,
      );
      return false;
    }
    if (!garden.harvest || !garden.harvest?.isReady) return false;

    const plant = PLANT_CONFIG[garden.harvest.type];
    const baseYield = Math.floor(
      Math.random() * (plant.maxYield - plant.minYield + 1) + plant.minYield,
    );
    const healthFactor = garden.health / 100;
    const amount =
      Math.max(1, Math.round(baseYield * healthFactor)) * gardenSize;

    addItemToInventory(resident, garden.harvest.type, amount);
    resident.workProgress = 0;
    resident.taskContext = null;
    addExperience(resident, XP_REWARDS[ProfessionType.Farmer].HARVEST);
    const targetGarden = buildings[garden.id] as PlantPlace;
    targetGarden.harvest = null;
    targetGarden.isWatered = false;
    if (targetGarden.type === BuildingType.Garden) {
      targetGarden.moisture = 0;
    }
    return true;
  }

  planting(resident: Resident, buildings: Record<string, Buildings>): boolean {
    if (resident.profession.type !== ProfessionType.Farmer) return false;
    const garden = buildings[
      resident.taskContext?.targetId ?? ""
    ] as PlantPlace;
    if (!garden) return false;

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
    garden.isWatered = true;
    garden.health = 100;

    if (garden.type === BuildingType.Greenhouse) {
      garden.growthCoefficient =
        BUILDING_CONFIG[BuildingType.Greenhouse].growthCoefficient;
    } else {
      garden.moisture = 5;
    }

    resident.workProgress = 0;
    resident.taskContext = null;
    addExperience(resident, XP_REWARDS[ProfessionType.Farmer].PLANTING);

    return true;
  }

  collectWater(
    resident: Resident,
    buildings: Record<string, Buildings>,
  ): boolean {
    if (resident.profession.type !== ProfessionType.Farmer) return false;
    const tc = resident.taskContext;
    if (!tc) return false;

    const isWell = tc.targetId
      ? buildings[tc.targetId]?.type === BuildingType.Well
      : false;
    if (resident.workProgress < FARMER_TASK_DURATION.SET_WATER) {
      resident.workProgress += getSpeedWork(
        ProfessionType.Farmer,
        resident.profession.level,
      );
      const typeWater = isWell ? ResourceType.WellWater : ResourceType.Water;
      const stepAmount = Math.round(
        (tc.neededAmount + tc.currentAmount) / FARMER_TASK_DURATION.SET_WATER,
      );
      const remainingNeeded = tc.neededAmount - tc.currentAmount;
      const taken = Math.min(stepAmount, remainingNeeded);

      const well = isWell ? (buildings[tc.targetId] as Well) : null;
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
      return false;
    }

    resident.workProgress = 0;
    resident.taskContext = null;
    return true;
  }

  wateringPlant(
    resident: Resident,
    buildings: Record<string, Buildings>,
  ): boolean {
    if (resident.profession.type !== ProfessionType.Farmer) return false;
    const garden = buildings[
      resident.taskContext?.targetId ?? ""
    ] as PlantPlace;
    if (!garden || !garden.harvest || garden.harvest.isReady) return false;

    const gardenSize = (garden.width || 1) * (garden.length || 1);
    const waterDuration = FARMER_TASK_DURATION.SET_WATER * gardenSize;

    if (resident.workProgress < waterDuration) {
      resident.workProgress += getSpeedWork(
        ProfessionType.Farmer,
        resident.profession.level,
      );
      if (garden.type === BuildingType.Greenhouse) {
        const gh = garden as Greenhouse;
        gh.waterTank.current = Math.min(
          gh.waterTank.max,
          gh.waterTank.current +
            (gh.waterTank.max / waterDuration) *
              getSpeedWork(ProfessionType.Farmer, resident.profession.level),
        );
      } else {
        garden.moisture = Math.min(
          100,
          100 *
            (resident.workProgress /
              (FARMER_TASK_DURATION.SET_WATER * gardenSize)),
        );
      }
      return false;
    }

    if (garden.type === BuildingType.Greenhouse) {
      const gh = garden as Greenhouse;
      gh.waterTank.current = gh.waterTank.max;
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
    addExperience(resident, XP_REWARDS[ProfessionType.Farmer].WATERING);

    return true;
  }
}
