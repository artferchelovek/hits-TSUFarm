import styles from "./LeftPanel.module.css";
import { useState } from "react";
import { ResidentPanel } from "./Panels/ResidentPanel.tsx";
import { BuildingsPanel } from "./Panels/BuildingsPanel.tsx";
import StatisticPanel from "./Panels/StatisticPanel.tsx";

export default function LeftPanel() {
  const [picker, setPicker] = useState("buildings");

  return (
    <div className={styles.leftPanel}>
      <select
        className={styles.leftPanelSelect}
        name="leftPanelSelect"
        id="leftPanelSelect"
        value={picker}
        onChange={(e) => setPicker(e.target.value)}
      >
        <option value="buildings">Строения</option>
        <option value="statistic">Статистика</option>
        <option value="residents">Жители</option>
        <option value="taxes">Налоги</option>
        <option value="cultures">Культуры</option>
      </select>
      <div className={styles.leftPanel__body}>
        {picker === "buildings" ? <BuildingsPanel /> : null}
        {picker === "residents" ? <ResidentPanel /> : null}
        {picker === "statistic" ? <StatisticPanel /> : null}
      </div>
    </div>
  );
}
