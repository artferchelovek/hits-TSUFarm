import { create } from "zustand";
import { type WritableDraft } from "immer";
import {
  BuildingType,
  type GameStore,
  type LogType,
  type Result,
} from "../engine/Types.ts";
import { immer } from "zustand/middleware/immer";
import {
  BUILDING_CONFIG,
  BUILDING_NAMES,
  initialGameState,
} from "../engine/Constants.ts";
import {
  processDayTime,
  processPlantGrowth,
  processResident,
  processWell,
} from "./Processor.ts";
import { createBuilding } from "./BuildingFactory.ts";

export const appendLog = (
  state: WritableDraft<GameStore>,
  message: string,
  type: LogType,
) => {
  state.gameState.logs.push({
    id: crypto.randomUUID(),
    tick: state.gameState.meta.gameTick,
    message,
    type,
  });

  if (state.gameState.logs.length > 50) {
    state.gameState.logs.shift();
  }
};
const useGameStore = create<GameStore>()(
  immer((set) => ({
    gameState: initialGameState,

    tick: () => {
      set((state: GameStore) => {
        state.gameState.meta.gameTick++;
        processDayTime(state);
        Object.values(state.gameState.buildings).forEach((building) => {
          if (
            building.type === BuildingType.Greenhouse ||
            building.type === BuildingType.Garden
          ) {
            processPlantGrowth(state, building);
          }
          if (building.type === BuildingType.Well) {
            processWell(building);
          }
        });

        Object.values(state.gameState.residents).forEach((resident) => {
          processResident(state, resident);
        });
      });
    },
    addBuilding: (type, pos): Result => {
      let report: Result = { success: false, message: "" };
      set((state) => {
        const cost = BUILDING_CONFIG[type].cost;

        if (cost <= state.gameState.economy.money) {
          state.gameState.economy.money -= cost;
          const newBuild = createBuilding(type, pos);
          state.gameState.buildings[newBuild.id] = newBuild;

          if (type === BuildingType.Graveyard) {
            state.gameState.meta.graveyardIds.push(newBuild.id);
          }
          report = {
            success: true,
            message: `${BUILDING_NAMES[type]}(ID-${newBuild.id}) успешно построен`,
          };
          appendLog(
            state,
            `${BUILDING_NAMES[type]}(ID-${newBuild.id}) По координатам: (x: ${newBuild.position.x}, y: ${newBuild.position.y}) успешно построен`,
            "success",
          );
        } else {
          const message = `Недостаточно денег для постройки "${BUILDING_NAMES[type]}"`;
          report = {
            success: false,
            message,
          };
          appendLog(state, message, "warning");
        }
      });
      return report;
    },
  })),
);
