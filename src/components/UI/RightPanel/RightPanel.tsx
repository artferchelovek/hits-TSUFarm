import InfoPanel from "../InfoPanel/InfoPanel.tsx";
import ToolBar from "../ToolBar/ToolBar.tsx";
import styles from "./RightPanel.module.css";
import { useGameStore } from "../../../Store/GameStore.ts";
import { saveGame } from "../../../Store/SaveManager.ts";
import { WorldMap } from "../../../engine/WorldMap.ts";

export default function RightPanel({ world }: { world?: WorldMap }) {
  return (
    <div className={styles.rightPanel}>
      <div className={styles.rightPanel__header}>
        <ToolBar />
        <button
          onClick={() => {
            if (world) {
              saveGame(useGameStore.getState().gameState, world);
            }
          }}
          className={styles.iconButton}
          title="Сохранить игру"
        >
          <span className="material-symbols-outlined">save</span>
        </button>
      </div>
      <InfoPanel />
    </div>
  );
}
