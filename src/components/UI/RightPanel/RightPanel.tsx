import { useState, useCallback } from "react";
import InfoPanel from "../InfoPanel/InfoPanel.tsx";
import ToolBar from "../ToolBar/ToolBar.tsx";
import styles from "./RightPanel.module.css";
import { useGameStore } from "../../../Store/GameStore.ts";
import { saveGame, saveToCloud } from "../../../Store/SaveManager.ts";
import { useAuth } from "../../../contexts/AuthContext.tsx";
import type { WorldMap } from "../../../engine/WorldMap.ts";

export default function RightPanel({ world }: { world?: WorldMap }) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMsg, setPickerMsg] = useState("");
  const { isAuthenticated } = useAuth();

  const handleLocalSave = useCallback(() => {
    if (!world) return;
    const gs = useGameStore.getState().gameState;
    saveGame(gs, world);
    setPickerMsg("💾");
    setTimeout(() => setPickerMsg(""), 1500);
    setShowPicker(false);
  }, [world]);

  const handleCloudSave = useCallback(
    async (slot: number) => {
      if (!world) return;
      setPickerMsg("");
      try {
        const gs = useGameStore.getState().gameState;
        await saveToCloud(slot, gs, world);
        setPickerMsg(`☁ Слот ${slot}`);
        setTimeout(() => setPickerMsg(""), 2500);
      } catch {
        setPickerMsg("☁ Ошибка");
        setTimeout(() => setPickerMsg(""), 2500);
      }
      setShowPicker(false);
    },
    [world],
  );

  return (
    <div className={styles.rightPanel}>
      <div className={styles.rightPanel__header}>
        <ToolBar />
        <div className={styles.saveButtons}>
          <div className={styles.cloudBtnWrap}>
            <button
              onClick={() => {
                if (world) setShowPicker((v) => !v);
              }}
              className={styles.iconButton}
              title="Сохранить"
            >
              <span className="material-symbols-outlined">save</span>
            </button>

            {showPicker && (
              <div className={styles.cloudPicker}>
                <button
                  className={styles.cloudSlotBtn}
                  onClick={handleLocalSave}
                >
                  💾 Локально
                </button>
                {isAuthenticated && (
                  <>
                    <div className={styles.pickerDivider} />
                    {[1, 2, 3, 4, 5].map((slot) => (
                      <button
                        key={slot}
                        className={styles.cloudSlotBtn}
                        onClick={() => handleCloudSave(slot)}
                      >
                        ☁ Слот {slot}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {pickerMsg && <span className={styles.cloudMsg}>{pickerMsg}</span>}
        </div>
      </div>
      <InfoPanel />
    </div>
  );
}
