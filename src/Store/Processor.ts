import {
  BuildingType,
  type Garden,
  type Greenhouse,
  type Resident,
  type Well,
} from "../engine/Types.ts";
import { PLANT_CONFIG, VILLAGER_CONFIG } from "../engine/Constants.ts";

export const processPlantGrowth = (building: Garden | Greenhouse) => {
  if (building.harvest && !building.harvest.isReady) {
    const consumption =
      PLANT_CONFIG[building.harvest.type].waterConsumptionPerTick;

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
      building.harvest.growthProgress += building.growthCoefficient;

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
};
export const processResident = (resident: Resident) => {
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
};
export const processWell = (building: Well) => {
  building.currentAmount = Math.min(
    building.maxCapacity,
    building.currentAmount + building.refillRate,
  );
};
