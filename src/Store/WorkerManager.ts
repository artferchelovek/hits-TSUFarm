import type {
  UItoWorkerMessage,
  WorkerToUIMessage,
} from "../engine/CitizenWorker/message.ts";
import {
  BuildingType,
  type GameStore,
  Gender,
  type House,
  ProfessionType,
  type Resident,
  VillagerStatus,
} from "../engine/Types.ts";
import type { WritableDraft } from "immer";
import {
  BUILDING_CONFIG,
  REPRODUCTION,
  generateRandomName,
} from "../engine/Constants.ts";
import { appendLog } from "./GameStore.ts";

type MessageHandler = (payload: WorkerToUIMessage) => void;

class WorkerManager {
  private worker: Worker | null = null;
  private messageHandler: MessageHandler | null = null;

  init(handler: MessageHandler) {
    this.messageHandler = handler;
    this.worker = new Worker(
      new URL("../engine/CitizenWorker/citizen.worker.ts", import.meta.url),
      { type: "module" },
    );

    this.worker.onmessage = (e: MessageEvent<WorkerToUIMessage>) => {
      this.messageHandler?.(e.data);
    };
  }

  send<T extends UItoWorkerMessage>(type: T["type"], payload: T["payload"]) {
    this.worker?.postMessage({ type, payload } as UItoWorkerMessage);
  }

  async sendAndWait<T extends UItoWorkerMessage>(
    type: T["type"],
    payload: T["payload"],
    responseType: string,
  ): Promise<WorkerToUIMessage | null> {
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve(null);
        return;
      }
      const handler = (e: MessageEvent<WorkerToUIMessage>) => {
        if (e.data.type === responseType) {
          this.worker?.removeEventListener("message", handler);
          resolve(e.data);
        }
      };
      this.worker.addEventListener("message", handler);
      this.worker.postMessage({ type, payload } as UItoWorkerMessage);
    });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.messageHandler = null;
  }

  isReady(): boolean {
    return this.worker !== null;
  }
}

export const workerManager = new WorkerManager();

export const syncToStore = (
  state: WritableDraft<GameStore>,
  payload: WorkerToUIMessage,
) => {
  if (payload.type === "TICK_DONE" && payload.payload) {
    const { residents, deadIds, plants, buildings, logs } = payload.payload;

    Object.assign(state.gameState.residents, residents);
    Object.assign(state.gameState.buildings, buildings);

    deadIds.forEach((id) => {
      delete state.gameState.residents[id];
      state.gameState.economy.totalPopulation -= 1;
    });
    plants.forEach((plant) => {
      state.gameState.buildings[plant.id] = plant;
    });

    logs.forEach((log) => {
      state.gameState.logs.push(log);
      if (state.gameState.logs.length > 50) {
        state.gameState.logs.shift();
      }
    });
    if (payload.payload.births?.length != 0) {
      const births = payload.payload.births ?? [];
      births.forEach((birth) => {
        const parentFirst = state.gameState.residents[birth.parentFirst];
        const parentSecond = state.gameState.residents[birth.parentSecond];
        const home = Object.values(state.gameState.buildings)

          .find((build) => build.id === parentFirst.homeId);
        if (home?.type === BuildingType.House) {
          const gender = Math.random() > 0.5 ? Gender.Male : Gender.Female;
          const baby: Resident = {
            id: crypto.randomUUID(),
            name: generateRandomName(gender).name,
            surname:
              parentFirst.surname + (gender === Gender.Female ? "а" : ""),
            age: 0,
            parents: {
              parentFirst: parentFirst.id,
              parentSecond: parentSecond.id,
            },
            gender: gender,
            position: parentFirst.position,
            health: 100,
            hunger: 100,
            status: VillagerStatus.Idle,
            homeId: parentFirst.homeId,
            workplaceId: null,
            inventory: { resources: {}, totalAmount: 0 },
            path: [],
            pathIndex: 0,
            profession: { type: ProfessionType.Jobless },
            skills: {},
            workProgress: 0,
            targetId: null,
          };
          if (
            home.residentsId.length >=
            BUILDING_CONFIG[BuildingType.House].capacity
          ) {
            const evictCandidate = home.residentsId
              .map((id) => state.gameState.residents[id])
              .find(
                (r) =>
                  r.id !== parentFirst.id &&
                  r.id !== parentSecond.id &&
                  r.age >= REPRODUCTION.MIN_FERTILITY_AGE,
              );

            if (evictCandidate) {
              const freeHouse = Object.values(state.gameState.buildings).find(
                (b) =>
                  b.type === BuildingType.House &&
                  b.id !== home.id &&
                  (b as House).residentsId.length <
                    BUILDING_CONFIG[BuildingType.House].capacity,
              ) as House | undefined;

              if (freeHouse) {
                freeHouse.residentsId.push(evictCandidate.id);
                evictCandidate.homeId = freeHouse.id;
                evictCandidate.position = {
                  x: freeHouse.position.x - 1,
                  y: freeHouse.position.y - 1,
                };
                home.residentsId = home.residentsId.filter(
                  (id) => id !== evictCandidate.id,
                );
                appendLog(
                  state,
                  `${evictCandidate.name} ${evictCandidate.surname} переехал в новый дом`,
                  "info",
                );
              } else {
                evictCandidate.homeId = null;
                home.residentsId = home.residentsId.filter(
                  (id) => id !== evictCandidate.id,
                );
                appendLog(
                  state,
                  `${evictCandidate.name} ${evictCandidate.surname} стал бездомным!`,
                  "warning",
                );
              }
            }
          }

          if (
            home.residentsId.length <
            BUILDING_CONFIG[BuildingType.House].capacity
          ) {
            state.gameState.residents[baby.id] = baby;
            state.gameState.economy.totalPopulation += 1;
            home.residentsId.push(baby.id);
            appendLog(
              state,
              `Родился новый житель - ${baby.name} ${baby.surname}`,
              "info",
            );
            workerManager.send("SET_RESIDENTS", {
              residents: JSON.parse(JSON.stringify(state.gameState.residents)),
            });
            workerManager.send("UPDATE_BUILDING", {
              building: JSON.parse(JSON.stringify(home)),
            });
          }
        }
      });
    }
  }
};
