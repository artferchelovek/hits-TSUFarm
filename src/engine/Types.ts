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
export interface Position {
  x: number;
  y: number;
}
interface BaseBuilding {
  id: string;
  position: Position;
  width: number;
  height: number;
}

export type CropType =
  | ResourceType.Tomato
  | ResourceType.Potato
  | ResourceType.Corn
  | ResourceType.Pumpkin
  | ResourceType.Wheat
  | ResourceType.Cucumber;

interface PlaceGrow extends BaseBuilding {
  harvest: CropState | null;
  growthCoefficient: number;
  lastWateredTime: number;
  isWatered: boolean;
  health: number;
  assignedWorkerId?: string;
}

export interface CropState {
  type: CropType;
  growthProgress: number;
  isReady: boolean;
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

export interface Resident {
  id: string;
  name: string;
  position: Position;
  age: number;
  homeId: string | null;
  workplaceId: string | null;
  status: VillagerStatus;
  health: number;
  hunger: number;
  inventory: {
    type: ResourceType;
    amount: number;
  };
}
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

export interface House extends BaseBuilding {
  type: BuildingType.House;
  residentsId: string[];
  capacity: number;
}

export interface Main extends BaseBuilding {
  type: BuildingType.Main;
  populationStats: {
    maxCapacity: number;
    currentAmount: number;
  };
}

export interface Granary extends BaseBuilding {
  type: BuildingType.Granary;
  storage: {
    resources: Record<CropType, number>;
    maxCapacity: number;
  };
}

export interface Well extends BaseBuilding {
  type: BuildingType.Well;
  currentAmount: number;
  maxCapacity: number;
  refillRate: number;
}

export interface Bridge extends BaseBuilding {
  type: BuildingType.Bridge;
  speedModifier: number;
}
export interface Road extends BaseBuilding {
  type: BuildingType.Road;
  speedModifier: number;
}
export interface Decedent {
  id: string;
  name: string;
  ageAtDeath: number;
}
export interface Graveyard extends BaseBuilding {
  type: BuildingType.Graveyard;
  decedents: Decedent[];
  maxCapacity: number;
}
export interface Market extends BaseBuilding {
  type: BuildingType.Market;
}
export interface GameState {
  meta: {
    version: string;
    lastSaved: number;
    gameTick: number;
  };
  economy: {
    gold: number;
    totalPopulation: number;
  };
  buildings: Array<
    | Garden
    | Greenhouse
    | House
    | Main
    | Granary
    | Market
    | Well
    | Bridge
    | Graveyard
    | Road
  >;
  residents: Resident[];
}
