import { create } from "zustand";
import { type WritableDraft } from "immer";
import {
  BuildingType,
  Gender,
  type GameState,
  type GameStore,
  type House,
  type LogType,
  type Main,
  type Position,
  type PlantPlace,
  ProfessionType,
  type Resident,
  ResourceType,
  type Result,
  VillagerStatus,
} from "../engine/Types.ts";
import { immer } from "zustand/middleware/immer";
import {
  BUILDING_CONFIG,
  EXPORT_RULES,
  generateRandomName,
  getMaxGardens,
  initialGameState,
  LEVEL_CONFIG,
  MOVE_COST_PER_TILE,
  PLANT_CONFIG,
  VILLAGER_CONFIG,
} from "../engine/Constants.ts";
import { processDayTime } from "./Processor.ts";
import { createBuilding } from "./BuildingFactory.ts";
import { getBuildingLimit } from "./BuildLimit.ts";
import { syncToStore, workerManager } from "./WorkerManager.ts";
import { BUILDING_NAMES } from "../engine/localization/locales.ts";

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
    pendingExportSourceId: null as string | null,

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
          economy: JSON.parse(JSON.stringify(state.gameState.economy)),
        });
      });
    },
    addBuilding: (type, pos, size?): Result => {
      let report: Result = { success: false, message: "" };
      set((state) => {
        const w = size?.width ?? BUILDING_CONFIG[type].width;
        const h = size?.length ?? BUILDING_CONFIG[type].length;
        const area = w * h;

        const isTiled =
          type === BuildingType.Garden ||
          type === BuildingType.Road ||
          type === BuildingType.Bridge;

        let cost = isTiled
          ? BUILDING_CONFIG[type].cost * area
          : BUILDING_CONFIG[type].cost;

        const countToAdd = isTiled ? area : 1;

        if (type === BuildingType.Garden) {
          const limit = getBuildingLimit(type, state.gameState.economy.level);
          const used = state.gameState.buildingCounts[type];
          if (used + area > limit) {
            report = {
              success: false,
              message: "Недостаточно места для грядки такого размера",
            };
            appendLog(
              state,
              `Превышен лимит грядок: необходимо ${area} клеток, доступно ${limit - used}`,
              "warning",
            );
            return;
          }
        } else if (
          getBuildingLimit(type, state.gameState.economy.level) <
            state.gameState.buildingCounts[type] + countToAdd &&
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

        if (cost > state.gameState.economy.money) {
          const message = `Недостаточно денег для постройки "${BUILDING_NAMES[type]}"`;
          report = { success: false, message };
          appendLog(state, message, "warning");
          return;
        }
        state.gameState.economy.money -= cost;

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

        state.gameState.buildingCounts[type] += countToAdd;
        state.gameState.buildingRemind[type] -= countToAdd;

        if (
          type === BuildingType.House &&
          state.gameState.buildingCounts[type] <= 2
        ) {
          const house = state.gameState.buildings[newBuild.id] as House;
          const spawnResident = (gender: Gender) => {
            const id = crypto.randomUUID();
            const { name, surname } = generateRandomName(gender);
            const resident: Resident = {
              id,
              name,
              surname,
              age: 20 + Math.floor(Math.random() * 10),
              gender,
              health: 100,
              hunger: 100,
              status: VillagerStatus.Idle,
              profession: { type: ProfessionType.Jobless },
              homeId: newBuild.id,
              workplaceId: null,
              inventory: { resources: {}, totalAmount: 0 },
              path: [],
              pathIndex: 0,
              stuckCounter: 0,
              position: {
                x: newBuild.position.x - 1,
                y: newBuild.position.y - 1,
              },
              parents: { parentFirst: "initial", parentSecond: "initial" },
              skills: {},
              workProgress: 0,
              taskContext: null,
            };
            state.gameState.residents[id] = resident;
            house.residentsId.push(id);
          };

          spawnResident(Gender.Male);
          spawnResident(Gender.Female);

          state.gameState.economy.totalPopulation += 2;
          workerManager.send("SET_RESIDENTS", {
            residents: JSON.parse(JSON.stringify(state.gameState.residents)),
          });
        }
        workerManager.send("UPDATE_BUILDING", { building: newBuild });
        report = {
          success: true,
          message: `${BUILDING_NAMES[type]}(ID-${newBuild.id}) успешно построен`,
        };
        appendLog(
          state,
          `${BUILDING_NAMES[type]}(ID-${newBuild.id}) По координатам: (x: ${newBuild.position.x}, y: ${newBuild.position.y}) успешно построен`,
          "success",
        );
      });
      return report;
    },
    giveProfession: (profession, resident): boolean => {
      let success = false;
      set((state) => {
        const r = state.gameState.residents[resident.id];
        if (!r) return;
        if (r.age < VILLAGER_CONFIG.minAgeForWork) {
          appendLog(
            state,
            `${r.name} ${r.surname} не достиг минимального возраста для работы`,
            "warning",
          );
          return;
        }
        success = true;
        if (r.status === VillagerStatus.Idle) {
          r.profession = profession;
        } else {
          r.pendingProfession = profession;
        }
        workerManager.send("SET_RESIDENTS", {
          residents: JSON.parse(JSON.stringify(state.gameState.residents)),
        });
      });
      return success;
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
    setPendingExportSource: (id: string | null) => {
      set((state) => {
        state.pendingExportSourceId = id;
      });
    },
    linkExportBuildings: (sourceId: string, targetId: string) => {
      set((state) => {
        const source = state.gameState.buildings[sourceId];
        const target = state.gameState.buildings[targetId];
        if (!source || !target) return;

        const allowedTargets = EXPORT_RULES[source.type];
        if (!allowedTargets || !allowedTargets.includes(target.type)) return;

        if (Array.isArray((source as any).export)) {
          if (!(source as any).export.includes(targetId)) {
            (source as any).export.push(targetId);
            workerManager.send("UPDATE_BUILDING", {
              building: JSON.parse(JSON.stringify(source)),
            });
          }
        }
      });
    },
    removeExportLink: (sourceId: string, targetId: string) => {
      set((state) => {
        const source = state.gameState.buildings[sourceId];
        if (!source || !Array.isArray((source as any).export)) return;

        (source as any).export = (source as any).export.filter(
          (id: string) => id !== targetId,
        );
        workerManager.send("UPDATE_BUILDING", {
          building: JSON.parse(JSON.stringify(source)),
        });
      });
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
              rightBuild.harvestType = plant;
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
              rightBuild.harvestType = plant;
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
    removeBuilding: (id: string): Result => {
      let report: Result = { success: false, message: "" };
      set((state) => {
        const building = state.gameState.buildings[id];
        if (!building) {
          report = { success: false, message: "Здание не найдено" };
          return;
        }

        if (building.type === BuildingType.Main) {
          report = { success: false, message: "Нельзя удалить главное здание" };
          appendLog(state, "Нельзя удалить главное здание", "warning");
          return;
        }

        if (building.type === BuildingType.Granary) {
          const granary = building as any;
          if (granary.storage && granary.storage.currentAmount > 0) {
            report = {
              success: false,
              message: "Нельзя удалить амбар с ресурсами",
            };
            appendLog(
              state,
              "Нельзя удалить амбар с ресурсами",
              "warning",
            );
            return;
          }
        }

        if (building.type === BuildingType.House) {
          const house = building as House;
          if (house.residentsId && house.residentsId.length > 0) {
            report = { success: false, message: "Нельзя удалить дом с жителями" };
            appendLog(state, "Нельзя удалить дом с жителями", "warning");
            return;
          }
        }

        if (
          building.type === BuildingType.Garden ||
          building.type === BuildingType.Greenhouse
        ) {
          const plantPlace = building as PlantPlace;
          if (plantPlace.assignedWorkerId) {
            const worker = state.gameState.residents[plantPlace.assignedWorkerId];
            if (worker && worker.profession.type === ProfessionType.Farmer) {
              worker.profession.assignedGardenIds = (
                worker.profession.assignedGardenIds || []
              ).filter((gId) => gId !== id);
            }
          }
        }

        const isTiled =
          building.type === BuildingType.Garden ||
          building.type === BuildingType.Road ||
          building.type === BuildingType.Bridge;

        let refund = BUILDING_CONFIG[building.type].cost;
        const area = building.width * building.length;
        if (isTiled) {
          refund *= area;
        }
        refund = Math.floor(refund * 0.5);

        state.gameState.economy.money += refund;

        const countToRemove = isTiled ? area : 1;
        state.gameState.buildingCounts[building.type] -= countToRemove;
        state.gameState.buildingRemind[building.type] += countToRemove;

        delete state.gameState.buildings[id];
        workerManager.send("REMOVE_BUILDING", { id });

        report = {
          success: true,
          message: `${BUILDING_NAMES[building.type]} удалён. Возврат: ${refund}`,
        };
        appendLog(
          state,
          `${BUILDING_NAMES[building.type]} удалён. Возврат: ${refund}`,
          "success",
        );
      });
      return report;
    },
    moveBuilding: (id: string, newPos: Position): Result => {
      let report: Result = { success: false, message: "" };
      set((state) => {
        const building = state.gameState.buildings[id];
        if (!building) {
          report = { success: false, message: "Здание не найдено" };
          return;
        }

        if (building.type === BuildingType.Main) {
          report = { success: false, message: "Нельзя переместить главное здание" };
          appendLog(state, "Нельзя переместить главное здание", "warning");
          return;
        }

        const dx = Math.abs(newPos.x - building.position.x);
        const dy = Math.abs(newPos.y - building.position.y);
        const distance = dx + dy;

        if (distance === 0) {
          report = { success: false, message: "Здание уже на этом месте" };
          return;
        }

        const w = building.width || 1;
        const h = building.length || 1;
        const area = w * h;

        const cost = Math.floor(MOVE_COST_PER_TILE * distance * area);

        if (cost > state.gameState.economy.money) {
          report = {
            success: false,
            message: `Недостаточно денег. Нужно: ${cost}`,
          };
          appendLog(
            state,
            `Недостаточно денег для перемещения здания. Нужно: ${cost}`,
            "warning",
          );
          return;
        }

        const existing = Object.values(state.gameState.buildings).filter(
          (b) => b.id !== id,
        );
        const overlap = existing.some((b: any) => {
          const ax1 = newPos.x;
          const ay1 = newPos.y;
          const ax2 = newPos.x + w - 1;
          const ay2 = newPos.y + h - 1;

          const bx1 = b.position.x;
          const by1 = b.position.y;
          const bx2 = b.position.x + (b.width || 1) - 1;
          const by2 = b.position.y + (b.length || 1) - 1;

          return !(ax2 < bx1 || ax1 > bx2 || ay2 < by1 || ay1 > by2);
        });

        if (overlap) {
          report = {
            success: false,
            message: "На новом месте есть другое здание",
          };
          appendLog(
            state,
            "На новом месте есть другое здание",
            "warning",
          );
          return;
        }

        state.gameState.economy.money -= cost;
        building.position = { ...newPos };

        workerManager.send("UPDATE_BUILDING", {
          building: JSON.parse(JSON.stringify(building)),
        });

        report = {
          success: true,
          message: `${BUILDING_NAMES[building.type]} перемещено. Потрачено: ${cost}`,
        };
        appendLog(
          state,
          `${BUILDING_NAMES[building.type]} перемещено на (${newPos.x}, ${newPos.y}). Потрачено: ${cost}`,
          "success",
        );
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
    upgradeLevel: (): Result => {
      let report: Result = { success: false, message: "" };
      set((state) => {
        const curLevel = state.gameState.economy.level;
        const config = LEVEL_CONFIG[curLevel];
        if (!config || config.upgradeCost.money === 0) {
          report = { success: false, message: "Максимальный уровень уже достигнут" };
          return;
        }

        
        if (state.gameState.economy.money < config.upgradeCost.money) {
          report = { success: false, message: "Недостаточно денег для улучшения" };
          return;
        }

        
        const mainBuilding = Object.values(state.gameState.buildings).find(
          (b) => b.type === BuildingType.Main,
        ) as Main;

        if (!mainBuilding) {
          report = { success: false, message: "Главное здание не найдено" };
          return;
        }

        const resourcesMet = Object.entries(config.upgradeCost.resources).every(
          ([res, needed]) => (mainBuilding.storage[res as ResourceType] ?? 0) >= (needed as number),
        );

        if (!resourcesMet) {
          report = { success: false, message: "Не все ресурсы доставлены в Ратушу" };
          return;
        }

        
        state.gameState.economy.money -= config.upgradeCost.money;
        mainBuilding.storage = {}; 
        state.gameState.economy.level += 1;

        
        const newLevel = state.gameState.economy.level;
        Object.values(BuildingType).forEach((type) => {
          const limit = getBuildingLimit(type, newLevel);
          const currentCount = state.gameState.buildingCounts[type] || 0;
          state.gameState.buildingRemind[type] = Math.max(0, limit - currentCount);
        });

        workerManager.send("UPDATE_BUILDING", {
          building: JSON.parse(JSON.stringify(mainBuilding)),
        });

        report = { success: true, message: `Поздравляем! Город достиг уровня ${curLevel + 1}` };
        appendLog(state, `Уровень города повышен до ${curLevel + 1}!`, "success");
      });
      return report;
    },
  })),
);
