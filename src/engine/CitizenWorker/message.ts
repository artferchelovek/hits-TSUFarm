import {
  type Buildings,
  type GameLog,
  type PlantPlace,
  type Resident,
  Season,
  Weather,
} from "../Types.ts";

export type UItoWorkerMessage =
  | {
      type: "INIT_WORLD";
      payload: {
        grid: Uint8Array;
        buildings: Record<string, Buildings>;
        width: number;
        height: number;
      };
    }
  | {
      type: "SET_RESIDENTS";
      payload: { residents: Record<string, Resident> };
    }
  | {
      type: "TICK";
      payload: {
        isNight: boolean;
        weather: Weather;
        season: Season;
        plantBuildings: PlantPlace[];
        tick: number;
      };
    }
  | { type: "RESIDENT_BORN"; payload: Resident }
  | {
      type: "UPDATE_BUILDING";
      payload: {
        building: Buildings;
      };
    };

export type WorkerToUIMessage =
  | {
      type: "TICK_DONE";
      payload: {
        residents: Record<string, Resident>;
        deadIds: string[];
        plants: PlantPlace[];
        logs: GameLog[];
      };
    }
  | {
      type: "INIT_DONE";
    }
  | { type: "UPDATE_BUILDING_SUCCESS" }
  | { type: "SET_RESIDENTS_SUCCESS" };
