import type { GameState } from "../engine/Types";
import { WorldMap } from "../engine/WorldMap";

interface SaveFile {
  version: string;
  timestamp: number;
  gameState: GameState;
  worldData: string;
}

const PENDING_KEY = "tsufarm_pending_save";

export function saveGame(gameState: GameState, world: WorldMap): void {
  const data: SaveFile = {
    version: "0.0.1",
    timestamp: Date.now(),
    gameState,
    worldData: world.serialize(),
  };

  const blob = new Blob([JSON.stringify(data)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tsufarm_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function loadGameFromFile(file: File): Promise<SaveFile | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data && data.worldData && data.gameState) {
          resolve(data as SaveFile);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

export function applySave(save: SaveFile): {
  gameState: GameState;
  world: WorldMap;
} {
  const world = WorldMap.deserialize(save.worldData);
  return { gameState: save.gameState, world };
}

export function setPendingLoad(save: SaveFile | null): void {
  if (save) {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(save));
  } else {
    sessionStorage.removeItem(PENDING_KEY);
  }
}

export function getPendingLoad(): SaveFile | null {
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_KEY);
  return JSON.parse(raw) as SaveFile;
}
