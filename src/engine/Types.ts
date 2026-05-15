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
  Mill = "MILL",
}

export enum VillagerStatus {
  Idle = "Idle",
  Moving = "Moving",
  MovingToStorage = "MovingToStorage",
  Unloading = "Unloading",
  Harvesting = "Harvesting",
  MovingToHarvest = "MovingToHarvest",
  Working = "Working",
  Sleeping = "Sleeping",
  Eating = "Eating",
}
export const moveStatuses: VillagerStatus[] = [
  VillagerStatus.MovingToHarvest,
  VillagerStatus.MovingToStorage,
  VillagerStatus.Moving,
];
export enum ResourceType {
  Water = "Water",
  Tomato = "Tomato",
  Potato = "Potato",
  Cucumber = "Cucumber",
  Corn = "Corn",
  Pumpkin = "Pumpkin",
  Wheat = "Wheat",
  FLour = "FLour",
  Bread = "Bread",
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

export type ProductType = ResourceType.FLour | ResourceType.Bread;

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
  assignedWorkerId?: string;
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
    currentAmount: number;
  };
  export: string[];
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

export interface Mill extends BaseBuilding {
  type: BuildingType.Mill;
  export: string[];
  capacity: number;
  maxCapacity: number;
  recipe: {
    import: ResourceType.Wheat;
    importCount: number;
    export: ProductType;
    exportCount: number;
    durationPerTick: number;
  };
  storage: ResourceType[];
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
  | Graveyard
  | Mill;

export enum ProfessionType {
  Farmer = "Farmer",
  Jobless = "Jobless",
}

export interface BaseWorker {
  level: number;
  xp: number;
}

export interface Farmer extends BaseWorker {
  type: ProfessionType.Farmer;
  assignedGardenIds?: string[];
}
export interface Jobless {
  type: ProfessionType.Jobless;
}
export type Profession = Farmer | Jobless;
export interface Resident {
  id: string;
  profession: Profession;
  pendingProfession?: Profession;
  skills: Record<string, number>;
  workProgress: number;
  targetId: string | null;
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
    resources: Partial<Record<ResourceType, number>>;
    totalAmount: number;
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
  addBuilding: (
    type: BuildingType,
    pos: Position,
    size?: { width: number; length: number },
  ) => Result;
  addPlant: (build: Garden | Greenhouse, plant: CropType) => Result;
  giveProfession: (profession: Profession, resident: Resident) => boolean;
  loadState: (gameState: GameState) => void;
  assignGardenToFarmer: (resident: Resident, place: PlantPlace) => void;
  getResidents: () => Record<string, Resident>;
  setPendingExportSource: (id: string | null) => void;
  linkExportBuildings: (sourceId: string, targetId: string) => void;
  removeExportLink: (sourceId: string, targetId: string) => void;
  removeBuilding: (id: string) => Result;
  moveBuilding: (id: string, newPos: Position) => Result;
}

export type GameStore = {
  gameState: GameState;
  pendingExportSourceId: string | null;
} & GameActions;
