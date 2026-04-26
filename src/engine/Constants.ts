import {
  BuildingType,
  type CropType,
  type GameState,
  type Plant,
  ResourceType,
} from "./Types";

export const BUILDING_CONFIG = {
  [BuildingType.Main]: { width: 4, length: 4, initialCapacity: 10 },
  [BuildingType.House]: { width: 2, length: 2, capacity: 3 },
  [BuildingType.Granary]: { width: 5, length: 4, maxCapacity: 200 },
  [BuildingType.Well]: { width: 2, length: 2, maxCapacity: 200, refillRate: 2 },
  [BuildingType.Market]: { width: 3, length: 3 },
  [BuildingType.Garden]: { width: 1, length: 1, growthCoefficient: 1.0 },
  [BuildingType.Greenhouse]: {
    width: 3,
    length: 2,
    waterMax: 150,
    growthCoefficient: 1.5,
  },
  [BuildingType.Road]: { width: 1, length: 1, speed: 1.5 },
  [BuildingType.Bridge]: { width: 1, length: 1, speed: 1.2 },
  [BuildingType.Graveyard]: { width: 3, length: 3, maxCapacity: 50 },
};

export const PLANT_CONFIG: Record<CropType, Plant> = {
  [ResourceType.Wheat]: {
    type: ResourceType.Wheat,
    name: "Пшеница",
    growthPerTick: 0.02,
    waterConsumptionPerTick: 0.1,
    sellPrice: 2,
    minYield: 5,
    maxYield: 10,
  },
  [ResourceType.Cucumber]: {
    type: ResourceType.Cucumber,
    name: "Огурец",
    growthPerTick: 0.0125,
    waterConsumptionPerTick: 0.4,
    sellPrice: 5,
    minYield: 3,
    maxYield: 6,
  },
  [ResourceType.Tomato]: {
    type: ResourceType.Tomato,
    name: "Помидор",
    growthPerTick: 0.01,
    waterConsumptionPerTick: 0.3,
    sellPrice: 8,
    minYield: 2,
    maxYield: 5,
  },
  [ResourceType.Potato]: {
    type: ResourceType.Potato,
    name: "Картофель",
    growthPerTick: 0.008,
    waterConsumptionPerTick: 0.2,
    sellPrice: 4,
    minYield: 4,
    maxYield: 8,
  },
  [ResourceType.Corn]: {
    type: ResourceType.Corn,
    name: "Кукуруза",
    growthPerTick: 0.006,
    waterConsumptionPerTick: 0.5,
    sellPrice: 12,
    minYield: 2,
    maxYield: 4,
  },
  [ResourceType.Pumpkin]: {
    type: ResourceType.Pumpkin,
    name: "Тыква",
    growthPerTick: 0.004,
    waterConsumptionPerTick: 0.8,
    sellPrice: 25,
    minYield: 1,
    maxYield: 2,
  },
};
export const VILLAGER_CONFIG = {
  maxHunger: 100,
  maxHealth: 100,
  hungerPerTick: 0.1,
  starvationDamagePerTick: 1,
  healPerTick: 0.5,
  agePerTick: 1 / 600,
  maxInventCapacity: 10,
  moveSpeed: 1,
};
const mainBuildingId = crypto.randomUUID();
export const initialGameState: GameState = {
  meta: {
    version: "0.0.1",
    lastSaved: Date.now(),
    gameTick: 0,
  },
  economy: {
    money: 100,
    totalPopulation: 2,
  },
  buildings: {
    [mainBuildingId]: {
      id: mainBuildingId,
      type: BuildingType.Main,
      position: { x: 0, y: 0 },
      width: BUILDING_CONFIG[BuildingType.Main].width,
      length: BUILDING_CONFIG[BuildingType.Main].length,
      populationStats: {
        maxCapacity: BUILDING_CONFIG[BuildingType.Main].initialCapacity,
        currentAmount: 0,
      },
    },
  },
  residents: [],
};
