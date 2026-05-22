import styles from "../LeftPanel.module.css";
import { useGameStore } from "../../../../Store/GameStore.ts";
import { RESOURCE_PRICES } from "../../../../engine/Constants.ts";
import { ResourceType } from "../../../../engine/Types.ts";
import { RESOURCE_DISPLAY_NAMES } from "../../../../engine/Constants.ts";

export default function MarketPanel() {
  const demand = useGameStore((state) => state.gameState.economy.marketDemand);

  const resourceTypes = Object.keys(RESOURCE_PRICES) as ResourceType[];

  return (
    <div className={styles.marketPanel}>
      <p className={styles.panelTitle}>Рыночные котировки</p>
      <div className={styles.marketList}>
        {resourceTypes.map((type) => {
          const basePrice = RESOURCE_PRICES[type] ?? 0;
          const currentDemand = demand[type] ?? 1.0;
          const currentPrice = (basePrice * currentDemand).toFixed(2);
          const trend = currentDemand > 1.05 ? "trending_up" : currentDemand < 0.95 ? "trending_down" : "horizontal_rule";
          const trendColor = currentDemand > 1.05 ? "#4CAF50" : currentDemand < 0.95 ? "#F44336" : "#7A4A24";

          return (
            <div key={type} className={styles.marketItem}>
              <div className={styles.marketItem__info}>
                <span className={styles.marketItem__name}>
                  {RESOURCE_DISPLAY_NAMES[type] || type}
                </span>
                <span className={styles.marketItem__price}>
                  {currentPrice} 💰
                </span>
              </div>
              <div className={styles.marketItem__trend} style={{ color: trendColor }}>
                <span className="material-symbols-outlined">{trend}</span>
                <span className={styles.marketItem__demand}>
                  {Math.round(currentDemand * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className={styles.marketHint}>
        * Цены обновляются каждое утро. Продажа товаров снижает спрос.
      </p>
    </div>
  );
}
