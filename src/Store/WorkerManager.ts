import type { UItoWorkerMessage, WorkerToUIMessage } from "../engine/CitizenWorker/message.ts";
import type { GameStore } from "../engine/Types.ts";
import type { WritableDraft } from "immer";

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
    const { residents, deadIds, plants, logs } = payload.payload;

    Object.assign(state.gameState.residents, residents);

    deadIds.forEach((id) => {
      delete state.gameState.residents[id];
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
  }
};