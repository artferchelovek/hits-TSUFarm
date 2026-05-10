import type { WorkerToUIMessage } from "./CitizenWorker/message.ts";

export enum BuildingType {
  Main = "MAIN",
  House = "HOUSE",
  Granary = "GRANARY",
  Greenhouse = "GREENHOUSE",
  Market = "MARKET",
  Well = "WELL",
  Bridge = "BRIDGE",
  Road = "ROAD",
  Garden = "GARDEN",
  Graveyard = "GRAVEYARD",
}

export enum VillagerStatus {
  Idle = "Idle",
  Moving = "Moving",
  Working = "Working",
  Sleeping = "Sleeping",
  Eating = "Eating",
}

export enum ResourceType {
  Water = "Water",
  Tomato = "Tomato",
  Potato = "Potato",
  Cucumber = "Cucumber",
  Corn = "Corn",
  Pumpkin = "Pumpkin",
  Wheat = "Wheat",
  Empty = "Empty",
}
export enum Weather {
  Snow = "Snow",
  Rain = "Rain",
  Clear = "Clear",
}
export enum Season {
  Summer = "Summer",
  Autumn = "Autumn",
  Winter = "Winter",
  Spring = "Spring",
}
export enum Gender {
  Male = "Male",
  Female = "Female",
}
export interface Position {
  x: number;
  y: number;
}

export type LogType = "info" | "warning" | "error" | "success";

export interface Result {
  success: boolean;
  message: string;
}

export interface GameLog {
  id: string;
  tick: number;
  message: string;
  type: LogType;
}

export type CropType =
  | ResourceType.Tomato
  | ResourceType.Potato
  | ResourceType.Corn
  | ResourceType.Pumpkin
  | ResourceType.Wheat
  | ResourceType.Cucumber;

export interface CropState {
  type: CropType;
  growthProgress: number;
  isReady: boolean;
}

export interface Plant {
  type: CropType;
  name: string;
  growthPerTick: number;
  waterConsumptionPerTick: number;
  sellPrice: number;
  minYield: number;
  maxYield: number;
}

interface BaseBuilding {
  id: string;
  position: Position;
  width: number;
  length: number;
}

interface PlaceGrow extends BaseBuilding {
  harvest: CropState | null;
  growthCoefficient: number;
  moisture: number;
  lastWateredTime: number;
  isWatered: boolean;
  health: number;
  assignedWorkerId?: string[];
}

export interface Main extends BaseBuilding {
  type: BuildingType.Main;
  populationStats: {
    maxCapacity: number;
    currentAmount: number;
  };
}

export interface House extends BaseBuilding {
  type: BuildingType.House;
  residentsId: string[];
  capacity: number;
}

export interface Granary extends BaseBuilding {
  type: BuildingType.Granary;
  storage: {
    resources: Partial<Record<CropType, number>>;
    maxCapacity: number;
  };
}
export type PlantPlace = Garden | Greenhouse;
export interface Garden extends PlaceGrow {
  type: BuildingType.Garden;
}

export interface Greenhouse extends PlaceGrow {
  type: BuildingType.Greenhouse;
  fixedCropType: CropType | null;
  waterTank: {
    current: number;
    max: number;
  };
  baseYield: number;
}

export interface Well extends BaseBuilding {
  type: BuildingType.Well;
  currentAmount: number;
  maxCapacity: number;
  refillRate: number;
}

export interface Market extends BaseBuilding {
  type: BuildingType.Market;
}

export interface Bridge extends BaseBuilding {
  type: BuildingType.Bridge;
  speedModifier: number;
}

export interface Road extends BaseBuilding {
  type: BuildingType.Road;
  speedModifier: number;
}

export interface Graveyard extends BaseBuilding {
  type: BuildingType.Graveyard;
  decedents: Decedent[];
  maxCapacity: number;
}

export type Buildings =
  | Main
  | House
  | Granary
  | Garden
  | Greenhouse
  | Well
  | Market
  | Bridge
  | Road
  | Graveyard;
export interface Farmer {
  experience: number;
}
export type Profession = Farmer;
export interface Resident {
  id: string;
  profession: Profession | null;
  skills: Record<string, number>;
  name: string;
  surname: string;
  position: Position;
  gender: Gender;
  age: number;
  parents: Birth;
  health: number;
  hunger: number;
  status: VillagerStatus;
  homeId: string | null;
  workplaceId: string | null;
  inventory: {
    type: ResourceType;
    amount: number;
  };
  path: Position[];
  pathIndex: number;
}
export interface Birth {
  parentFirst: string;
  parentSecond: string;
}
export interface Decedent {
  id: string;
  name: string;
  ageAtDeath: number;
}

export interface GameState {
  meta: {
    version: string;
    lastSaved: number;
    gameTick: number;
    graveyardIds: string[];
    currentWeather: Weather;
    currentSeason: Season;
    seasonDuration: number;
    dayDuration: number;
    isNight: boolean;
  };
  economy: {
    money: number;
    level: number;
    totalPopulation: number;
  };
  buildings: Record<string, Buildings>;
  buildingCounts: Record<BuildingType, number>;
  buildingRemind: Record<BuildingType, number>;
  residents: Record<string, Resident>;
  logs: GameLog[];
}

export interface GameActions {
  applyWorkerUpdate: (message: WorkerToUIMessage) => void;
  tick: () => void;
  addBuilding: (type: BuildingType, pos: Position) => Result;
  addPlant: (build: Garden | Greenhouse, plant: CropType) => Result;
  loadState: (gameState: GameState) => void;
}

export type GameStore = { gameState: GameState } & GameActions;
