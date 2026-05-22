import { useEffect, useState, useCallback, useRef } from "react";
import { WorldMap } from "../../engine/WorldMap.ts";
import {
  BUILDING_SVG,
  CHARACTERS_SVG,
  TILE_SVG,
} from "../../engine/Constants.ts";
import {
  applySave,
  getPendingLoad,
  saveToCloud,
  saveUnloadSave,
  getUnloadSave,
  clearUnloadSave,
} from "../../Store/SaveManager.ts";
import { getToken } from "../../api/client.ts";
import { useGameStore } from "../../Store/GameStore.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";
import MapCanvas from "../../components/game/MapCanvas.tsx";
import RightPanel from "../../components/UI/RightPanel/RightPanel.tsx";
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
  const [showSavePicker, setShowSavePicker] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const worldRef = useRef<WorldMap>();
  const { isAuthenticated } = useAuth();

  const isLoading = !ready || !mapRendered;

  useEffect(() => {
    worldRef.current = world;
  }, [world]);

  useEffect(() => {
    let lastAutoSaveSlot = 0;

    const gameLoop = setInterval(() => {
      const prevTick = useGameStore.getState().gameState.meta.gameTick;
      useGameStore.getState().tick();
      const tick = useGameStore.getState().gameState.meta.gameTick;
      const dayDuration = useGameStore.getState().gameState.meta.dayDuration;

      console.log(`тик номер ${tick}`);
      console.log(useGameStore.getState().gameState.residents);

      const prevDay = Math.floor(prevTick / dayDuration);
      const currDay = Math.floor(tick / dayDuration);

      if (currDay > prevDay && getToken()) {
        const gs = useGameStore.getState().gameState;
        const w = worldRef.current;
        if (w) {
          const slot = lastAutoSaveSlot > 0 ? lastAutoSaveSlot : 1;
          saveToCloud(slot, gs, w).catch(() => {});
          lastAutoSaveSlot = slot;
        }
      }
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
        clearUnloadSave();
      } else {
        const unloadSave = getUnloadSave();
        if (unloadSave) {
          const { world: loadedWorld, gameState } = applySave(unloadSave);
          setWorld(loadedWorld);
          useGameStore.getState().loadState(gameState);
          setLoadedFromSave(true);
          clearUnloadSave();
        } else {
          const w = new WorldMap();
          w.generate();
          if (cancelled) return;
          setWorld(w);

          const farmName = sessionStorage.getItem("tsufarm_farm_name");
          if (farmName) {
            useGameStore.setState((s) => {
              s.gameState.meta.farmName = farmName;
            });
            sessionStorage.removeItem("tsufarm_farm_name");
          }
        }
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
    const handler = () => {
      if (document.visibilityState !== "hidden") return;
      const gs = useGameStore.getState().gameState;
      const w = worldRef.current;
      if (w) {
        saveUnloadSave(gs, w);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const handleCloudSave = useCallback(
    async (slot: number) => {
      if (!world) return;
      setSaveMessage("");
      try {
        const gameState = useGameStore.getState().gameState;
        await saveToCloud(slot, gameState, world);
        setSaveMessage(`Сохранено в слот ${slot}`);
        setTimeout(() => setSaveMessage(""), 3000);
      } catch {
        setSaveMessage("Ошибка сохранения");
        setTimeout(() => setSaveMessage(""), 3000);
      }
      setShowSavePicker(false);
    },
    [world],
  );

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
            {ready && <RightPanel world={world} />}
            {ready && <LeftPanel />}
          </div>
        </PopupProvider>
      </BuildSelectionProvider>

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

      {ready && isAuthenticated && (
        <div className={styles.cloudSaveArea}>
          <button
            className={styles.cloudSaveBtn}
            onClick={() => setShowSavePicker((v) => !v)}
            title="Сохранить в облако"
          >
            ☁
          </button>

          {showSavePicker && (
            <div className={styles.savePicker}>
              <div className={styles.savePickerTitle}>Сохранить в слот</div>
              {[1, 2, 3, 4, 5].map((slot) => (
                <button
                  key={slot}
                  className={styles.saveSlotBtn}
                  onClick={() => handleCloudSave(slot)}
                >
                  Слот {slot}
                </button>
              ))}
            </div>
          )}

          {saveMessage && (
            <div className={styles.saveMessage}>{saveMessage}</div>
          )}
        </div>
      )}
    </>
  );
}
