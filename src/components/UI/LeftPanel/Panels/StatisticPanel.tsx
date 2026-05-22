import styles from "../LeftPanel.module.css";
import { useGameStore } from "../../../../Store/GameStore.ts";
import {
  SEASON_NAMES,
  WEATHER_NAMES,
} from "../../../../engine/localization/locales.ts";

export default function StatisticPanel() {
  const cfg = useGameStore((state) => state.gameState);

  const lastIncome = cfg.economy.lastDailyIncome ?? 0;
  const lastMaintenance = cfg.economy.lastDailyMaintenance ?? 0;
  const rawBalance = lastIncome - lastMaintenance;
  const balance = isNaN(rawBalance) ? 0 : rawBalance;

  return (
    <div className={styles.statisticList}>
      <div className={styles.statisticList__metadata}>
        <Row name={"Время года"} data={SEASON_NAMES[cfg.meta.currentSeason]} />
        <Row name={"Погода"} data={WEATHER_NAMES[cfg.meta.currentWeather]} />
        <Row
          name={"День"}
          data={Math.round(cfg.meta.gameTick / cfg.meta.dayDuration)}
        />
      </div>
      
      <p className={styles.panelTitle} style={{ marginTop: 12 }}>Финансы (за прошлый день)</p>
      <div className={styles.statisticList__metadata}>
        <Row name={"Доход"} data={`+${isNaN(lastIncome) ? 0 : lastIncome}`} color="#4CAF50" />
        <Row name={"Содержание"} data={`-${isNaN(lastMaintenance) ? 0 : lastMaintenance}`} color="#F44336" />
        <div style={{ height: 1, background: "rgba(0,0,0,0.1)", margin: "4px 0" }} />
        <Row name={"Прибыль"} data={balance > 0 ? `+${balance}` : balance} color={balance > 0 ? "#4CAF50" : balance < 0 ? "#F44336" : "inherit"} />
      </div>
    </div>
  );
}

function Row({ name, data, color }: { name: string; data: string | number, color?: string }) {
  return (
    <div className={styles.statisticPanel__row}>
      <div className={styles.statisticPanel__rowName}>{name}</div>
      <div className={styles.statisticPanel__rowData} style={{ color }}>{data}</div>
    </div>
  );
}
