import { create } from "zustand";
import { type WritableDraft } from "immer";
import {
  BuildingType,
  type GameState,
  type GameStore,
  type House,
  type LogType,
  ProfessionType,
  type Resident,
  type Result,
  VillagerStatus,
} from "../engine/Types.ts";
import { immer } from "zustand/middleware/immer";
import {
  BUILDING_CONFIG,
  BUILDING_NAMES,
  INITIAL_RESIDENTS,
  getMaxGardens,
  initialGameState,
  PLANT_CONFIG,
  VILLAGER_CONFIG,
} from "../engine/Constants.ts";
import { processDayTime } from "./Processor.ts";
import { createBuilding } from "./BuildingFactory.ts";
import { getBuildingLimit } from "./BuildLimit.ts";
import { syncToStore, workerManager } from "./WorkerManager.ts";

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
export const useGameStore = create<GameStore>()(
  immer((set) => ({
    gameState: initialGameState,

    applyWorkerUpdate: (payload) => {
      set((state) => {
        syncToStore(state, payload);
      });
    },
    tick: () => {
      set((state: GameStore) => {
        state.gameState.meta.gameTick++;
        processDayTime(state);

        const plantBuildings = Object.values(state.gameState.buildings).filter(
          (b) =>
            b.type === BuildingType.Garden ||
            b.type === BuildingType.Greenhouse,
        );
        workerManager.send("TICK", {
          tick: state.gameState.meta.gameTick,
          isNight: state.gameState.meta.isNight,
          weather: state.gameState.meta.currentWeather,
          season: state.gameState.meta.currentSeason,
          plantBuildings: JSON.parse(JSON.stringify(plantBuildings)),
        });
      });
    },
    addBuilding: (type, pos, size?): Result => {
      let report: Result = { success: false, message: "" };
      set((state) => {
        let cost = BUILDING_CONFIG[type].cost;
        if (type === BuildingType.Garden && size) {
          cost *= size.width * size.length;
        }

        if (cost <= state.gameState.economy.money) {
          state.gameState.economy.money -= cost;
          if (
            getBuildingLimit(type, state.gameState.economy.level) <=
              state.gameState.buildingCounts[type] &&
            type != BuildingType.Main
          ) {
            report = {
              success: false,
              message:
                "Текущий уровень не позволяет поставить больше зданий этого типа",
            };
            appendLog(
              state,
              `Уровень не позволяет поставить больше зданий типа ${type}`,
              "warning",
            );
            return;
          }
          const newBuild = createBuilding(type, pos, size);
          if (type === BuildingType.Graveyard) {
            state.gameState.meta.graveyardIds.push(newBuild.id);
          }
          if (
            type === BuildingType.Main &&
            getBuildingLimit(type, state.gameState.economy.level) <=
              state.gameState.buildingCounts[type]
          ) {
            report = {
              success: false,
              message: "Главное здание уже существует",
            };
            appendLog(state, "Главное здание уже существует", "warning");
            return;
          }
          state.gameState.buildings[newBuild.id] = newBuild;
          state.gameState.buildingCounts[type] += 1;
          if (
            type === BuildingType.House &&
            state.gameState.buildingCounts[type] === 1
          ) {
            state.gameState.residents = INITIAL_RESIDENTS;
            Object.values(state.gameState.residents).forEach((res) => {
              res.homeId = newBuild.id;
              const home = state.gameState.buildings[newBuild.id] as House;
              res.position = { x: home.position.x - 1, y: home.position.y - 1 };
              home.residentsId.push(res.id);
            });

            state.gameState.economy.totalPopulation += 2;
            workerManager.send("SET_RESIDENTS", {
              residents: state.gameState.residents,
            });
          }
          workerManager.send("UPDATE_BUILDING", { building: newBuild });
          state.gameState.buildingRemind[type] -= 1;
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
    giveProfession: (profession, resident): void => {
      set((state) => {
        if (resident.age < VILLAGER_CONFIG.minAgeForWork) {
          appendLog(
            state,
            `${resident.name} ${resident.surname} не достиг минимального возраста для работы`,
            "warning",
          );
          return;
        }
        if (resident.status !== VillagerStatus.Idle) {
          appendLog(
            state,
            `${resident.name} ${resident.surname} занят другим делом`,
            "warning",
          );
          return;
        }
        resident.profession = profession;
        workerManager.send("SET_RESIDENTS", {
          residents: state.gameState.residents,
        });
      });
    },
    assignGardenToFarmer: (resident, selectedPlantPlace): void => {
      set((state) => {
        if (selectedPlantPlace.assignedWorkerId) {
          appendLog(state, "На этом месте уже есть работник", "warning");
          return;
        }
        if (
          !(
            resident.profession &&
            resident.profession.type === ProfessionType.Farmer
          )
        ) {
          appendLog(state, "Необходимо, чтоб житель был фермером", "warning");
          return;
        }
        if (
          resident.profession.assignedGardenIds?.includes(selectedPlantPlace.id)
        ) {
          appendLog(
            state,
            "Этот работник уже привязан к этому месту",
            "warning",
          );
          return;
        }
        const maxGardens = getMaxGardens(
          ProfessionType.Farmer,
          resident.profession.level,
        );
        if (
          (resident.profession.assignedGardenIds?.length ?? 0) >= maxGardens
        ) {
          appendLog(
            state,
            `У фермера максимум ${maxGardens} грядок (уровень ${resident.profession.level})`,
            "warning",
          );
          return;
        }
        if (!resident.profession.assignedGardenIds) {
          resident.profession.assignedGardenIds = [];
        }
        resident.profession.assignedGardenIds.push(selectedPlantPlace.id);
        selectedPlantPlace.assignedWorkerId = resident.id;

        workerManager.send("SET_RESIDENTS", {
          residents: JSON.parse(JSON.stringify(state.gameState.residents)),
        });
        workerManager.send("UPDATE_BUILDING", {
          building: JSON.parse(JSON.stringify(selectedPlantPlace)),
        });
      });
    },
    getResidents: (): Record<string, Resident> => {
      return useGameStore.getState().gameState.residents;
    },
    loadState: (gameState: GameState) => {
      set((state) => {
        state.gameState = gameState;
      });
    },

    addPlant: (build, plant): Result => {
      let report: Result = { success: false, message: "" };
      set((state) => {
        const rightBuild = state.gameState.buildings[build.id];
        if (rightBuild) {
          switch (rightBuild.type) {
            case BuildingType.Garden:
              rightBuild.harvest = {
                isReady: false,
                type: plant,
                growthProgress: 0,
              };
              report = {
                success: true,
                message: `${PLANT_CONFIG[plant].name} успешно посажен`,
              };
              appendLog(
                state,
                `${PLANT_CONFIG[plant].name} успешно посажен`,
                "success",
              );
              workerManager.send("UPDATE_BUILDING", {
                building: JSON.parse(JSON.stringify(rightBuild)),
              });
              break;
            case BuildingType.Greenhouse:
              rightBuild.harvest = {
                growthProgress: 0,
                isReady: false,
                type: plant,
              };
              report = {
                success: true,
                message: `${PLANT_CONFIG[plant].name} успешно посажен`,
              };
              appendLog(
                state,
                `${PLANT_CONFIG[plant].name} успешно посажен`,
                "success",
              );
              workerManager.send("UPDATE_BUILDING", {
                building: JSON.parse(JSON.stringify(rightBuild)),
              });
              break;
            default:
              report = {
                success: false,
                message: `Невозможно посадить растение на ${BUILDING_NAMES[build.type]}`,
              };
              appendLog(
                state,
                `Невозможно посадить растение на ${BUILDING_NAMES[build.type]}`,
                "warning",
              );
              break;
          }
        }
      });
      return report;
    },
    setGranaryResourceType: (granaryId, resourceType) => {
      set((state) => {
        const granary = state.gameState.buildings[granaryId];
        if (granary && granary.type === BuildingType.Granary) {
          (granary as any).resourceType = resourceType;
          workerManager.send("UPDATE_BUILDING", {
            building: JSON.parse(JSON.stringify(granary)),
          });
        }
      });
    },
  })),
);
