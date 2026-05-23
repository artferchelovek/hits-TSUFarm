import styles from "../InfoBox.module.css";
import type { Main } from "../../../../engine/Types.ts";
import { ResourceType } from "../../../../engine/Types.ts";
import ProgressBlock from "../ProgressBlock.tsx";
import SizeBlock from "../SizeBlock.tsx";
import { useGameStore } from "../../../../Store/GameStore.ts";
import {
  LEVEL_CONFIG,
  RESOURCE_DISPLAY_NAMES,
} from "../../../../engine/Constants.ts";
import { usePopup } from "../../../../contexts/PopupContext.tsx";

export default function MainInfo({ build }: { build: Main }) {
  const currentLevel = useGameStore((state) => state.gameState.economy.level);
  const currentMoney = useGameStore((state) => state.gameState.economy.money);
  const config = LEVEL_CONFIG[currentLevel];
  const { showPopup } = usePopup();

  const handleUpgrade = () => {
    const res = useGameStore.getState().upgradeLevel();
    if (res.success) {
      showPopup(res.message, "success");
    } else {
      showPopup(res.message, "error");
    }
  };

  const isMaxLevel = !config || config.upgradeCost.money === 0;

  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
      <p style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>
        Уровень города: {currentLevel}
      </p>

      <ProgressBlock
        name={"Население"}
        from={build.populationStats.currentAmount}
        to={build.populationStats.maxCapacity}
      />

      <div className={styles.InfoBox__divider}></div>

      {!isMaxLevel ? (
        <div className={styles.InfoBox__upgradeSection}>
          <p className={styles.InfoBox__sectionTitle}>
            Улучшение до уровня {currentLevel + 1}
          </p>

          {}
          <div className={styles.InfoBox__requirementRow}>
            <span>Деньги:</span>
            <span
              style={{
                color:
                  currentMoney >= config.upgradeCost.money
                    ? "#4CAF50"
                    : "#F44336",
                fontWeight: "bold",
              }}
            >
              {currentMoney} / {config.upgradeCost.money} 💰
            </span>
          </div>

          {}
          {Object.entries(config.upgradeCost.resources).map(([res, needed]) => {
            const type = res as ResourceType;
            const stored = build.storage[type] ?? 0;
            return (
              <ProgressBlock
                key={res}
                name={RESOURCE_DISPLAY_NAMES[type] || type}
                from={stored}
                to={needed as number}
                isProcent={false}
              />
            );
          })}

          <button
            className={styles.InfoBox__actionBtn}
            style={{ marginTop: 12, background: "#4CAF50", color: "white" }}
            onClick={handleUpgrade}
          >
            Улучшить город
          </button>
        </div>
      ) : (
        <p
          style={{
            textAlign: "center",
            color: "#4CAF50",
            fontWeight: "bold",
            marginTop: 10,
          }}
        >
          🌟 Максимальный уровень достигнут!
        </p>
      )}
    </div>
  );
}
