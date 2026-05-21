import { useEffect, useState } from "react";
import { WorldMap } from "../../engine/WorldMap.ts";
import {
  BUILDING_SVG,
  CHARACTERS_SVG,
  TILE_SVG,
} from "../../engine/Constants.ts";
import {
  applySave,
  getPendingLoad,
  saveGame,
} from "../../Store/SaveManager.ts";
import { useGameStore } from "../../Store/GameStore.ts";
import MapCanvas from "../../components/game/MapCanvas.tsx";
import InfoPanel from "../../components/UI/InfoPanel/InfoPanel.tsx";
import LeftPanel from "../../components/UI/LeftPanel/LeftPanel.tsx";
import { BuildSelectionProvider } from "../../contexts/BuildSelectionContext";
import { PopupProvider } from "../../contexts/PopupContext";
import styles from "./GameView.module.css";

const LOADING_STAGES = [
  "Подготовка мира...",
  "Загрузка текстур...",
  "Отрисовка карты...",
];

export default function GameView() {
  const [world, setWorld] = useState<WorldMap>();
  const [stage, setStage] = useState(0);
  const [ready, setReady] = useState(false);
  const [tileTextures, setTileTextures] =
    useState<Record<number, HTMLImageElement>>();
  const [buildingTextures, setBuildingTextures] =
    useState<Record<string, HTMLImageElement>>();
  const [residentTextures, setResidentTextures] =
    useState<Record<string, HTMLImageElement>>();
  const [mapRendered, setMapRendered] = useState(false);
  const [loadedFromSave, setLoadedFromSave] = useState(false);

  const isLoading = !ready || !mapRendered;

  useEffect(() => {
    const gameLoop = setInterval(() => {
      useGameStore.getState().tick();
      console.log(
        `тик номер ${useGameStore.getState().gameState.meta.gameTick}`,
      );
      console.log(useGameStore.getState().gameState.residents);
    }, 100);

    return () => clearInterval(gameLoop);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStage(0);
      await new Promise((r) => setTimeout(r, 0));
      if (cancelled) return;

      const saved = getPendingLoad();

      if (saved) {
        const { world: loadedWorld, gameState } = applySave(saved);
        setWorld(loadedWorld);
        useGameStore.getState().loadState(gameState);
        setLoadedFromSave(true);
      } else {
        const w = new WorldMap();
        w.generate();
        if (cancelled) return;
        setWorld(w);
      }

      setStage(1);
      const tileTex: Record<number, HTMLImageElement> = {};
      const tileTypes = Object.keys(TILE_SVG).map(Number);
      await Promise.all(
        tileTypes.map(
          (type) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.src = TILE_SVG[type as keyof typeof TILE_SVG];
              img.onload = () => {
                tileTex[type] = img;
                resolve();
              };
              img.onerror = () => resolve();
            }),
        ),
      );
      if (cancelled) return;

      const buildingTex: Record<string, HTMLImageElement> = {};
      await Promise.all(
        Object.entries(BUILDING_SVG).map(
          ([key, url]) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.src = url;
              img.onload = () => {
                buildingTex[key] = img;
                resolve();
              };
              img.onerror = () => resolve();
            }),
        ),
      );
      if (cancelled) return;

      const residentTex: Record<string, HTMLImageElement> = {};
      await Promise.all(
        Object.entries(CHARACTERS_SVG).map(
          ([key, url]) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.src = url;
              img.onload = () => {
                residentTex[key] = img;
                resolve();
              };
              img.onerror = () => resolve();
            }),
        ),
      );
      if (cancelled) return;

      setTileTextures(tileTex);
      setBuildingTextures(buildingTex);
      setResidentTextures(residentTex);
      setReady(true);
      setStage(2);
    };

    const id = setTimeout(load, 50);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return (
    <>
      <BuildSelectionProvider>
        <PopupProvider>
          <div className={styles.container}>
            {ready && (
              <MapCanvas
                world={world}
                tileTextures={tileTextures}
                buildingTextures={buildingTextures}
                residentTextures={residentTextures}
                onMapReady={() => setMapRendered(true)}
                centerCamera={loadedFromSave}
              />
            )}
            {ready && <InfoPanel />}
            {ready && <LeftPanel />}
          </div>
        </PopupProvider>
      </BuildSelectionProvider>

      <button
        onClick={() => {
          if (world) {
            saveGame(useGameStore.getState().gameState, world);
          }
        }}
        className={styles.saveBtn}
      >
        Сохранить
      </button>

      {isLoading && (
        <div className={styles.loadingOverlay}>
          <p className={styles.loadingTitle}>TSUFarm</p>

          <progress
            className={styles.progress}
            value={stage}
            max={LOADING_STAGES.length}
          />

          <p className={styles.loadingStage}>{LOADING_STAGES[stage]}</p>
        </div>
      )}
    </>
  );
}
