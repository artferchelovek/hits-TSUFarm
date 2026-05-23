import CitizenWorker from "./CitizenWorker.ts";
import type { UItoWorkerMessage, WorkerToUIMessage } from "./message.ts";

let worker: CitizenWorker | null = null;

const getWorker = () => {
  if (!worker) {
    worker = new CitizenWorker();
  }
  return worker;
};

self.onmessage = (e: MessageEvent<UItoWorkerMessage>) => {
  const { type, payload } = e.data;
  const cw = getWorker();

  switch (type) {
    case "INIT_WORLD": {
      const { grid, buildings, width, height } = payload;
      cw.init(grid, buildings, width, height);
      const response: WorkerToUIMessage = {
        type: "INIT_DONE",
      };
      self.postMessage(response);
      break;
    }

    case "SET_RESIDENTS": {
      cw.setResidents(payload.residents);
      const response: WorkerToUIMessage = {
        type: "SET_RESIDENTS_SUCCESS",
      };
      self.postMessage(response);
      break;
    }

    case "TICK": {
      const result = cw.tick(payload);
      const response: WorkerToUIMessage = {
        type: "TICK_DONE",
        payload: result,
      };

      self.postMessage(response);
      break;
    }

    case "UPDATE_BUILDING": {
      const { building } = payload;
      cw.updateBuilding(building);
      const response: WorkerToUIMessage = {
        type: "UPDATE_BUILDING_SUCCESS",
      };
      self.postMessage(response);
      break;
    }

    case "REMOVE_BUILDING": {
      cw.removeBuilding(payload.id);
      break;
    }
  }
};
