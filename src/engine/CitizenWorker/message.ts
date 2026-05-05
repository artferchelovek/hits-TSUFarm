import {
  BuildingType,
  type Position,
  type Resident,
  Season,
  Weather,
} from "../Types.ts";

export type UItoWorkerMessage =
  | {
      type: "INIT_WORLD";
      payload: {
        residents: Record<string, Resident>;
        grid: Uint8Array;
        width: number;
        height: number;
      };
    }
  | {
      type: "TICK";
      payload: {
        isNight: boolean;
        weather: Weather;
        season: Season;
        tick: number;
      };
    }
  | { type: "RESIDENT_BORN"; payload: Resident }
  | {
      type: "BUILDING_PLACED";
      payload: {
        pos: Position;
        width: number;
        length: number;
        type: BuildingType;
      };
    };

export type WorkerToUIMessage =
  | { type: "SYNC"; payload: { residents: Record<string, Resident> } }
  | {
      type: "RESIDENT_DIED";
      payload: { id: string; name: string; age: number };
    }
  | { type: "REQUEST_REPRODUCTION"; payload: { parentId: string } }
  | { type: "LOG"; payload: { message: string; type: "info" | "warning" } };
