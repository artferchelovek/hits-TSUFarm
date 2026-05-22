import {
  type BaseWorker,
  BuildingType,
  type CropType,
  type GameState,
  Gender,
  type Granary,
  type Plant,
  type Profession,
  ProfessionType,
  type Resident,
  ResourceType,
  Season,
  VillagerStatus,
  Weather,
} from "./Types";
import { TileType } from "./WorldMap.ts";
import { getBuildingLimit } from "../Store/BuildLimit.ts";

import * as SVGs from "../assets/svg";

export const FIRST_NAMES_MALE = [
  "Александр",
  "Андрей",
  "Борис",
  "Василий",
  "Григорий",
  "Дмитрий",
  "Евгений",
  "Иван",
  "Константин",
  "Леонид",
  "Михаил",
  "Никита",
  "Олег",
  "Петр",
  "Сергей",
  "Федор",
  "Юрий",
  "Ярослав",
];

export const FIRST_NAMES_FEMALE = [
  "Анна",
  "Белла",
  "Валентина",
  "Галина",
  "Дарья",
  "Екатерина",
  "Жанна",
  "Зоя",
  "Ирина",
  "Ксения",
  "Людмила",
  "Мария",
  "Наталья",
  "Ольга",
  "Полина",
  "Светлана",
  "Татьяна",
  "Юлия",
];

export const LAST_NAMES = [
  "Смирнов",
  "Иванов",
  "Кузнецов",
  "Петров",
  "Сидоров",
  "Соколов",
  "Михайлов",
  "Федоров",
  "Волков",
  "Алексеев",
  "Лебедев",
  "Новиков",
  "Морозов",
  "Романов",
  "Захаров",
  "Зайцев",
  "Павлов",
  "Козлов",
  "Макаров",
  "Орлов",
  "Киселев",
  "Васильев",
  "Соловьев",
  "Титов",
];

export function generateRandomName(gender: Gender): {
  name: string;
  surname: string;
} {
  const firstNames =
    gender === Gender.Male ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE;
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const finalSurname = lastName + (gender === Gender.Female ? "а" : "");
  return {
    name: firstName,
    surname: finalSurname,
  };
}
export const PROFESSION_SETTINGS: Partial<
  Record<
    ProfessionType,
    {
      assignmentCost: number;
      baseWorkSpeed: number;
      workSpeedUpPerLevel: number;
      xpGainPerTick: number;
      baseSalary: number;
      xpPerLevel: number;
      baseMaxGardens: number;
      gardensPerLevel: number;
      maxLevel: number;
      baseInventoryCapacity: number;
      inventoryCapacityPerLevel: number;
    }
  >
> = {
  [ProfessionType.Farmer]: {
    assignmentCost: 150,
    baseWorkSpeed: 1.0,
    workSpeedUpPerLevel: 0.5,
    xpGainPerTick: 0.1,
    baseSalary: 0,
    xpPerLevel: 100,
    baseMaxGardens: 5,
    gardensPerLevel: 5,
    maxLevel: 5,
    baseInventoryCapacity: 10,
    inventoryCapacityPerLevel: 2,
  },
  [ProfessionType.Transporter]: {
    assignmentCost: 200,
    baseWorkSpeed: 1.0,
    workSpeedUpPerLevel: 0.5,
    xpGainPerTick: 0.1,
    baseSalary: 0,
    xpPerLevel: 100,
    baseMaxGardens: 0,
    gardensPerLevel: 0,
    maxLevel: 5,
    baseInventoryCapacity: 20,
    inventoryCapacityPerLevel: 5,
  },
};
export const FARMER_TASK_DURATION = {
  SET_WATER: 1,
  HARVESTING: 3,
  PLANTING: 4,
  UNLOADING: 5,
};
export const TRANSPORTER_TASK_DURATION = {
  LOADING: 3,
  UNLOADING: 3,
};
export function getMaxGardens(
  professionType: ProfessionType,
  level: number,
): number {
  const settings = PROFESSION_SETTINGS[professionType];
  if (!settings) return 0;
  return settings.baseMaxGardens + level * settings.gardensPerLevel;
}

export function getXpForNextLevel(
  professionType: ProfessionType,
  currentLevel: number,
): number {
  const settings = PROFESSION_SETTINGS[professionType];
  if (!settings) return 0;
  return settings.xpPerLevel * currentLevel;
}

export function getMaxInventoryCapacity(
  professionType: ProfessionType,
  level: number,
): number {
  const settings = PROFESSION_SETTINGS[professionType];
  if (!settings) return 10;
  return (
    settings.baseInventoryCapacity + level * settings.inventoryCapacityPerLevel
  );
}
export function getSpeedWork(
  professionType: ProfessionType,
  level: number,
): number {
  const settings = PROFESSION_SETTINGS[professionType];
  if (!settings) return 10;
  return settings.baseWorkSpeed + level * settings.workSpeedUpPerLevel;
}
export function createProfession(
  type: ProfessionType,
  overrides?: Partial<BaseWorker>,
): Profession {
  if (type === ProfessionType.Jobless) return { type: ProfessionType.Jobless };
  return { type, level: 1, xp: 0, ...overrides } as Profession;
}

export const XP_REWARDS = {
  [ProfessionType.Farmer]: {
    HARVEST: 15,
    WATERING: 10,
    UNLOADING: 5,
    PLANTING: 8,
  },
  [ProfessionType.Transporter]: {
    LOADING: 8,
    UNLOADING: 10,
  },
};
export const MOVE_COST_PER_TILE = 10;
export const MOVE_COST_MULTIPLIER = 1.05;

export const BUILDING_CONFIG = {
  [BuildingType.Main]: {
    width: 3,
    length: 5,
    initialCapacity: 2,
    cost: 0,
    maintenanceCost: 0,
  },
  [BuildingType.House]: {
    width: 3,
    length: 3,
    capacity: 3,
    cost: 50,
    maintenanceCost: 0,
  },
  [BuildingType.Granary]: {
    width: 4,
    length: 4,
    maxCapacity: 700,
    cost: 120,
    maintenanceCost: 2,
  },
  [BuildingType.Well]: {
    width: 2,
    length: 2,
    maxCapacity: 200,
    refillRate: 2,
    cost: 40,
    maintenanceCost: 1,
  },
  [BuildingType.Market]: {
    width: 3,
    length: 3,
    cost: 250,
    maxCapacity: 200,
    maintenanceCost: 10,
  },
  [BuildingType.Garden]: {
    width: 1,
    length: 1,
    moisture: 0,
    growthCoefficient: 1.0,
    cost: 10,
    maintenanceCost: 0,
  },
  [BuildingType.Greenhouse]: {
    width: 3,
    length: 2,
    waterMax: 150,
    moisture: 0,
    growthCoefficient: 1.5,
    cost: 200,
    maintenanceCost: 0,
  },
  [BuildingType.Road]: {
    width: 1,
    length: 1,
    speed: 1.5,
    cost: 2,
    maintenanceCost: 0,
  },
  [BuildingType.Bridge]: {
    width: 1,
    length: 1,
    speed: 1.2,
    cost: 15,
    maintenanceCost: 0,
  },
  [BuildingType.Graveyard]: {
    width: 3,
    length: 3,
    maxCapacity: 50,
    cost: 80,
    maintenanceCost: 0,
  },
  [BuildingType.Mill]: {
    width: 3,
    length: 5,
    cost: 300,
    maxCapacity: 20,
    maintenanceCost: 5,
  },
  [BuildingType.Bakery]: {
    width: 3,
    length: 3,
    cost: 250,
    maxCapacity: 15,
    maintenanceCost: 8,
  },
};
export const PLANT_CONFIG: Record<CropType, Plant> = {
  [ResourceType.Wheat]: {
    type: ResourceType.Wheat,
    name: "Пшеница",
    growthPerTick: 0.02,
    waterConsumptionPerTick: 0.1,
    neededWater: 1.5,
    sellPrice: 2,
    minYield: 5,
    maxYield: 10,
  },
  [ResourceType.Cucumber]: {
    type: ResourceType.Cucumber,
    name: "Огурец",
    growthPerTick: 0.0125,
    waterConsumptionPerTick: 0.4,
    neededWater: 4.5,
    sellPrice: 5,
    minYield: 3,
    maxYield: 6,
  },
  [ResourceType.Tomato]: {
    type: ResourceType.Tomato,
    name: "Помидор",
    growthPerTick: 0.01,
    waterConsumptionPerTick: 0.3,
    neededWater: 4.0,
    sellPrice: 8,
    minYield: 2,
    maxYield: 5,
  },
  [ResourceType.Potato]: {
    type: ResourceType.Potato,
    name: "Картофель",
    growthPerTick: 0.008,
    waterConsumptionPerTick: 0.2,
    neededWater: 2.5,
    sellPrice: 4,
    minYield: 4,
    maxYield: 8,
  },
  [ResourceType.Corn]: {
    type: ResourceType.Corn,
    name: "Кукуруза",
    growthPerTick: 0.006,
    waterConsumptionPerTick: 0.5,
    neededWater: 6.0,
    sellPrice: 12,
    minYield: 2,
    maxYield: 4,
  },
  [ResourceType.Pumpkin]: {
    type: ResourceType.Pumpkin,
    name: "Тыква",
    growthPerTick: 0.004,
    waterConsumptionPerTick: 0.8,
    neededWater: 10.0,
    sellPrice: 25,
    minYield: 1,
    maxYield: 2,
  },
};
export const RESOURCE_PRICES: Partial<Record<ResourceType, number>> = {
  [ResourceType.Wheat]: 2,
  [ResourceType.Cucumber]: 5,
  [ResourceType.Tomato]: 8,
  [ResourceType.Potato]: 4,
  [ResourceType.Corn]: 12,
  [ResourceType.Pumpkin]: 25,
  [ResourceType.Flour]: 6,
  [ResourceType.Bread]: 18,
  [ResourceType.Water]: 0.1,
  [ResourceType.WellWater]: 0.5,
};

export const PLANT_EFFECTS = {
  WELL_WATER_EFFECT: 1.2,
};
export const FARMER_WATER_CAPACITY = 20;
export const WELL_REFILL_AMOUNT = 20;
export const DROUGHT_DAMAGE_TICK = 0.01;
export const VILLAGER_CONFIG = {
  maxHunger: 100,
  maxHealth: 100,
  hungerPerTick: 0.02,
  starvationDamagePerTick: 1,
  healPerTick: 0.5,
  agePerTick: 1 / 600,
  baseDeathChance: 0.0001,
  minWalkableAge: 3,
  minAgeForWork: 14,
  homelessDamagePerTick: 5,
  maxInventCapacity: 10,
  moveSpeed: 1,
};
export const REPRODUCTION = {
  BASE_REPRODUCTION_CHANCE: 0.1,
  PEAK_FERTILITY_AGE: 30,
  MAX_FERTILITY_AGE: 60,
  MIN_FERTILITY_AGE: 18,
};

export const WeatherEffects = {
  NIGHT_GROWTH_COEFFICIENT: 0.5,
  RAIN_MOISTURE_GAIN: 0.5,
  WINTER_PLANT_DAMAGE: 0.05,
};
export const INITIAL_RESIDENTS: Record<string, Resident> = {
  "res-1": {
    id: "res-1",
    profession: {
      type: ProfessionType.Farmer,
      level: 1,
      xp: 0,
      assignedGardenIds: [],
    },
    skills: {},
    workProgress: 0,
    taskContext: null,
    name: generateRandomName(Gender.Male).name,
    surname: generateRandomName(Gender.Male).surname,
    age: 30,
    gender: Gender.Male,
    position: { x: 113, y: 109 },
    health: 100,
    hunger: 100,
    status: VillagerStatus.Idle,
    homeId: "main-building",
    workplaceId: null,
    inventory: {
      resources: {},
      totalAmount: 0,
    },
    path: [],
    pathIndex: 0,
    parents: {
      parentFirst: "initial",
      parentSecond: "initial",
    },
  },
  "res-2": {
    id: "res-2",
    profession: { type: ProfessionType.Jobless },
    skills: {},
    workProgress: 0,
    taskContext: null,
    name: generateRandomName(Gender.Female).name,
    surname: generateRandomName(Gender.Female).surname,
    age: 22,
    gender: Gender.Female,
    position: { x: 112, y: 101 },
    health: 100,
    hunger: 100,
    status: VillagerStatus.Idle,
    homeId: "main-building",
    workplaceId: null,
    inventory: {
      resources: {},
      totalAmount: 0,
    },
    path: [],
    pathIndex: 0,
    parents: {
      parentFirst: "initial",
      parentSecond: "initial",
    },
  },
};
const fullWheatGranary: Granary = {
  // === Поля из интерфейса BaseBuilding ===
  id: "granary_wheat_01",
  position: { x: 105, y: 90 },
  width: 4, // Например, размер здания 3х3 клетки
  length: 4,

  // Наш новый Partial-рекорд для счётчиков брони.
  // Показывает, сколько транспортеров СЕЙЧАС взаимодействуют с этим зданием по конкретному ресурсу.
  incoming: {
    [ResourceType.Wheat]: 0, // К самому амбару сейчас никто не идёт разгружать пшеницу (он и так полон)
  },

  // === Специфичные поля интерфейса Granary ===
  type: BuildingType.Granary,
  resourceType: ResourceType.Wheat, // Амбар залочен под пшеницу

  storage: {
    amount: 500, // Текущее количество (полный)
    maxCapacity: 500, // Максимальная вместимость
  },

  // Массив экспортных связей (куда логисты должны тащить пшеницу)
  export: [],
  maintenanceCost: 2,
};
export const initialGameState: GameState = {
  meta: {
    version: "0.0.1",
    lastSaved: Date.now(),
    gameTick: 300,
    graveyardIds: [],
    seasonDuration: 30 * 1000,
    currentSeason: Season.Summer,
    currentWeather: Weather.Clear,
    dayDuration: 1000,
    isNight: false,
  },
  economy: {
    money: 100000,
    level: 10,
    totalPopulation: 0,
    marketDemand: Object.fromEntries(
      Object.values(ResourceType).map((r) => [r, 1.0]),
    ),
  },
  buildings: { granary_wheat_01: fullWheatGranary },
  buildingCounts: Object.fromEntries(
    Object.values(BuildingType).map((type) => [type, 0]),
  ) as Record<BuildingType, number>,
  buildingRemind: Object.fromEntries(
    Object.values(BuildingType).map((type) => [
      type,
      getBuildingLimit(type, 10),
    ]),
  ) as Record<BuildingType, number>,
  residents: {},
  logs: [],
};

export const BUILDING_COLORS: Record<string, string> = {
  MAIN: "#8B5A2B",
  HOUSE: "#C68642",
  GRANARY: "#7A4A24",
  GREENHOUSE: "#6AA84F",
  MARKET: "#B86B3A",
  WELL: "#6C9FBF",
  BRIDGE: "#7B5E3A",
  ROAD: "#9E7B5A",
  GARDEN: "#4CAF50",
  GRAVEYARD: "#5D5D5D",
  BAKERY: "#D2B48C",
};

export const PALETTE = {
  [TileType.Grass]: "#9EEAA1",
  [TileType.Hill]: "#57C35B",
  [TileType.Water]: "#76F2F7",
  [TileType.Sand]: "#F9FE90",
  [TileType.PreHill]: "#76DC7A",
  [TileType.DeepWater]: "#00E1E9",
};

export const TILE_SVG = {
  [TileType.Grass]: SVGs.grass,
  [TileType.Hill]: SVGs.hill,
  [TileType.PreHill]: SVGs.prehill,
  [TileType.Sand]: SVGs.sand,
  [TileType.Water]: SVGs.water,
  [TileType.DeepWater]: SVGs.deepwater,
};

export const BUILDING_SVG: Record<string, string> = {
  MAIN: SVGs.mainbuilding,
  HOUSE: SVGs.house,
  GRANARY: SVGs.granary,
  GREENHOUSE: SVGs.greenhouse,
  MARKET: SVGs.market,
  WELL: SVGs.well,
  BRIDGE: SVGs.bridge,
  ROAD: SVGs.road,
  GARDEN: SVGs.garden,
  GARDEN_PLANTED: SVGs.gardenPlanted,
  GARDEN_MED: SVGs.gardenMed,
  GARDEN_READY: SVGs.gardenReady,
  GRAVEYARD: SVGs.graveyard,
  MILL: SVGs.mill,
  BAKERY: SVGs.bakery,
};

export const CHARACTERS_SVG: Record<string, string> = {
  Male: SVGs.man,
  Female: SVGs.woman,
};

export const RESOURCE_DISPLAY_NAMES: Partial<Record<ResourceType, string>> = {
  [ResourceType.Tomato]: "Помидор",
  [ResourceType.Potato]: "Картофель",
  [ResourceType.Cucumber]: "Огурец",
  [ResourceType.Corn]: "Кукуруза",
  [ResourceType.Pumpkin]: "Тыква",
  [ResourceType.Wheat]: "Пшеница",
  [ResourceType.Flour]: "Мука",
  [ResourceType.Bread]: "Хлеб",
  [ResourceType.Water]: "Вода",
  [ResourceType.WellWater]: "Колодезная вода",
  [ResourceType.Empty]: "Пусто",
};

export const EXPORT_RULES: Partial<Record<BuildingType, BuildingType[]>> = {
  [BuildingType.Granary]: [BuildingType.Mill, BuildingType.Bakery, BuildingType.Market],
  [BuildingType.Mill]: [BuildingType.Granary, BuildingType.Bakery, BuildingType.Market],
  [BuildingType.Bakery]: [BuildingType.Granary, BuildingType.Market],
};

export const TILE_SIZE = 25;
export const MAP_DIMENSION = 500;
