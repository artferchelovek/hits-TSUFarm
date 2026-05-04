import MapCanvas from "../components/game/MapCanvas.tsx";
import InfoPanel from "../components/UI/InfoPanel/InfoPanel.tsx";
import LeftPanel from "../components/UI/LeftPanel/LeftPanel.tsx";
import { BuildSelectionProvider } from "../contexts/BuildSelectionContext";
import { PopupProvider } from "../contexts/PopupContext";

export default function GameView() {
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
