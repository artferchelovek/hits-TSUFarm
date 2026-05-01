import styles from "./LeftPanel.module.css";
import { useState } from "react";
import { BuildingType } from "../../../engine/Types";
import { BUILDING_CONFIG } from "../../../engine/Constants";
import { useBuildSelection } from "../../../contexts/BuildSelectionContext";
import { useGameStore } from "../../../Store/GameStore";
import type { Buildings } from "../../../engine/Types";

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
        <option value="vilagers">Жители</option>
        <option value="taxes">Налоги</option>
        <option value="cultures">Культуры</option>
      </select>
      {picker === "buildings" ? <BuildingsPanel /> : null}
    </div>
  );
}

function BuildingsPanel() {
  const { selected, setSelected } = useBuildSelection();
  const money = useGameStore((state) => state.gameState.economy.money);
  const buildings = useGameStore((state) => state.gameState.buildings);

  const BUILDING_NAMES: Record<BuildingType, string> = {
    [BuildingType.Main]: "Главное здание",
    [BuildingType.House]: "Дом",
    [BuildingType.Granary]: "Амбар",
    [BuildingType.Greenhouse]: "Теплица",
    [BuildingType.Market]: "Рынок",
    [BuildingType.Well]: "Колодец",
    [BuildingType.Bridge]: "Мост",
    [BuildingType.Road]: "Дорога",
    [BuildingType.Garden]: "Огород",
    [BuildingType.Graveyard]: "Кладбище",
  };

  const buildingTypes = Object.values(BuildingType) as BuildingType[];

  const renderPaletteItem = (bt: BuildingType) => {
    const cfg = BUILDING_CONFIG[bt];
    const isBuy = cfg.cost > money;
    const desc = cfg
      ? `${cfg.width}x${cfg.length} клетки. Цена: ${cfg.cost}`
      : "-";
    const isSelected = selected === bt;
    return (
      <div
        key={bt}
        className={
          isSelected
            ? `${styles.buildingItem} ${styles.buildingItem__selected}`
            : isBuy
              ? `${styles.buildingItem} ${styles.buildingItem__disabled}`
              : styles.buildingItem
        }
        onClick={() => {
          if (!isBuy) setSelected(isSelected ? null : bt);
        }}
      >
        <div className={styles.buildingItem__title}>{BUILDING_NAMES[bt]}</div>
        <div className={styles.buildingItem__desc}>{desc}</div>
      </div>
    );
  };

  const hasMain = Object.values(
    (buildings || {}) as Record<string, Buildings>,
  ).some((b) => b.type === BuildingType.Main);

  return (
    <div className={styles.leftPanel__body}>
      <div className={styles.buildingsList}>
        {!hasMain
          ? renderPaletteItem(BuildingType.Main)
          : buildingTypes.map((bt) => renderPaletteItem(bt))}
      </div>
    </div>
  );
}
