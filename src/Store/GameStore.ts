import { create } from "zustand";
import { type WritableDraft } from "immer";
import {
  BuildingType,
  type GameStore,
  type Graveyard,
  type LogType,
  type Result,
} from "../engine/Types.ts";
import { immer } from "zustand/middleware/immer";
import {
  BUILDING_CONFIG,
  BUILDING_NAMES,
  VILLAGER_CONFIG,
} from "../engine/Constants.ts";
import {
  processPlantGrowth,
  processResident,
  processWell,
} from "./Processor.ts";
import { createBuilding } from "./BuildingFactory.ts";

const appendLog = (
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
export const useGameStore = create<GameStore>()(
  immer((set) => ({
    gameState: {
      meta: {
        version: "0.0.1",
        lastSaved: 0,
        gameTick: 0,
        graveyardIds: [],
      },
      economy: {
        money: 1000,
        totalPopulation: 2,
      },
      buildings: {},
      residents: {},
      logs: [],
    },

    tick: () => {
      set((state: GameStore) => {
        state.gameState.meta.gameTick++;

        Object.values(state.gameState.buildings).forEach((building) => {
          if (
            building.type === BuildingType.Greenhouse ||
            building.type === BuildingType.Garden
          ) {
            processPlantGrowth(building);
          }
          if (building.type === BuildingType.Well) {
            processWell(building);
          }
        });

        Object.values(state.gameState.residents).forEach((person) => {
          processResident(person);

          const deathChance =
            (person.age / 100) * VILLAGER_CONFIG.baseDeathChance;
          if (Math.random() < deathChance) {
            person.health = 0;
          }

          if (person.health <= 0) {
            if (person.homeId) {
              const home = state.gameState.buildings[person.homeId];
              if (home && "residentsId" in home) {
                home.residentsId = home.residentsId.filter(
                  (id: string) => id !== person.id,
                );
              }
            }
            appendLog(
              state,
              `Житель ${person.name} скончался в возрасте ${Math.floor(person.age)} лет`,
              "info",
            );
            if (person.workplaceId) {
              const workplace = state.gameState.buildings[person.workplaceId];
              if (
                workplace.type === BuildingType.Greenhouse ||
                workplace.type === BuildingType.Garden
              ) {
                if (workplace.assignedWorkerId) {
                  workplace.assignedWorkerId =
                    workplace.assignedWorkerId.filter(
                      (id: string) => id !== person.id,
                    );
                }
              }
            }
            delete state.gameState.residents[person.id];
            state.gameState.economy.totalPopulation--;

            const graveyardId = state.gameState.meta.graveyardIds.find((id) => {
              const b = state.gameState.buildings[id] as Graveyard;
              return b && b.decedents.length < b.maxCapacity;
            });

            if (graveyardId) {
              const graveyard = state.gameState.buildings[
                graveyardId
              ] as Graveyard;
              graveyard.decedents.push({
                id: person.id,
                name: person.name,
                ageAtDeath: person.age,
              });
            } else {
              appendLog(state, "Нет места для захоронения", "warning");
            }
          }
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
