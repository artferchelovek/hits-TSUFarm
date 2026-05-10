import { useEffect, useState } from "react";
import { WorldMap } from "../engine/WorldMap.ts";
import { BUILDING_SVG, TILE_SVG } from "../engine/Constants.ts";
import MapCanvas from "../components/game/MapCanvas.tsx";
import InfoPanel from "../components/UI/InfoPanel/InfoPanel.tsx";
import LeftPanel from "../components/UI/LeftPanel/LeftPanel.tsx";
import { BuildSelectionProvider } from "../contexts/BuildSelectionContext";
import { PopupProvider } from "../contexts/PopupContext";

const LOADING_STAGES = [
  "Генерация ландшафта...",
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
  const [mapRendered, setMapRendered] = useState(false);

  const isLoading = !ready || !mapRendered;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStage(0);
      await new Promise((r) => setTimeout(r, 0));
      if (cancelled) return;

      const w = new WorldMap();
      w.generate();
      if (cancelled) return;
      setWorld(w);

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

      setTileTextures(tileTex);
      setBuildingTextures(buildingTex);
      setReady(true);
      setStage(2);
    };

    const id = setTimeout(load, 50);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, []);

  return (
    <>
      <BuildSelectionProvider>
        <PopupProvider>
          <div
            style={{
              position: "relative",
              width: "100vw",
              height: "100vh",
              overflow: "hidden",
            }}
          >
            {ready && (
              <MapCanvas
                world={world}
                tileTextures={tileTextures}
                buildingTextures={buildingTextures}
                onMapReady={() => setMapRendered(true)}
              />
            )}
            {ready && <InfoPanel />}
            {ready && <LeftPanel />}
          </div>
        </PopupProvider>
      </BuildSelectionProvider>

      {isLoading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#1a1a2e",
            color: "#e6f0ff",
            fontFamily: "'Press Start 2P', system-ui, monospace",
            gap: 24,
          }}
        >
          <style>{`
            progress {
              appearance: none;
              -webkit-appearance: none;
              width: 300px;
              height: 20px;
              border: 2px solid #dcbb9a;
              border-radius: 4px;
              background: #2e2c2c;
            }
            progress::-webkit-progress-bar {
              background: #2e2c2c;
              border-radius: 4px;
            }
            progress::-webkit-progress-value {
              background: #dcbb9a;
              border-radius: 2px;
            }
            progress::-moz-progress-bar {
              background: #dcbb9a;
              border-radius: 2px;
            }
          `}</style>

          <p style={{ fontSize: 28, color: "honeydew" }}>TSUFarm</p>

          <progress value={stage} max={LOADING_STAGES.length} />

          <p style={{ fontSize: 12, color: "#dcbb9a" }}>
            {LOADING_STAGES[stage]}
          </p>
        </div>
      )}
    </>
  );
}
