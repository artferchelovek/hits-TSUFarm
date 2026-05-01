import {
  type Buildings,
  BuildingType,
  type Position,
} from "../engine/Types.ts";
import { BUILDING_CONFIG } from "../engine/Constants.ts";

export const createBuilding = (
  type: BuildingType,
  pos: Position,
): Buildings => {
  const config = BUILDING_CONFIG[type];
  const id = crypto.randomUUID();
  const base = {
    id,
    position: pos,
    width: config.width,
    length: config.length,
  };

  switch (type) {
    case BuildingType.Main: {
      const config = BUILDING_CONFIG[type];
      return {
        ...base,
        type,
        populationStats: {
          maxCapacity: config.initialCapacity || 0,
          currentAmount: 0,
        },
      };
    }
    case BuildingType.House: {
      const config = BUILDING_CONFIG[type];
      return { ...base, type, residentsId: [], capacity: config.capacity };
    }
    case BuildingType.Garden: {
      const config = BUILDING_CONFIG[type];
      return {
        ...base,
        type,
        harvest: null,
        moisture: config.moisture,
        growthCoefficient: config.growthCoefficient,
        lastWateredTime: Date.now(),
        isWatered: false,
        health: 100,
        assignedWorkerId: [],
      };
    }
    case BuildingType.Greenhouse: {
      const config = BUILDING_CONFIG[type];
      return {
        ...base,
        type,
        harvest: null,
        growthCoefficient: config.growthCoefficient,
        lastWateredTime: Date.now(),
        moisture: config.moisture,
        isWatered: false,
        health: 100,
        fixedCropType: null,
        waterTank: { current: 0, max: config.waterMax },
        baseYield: 1,
        assignedWorkerId: [],
      };
    }
    case BuildingType.Granary: {
      const config = BUILDING_CONFIG[type];
      return {
        ...base,
        type,
        storage: { resources: {}, maxCapacity: config.maxCapacity },
      };
    }
    case BuildingType.Well: {
      const config = BUILDING_CONFIG[type];
      return {
        ...base,
        type,
        currentAmount: config.maxCapacity,
        maxCapacity: config.maxCapacity,
        refillRate: config.refillRate,
      };
    }
    case BuildingType.Road:
    case BuildingType.Bridge: {
      const config = BUILDING_CONFIG[type];
      return { ...base, type, speedModifier: config.speed };
    }
    case BuildingType.Market: {
      return { ...base, type };
    }
    case BuildingType.Graveyard: {
      const config = BUILDING_CONFIG[type];
      return { ...base, type, decedents: [], maxCapacity: config.maxCapacity };
    }
    default:
      throw new Error(`Неизвестное здание`);
  }
};
