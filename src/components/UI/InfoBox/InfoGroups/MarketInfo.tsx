import styles from "../InfoBox.module.css";
import type { Market } from "../../../../engine/Types.ts";
import { ResourceType } from "../../../../engine/Types.ts";
import SizeBlock from "../SizeBlock.tsx";
import ProgressBlock from "../ProgressBlock.tsx";
import { usePopup } from "../../../../contexts/PopupContext.tsx";
import { useGameStore } from "../../../../Store/GameStore.ts";
import { BUILDING_NAMES } from "../../../../engine/localization/locales.ts";
import { RESOURCE_PRICES } from "../../../../engine/Constants.ts";

export default function MarketInfo({ build }: { build: Market }) {
  const { showPopup } = usePopup();
  const demand = useGameStore((state) => state.gameState.economy.marketDemand);

  const totalAmount = Object.values(build.storage).reduce(
    (sum, amt) => (sum ?? 0) + (amt ?? 0),
    0,
  ) ?? 0;

  const estimatedProfit = Object.entries(build.storage).reduce((total, [res, amount]) => {
    const type = res as ResourceType;
    const price = RESOURCE_PRICES[type] ?? 0;
    const curDemand = demand[type] ?? 1.0;
    return total + (amount ?? 0) * price * curDemand;
  }, 0);

  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
      
      <ProgressBlock
        from={totalAmount}
        to={build.maxCapacity}
        name={"Заполнено"}
        isProcent={false}
      />

      <div className={styles.InfoBox__divider}></div>

      <div className={styles.InfoBox__recipe}>
        <p className={styles.InfoBox__sectionTitle}>Ожидаемая выручка</p>
        <p style={{ fontSize: 18, fontWeight: "bold", color: "#7A4A24", textAlign: "center" }}>
          {Math.floor(estimatedProfit)} 💰
        </p>
        <p style={{ fontSize: 10, opacity: 0.7, textAlign: "center", marginTop: 4 }}>
          Продажа состоится завтра утром
        </p>
      </div>

      <button
        className={styles.InfoBox__actionBtn}
        onClick={(e) => {
          e.stopPropagation();
          useGameStore.getState().setPendingExportSource(build.id);
        }}
      >
        Настроить связи
      </button>

      {build.export && build.export.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p className={styles.InfoBox__sectionTitle}>Экспорт в:</p>
          {build.export.map((id) => {
            const target = useGameStore.getState().gameState.buildings[id];
            const name = target
              ? BUILDING_NAMES[target.type]
              : "Неизвестное здание";
            return (
              <p key={id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span>{name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    useGameStore.getState().removeExportLink(build.id, id);
                    showPopup("Связь удалена");
                  }}
                  style={{ border: "none", background: "none", color: "red", cursor: "pointer" }}
                >
                  ×
                </button>
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
