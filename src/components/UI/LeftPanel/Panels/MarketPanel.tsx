import styles from "../LeftPanel.module.css";
import { useGameStore } from "../../../../Store/GameStore.ts";
import { RESOURCE_PRICES, LEVEL_CONFIG } from "../../../../engine/Constants.ts";
import { ResourceType } from "../../../../engine/Types.ts";
import { RESOURCE_DISPLAY_NAMES } from "../../../../engine/Constants.ts";

export default function MarketPanel() {
  const demand = useGameStore((state) => state.gameState.economy.marketDemand);
  const currentLevel = useGameStore((state) => state.gameState.economy.level);

  const levelReq = LEVEL_CONFIG[currentLevel];
  const unlockedCrops = levelReq?.unlockedCrops ?? [];
  const baseUnlocked = [ResourceType.Flour, ResourceType.Bread, ResourceType.Water];

  const resourceTypes = (Object.keys(RESOURCE_PRICES) as ResourceType[]).filter(
    (type) => unlockedCrops.includes(type) || baseUnlocked.includes(type)
  );

  return (
    <div className={styles.marketPanel}>
      <p className={styles.panelTitle}>Рыночные котировки</p>
      <div className={styles.marketList}>
        {resourceTypes.map((type) => {
          const basePrice = RESOURCE_PRICES[type] ?? 0;
          const rawDemand = demand[type] ?? 1.0;
          const currentDemand = isNaN(rawDemand) ? 1.0 : rawDemand;
          
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
                  {currentPrice === "NaN" ? "0.00" : currentPrice} 💰
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
