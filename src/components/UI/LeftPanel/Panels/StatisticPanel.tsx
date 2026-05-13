import styles from "../LeftPanel.module.css";
import { useGameStore } from "../../../../Store/GameStore.ts";
import {
  SEASON_NAMES,
  WEATHER_NAMES,
} from "../../../../engine/localization/locales.ts";

export default function StatisticPanel() {
  const cfg = useGameStore((state) => state.gameState);

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
    </div>
  );
}

function Row({ name, data }: { name: string; data: string | number }) {
  return (
    <div className={styles.statisticPanel__row}>
      <div className={styles.statisticPanel__rowName}>{name}</div>
      <div className={styles.statisticPanel__rowData}>{data}</div>
    </div>
  );
}
