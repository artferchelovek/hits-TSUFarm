import {
  BuildingType,
  type CropType,
  type GameState,
  type Plant,
  ResourceType,
  Season,
  Weather,
} from "./Types";
import { TileType } from "./WorldMap.ts";
import MainInfo from "../components/game/InfoBox/InfoGroups/MainInfo.tsx";
import HouseInfo from "../components/game/InfoBox/InfoGroups/HouseInfo.tsx";
import GranaryInfo from "../components/game/InfoBox/InfoGroups/GranaryInfo.tsx";
import GreenhouseInfo from "../components/game/InfoBox/InfoGroups/GreenhouseInfo.tsx";
import MarketInfo from "../components/game/InfoBox/InfoGroups/MarketInfo.tsx";
import GardenInfo from "../components/game/InfoBox/InfoGroups/GardenInfo.tsx";
import WellInfo from "../components/game/InfoBox/InfoGroups/WellInfo.tsx";
import GraveyardInfo from "../components/game/InfoBox/InfoGroups/GraveyardInfo.tsx";
import RoadInfo from "../components/game/InfoBox/InfoGroups/RoadInfo.tsx";
import BridgeInfo from "../components/game/InfoBox/InfoGroups/BridgeInfo.tsx";

export const BUILDING_CONFIG = {
  [BuildingType.Main]: {
    width: 4,
    length: 4,
    initialCapacity: 2,
    cost: 0,
  },
  [BuildingType.House]: {
    width: 2,
    length: 2,
    capacity: 3,
    cost: 50,
  },
  [BuildingType.Granary]: {
    width: 5,
    length: 4,
    maxCapacity: 200,
    cost: 120,
  },
  [BuildingType.Well]: {
    width: 2,
    length: 2,
    maxCapacity: 200,
    refillRate: 2,
    cost: 40,
  },
  [BuildingType.Market]: {
    width: 3,
    length: 3,
    cost: 250,
  },
  [BuildingType.Garden]: {
    width: 1,
    length: 1,
    moisture: 100,
    growthCoefficient: 1.0,
    cost: 10,
  },
  [BuildingType.Greenhouse]: {
    width: 3,
    length: 2,
    waterMax: 150,
    moisture: 100,
    growthCoefficient: 1.5,
    cost: 200,
  },
  [BuildingType.Road]: {
    width: 1,
    length: 1,
    speed: 1.5,
    cost: 2,
  },
  [BuildingType.Bridge]: {
    width: 1,
    length: 1,
    speed: 1.2,
    cost: 15,
  },
  [BuildingType.Graveyard]: {
    width: 3,
    length: 3,
    maxCapacity: 50,
    cost: 80,
  },
};
export const BUILDING_NAMES: Record<BuildingType, string> = {
  [BuildingType.Main]: "Главное здание",
  [BuildingType.Market]: "Рынок",
  [BuildingType.Greenhouse]: "Теплица",
  [BuildingType.Garden]: "Сад",
  [BuildingType.Well]: "Колодец",
  [BuildingType.Graveyard]: "Кладбище",
  [BuildingType.Bridge]: "Мост",
  [BuildingType.Road]: "Дорога",
  [BuildingType.House]: "Дом для жителей",
  [BuildingType.Granary]: "Амбар",
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
  hungerPerTick: 0.5,
  starvationDamagePerTick: 1,
  healPerTick: 0.5,
  agePerTick: 1 / 600,
  baseDeathChance: 0.0001,
  maxInventCapacity: 10,
  moveSpeed: 1,
};

export const WeatherEffects = {
  NIGHT_GROWTH_COEFFICIENT: 0.5,
  RAIN_MOISTURE_GAIN: 1.5,
  WINTER_PLANT_DAMAGE: 0.05,
};
const mainBuildingId = crypto.randomUUID();
export const initialGameState: GameState = {
  meta: {
    version: "0.0.1",
    lastSaved: Date.now(),
    gameTick: 0,
    graveyardIds: [],
    seasonDuration: 30 * 1000,
    currentSeason: Season.Summer,
    currentWeather: Weather.Clear,
    dayDuration: 1000,
    isNight: false,
  },
  economy: {
    money: 10000,
    level: 100,
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
  buildingCounts: {
    [BuildingType.Main]: 0,
    [BuildingType.Market]: 0,
    [BuildingType.Greenhouse]: 0,
    [BuildingType.Garden]: 0,
    [BuildingType.Well]: 0,
    [BuildingType.Graveyard]: 0,
    [BuildingType.Bridge]: 0,
    [BuildingType.Road]: 0,
    [BuildingType.House]: 0,
    [BuildingType.Granary]: 0,
  },
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
};

export const PALETTE = {
  [TileType.Grass]: "#9EEAA1",
  [TileType.Hill]: "#57C35B",
  [TileType.Water]: "#76F2F7",
  [TileType.Sand]: "#F9FE90",
  [TileType.PreHill]: "#76DC7A",
  [TileType.DeepWater]: "#00E1E9",
};

export const INFO_COMPONENTS = {
  [BuildingType.Main]: MainInfo,
  [BuildingType.Market]: MarketInfo,
  [BuildingType.Greenhouse]: GreenhouseInfo,
  [BuildingType.Garden]: GardenInfo,
  [BuildingType.Well]: WellInfo,
  [BuildingType.Graveyard]: GraveyardInfo,
  [BuildingType.Bridge]: BridgeInfo,
  [BuildingType.Road]: RoadInfo,
  [BuildingType.House]: HouseInfo,
  [BuildingType.Granary]: GranaryInfo,
};

export const TILE_SIZE = 25;
export const MAP_DIMENSION = 500;
