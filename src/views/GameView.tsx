import MapCanvas from "../components/game/MapCanvas.tsx";
import InfoPanel from "../components/UI/InfoPanel/InfoPanel.tsx";
import LeftPanel from "../components/UI/LeftPanel/LeftPanel.tsx";
import { BuildSelectionProvider } from "../contexts/BuildSelectionContext";
import { PopupProvider } from "../contexts/PopupContext";
import { useEffect } from "react";
import { useGameStore } from "../Store/GameStore.ts";

export default function GameView() {
  useEffect(() => {
    const gameLoop = setInterval(() => {
      useGameStore.getState().tick();
      console.log(
        `тик номер ${useGameStore.getState().gameState.meta.gameTick}`,
      );
    }, 1000);

    return () => clearInterval(gameLoop);
  }, []);
  return (
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
          <MapCanvas />
          <InfoPanel />
          <LeftPanel />
        </div>
      </PopupProvider>
    </BuildSelectionProvider>
  );
}
