import { useBuildSelection } from "../../../../contexts/BuildSelectionContext.tsx";
import { useGameStore } from "../../../../Store/GameStore.ts";
import { type Buildings, BuildingType } from "../../../../engine/Types.ts";
import {
  BUILDING_CONFIG,
  BUILDING_SVG,
  LEVEL_CONFIG,
} from "../../../../engine/Constants.ts";
import styles from "../LeftPanel.module.css";
import {
  BUILDING_DESCRIPTIONS,
  BUILDING_NAMES,
} from "../../../../engine/localization/locales.ts";
import { useState } from "react";

export function BuildingsPanel() {
  const { selected, setSelected } = useBuildSelection();
  const money = useGameStore((state) => state.gameState.economy.money);
  const currentLevel = useGameStore((state) => state.gameState.economy.level);
  const buildings = useGameStore((state) => state.gameState.buildings);
  const buildingsAllow = useGameStore(
    (state) => state.gameState.buildingRemind,
  );

  const [infoBuilding, setInfoBuilding] = useState<BuildingType | null>(null);

  const buildingTypes = Object.values(BuildingType) as BuildingType[];

  const renderPaletteItem = (bt: BuildingType) => {
    const cfg = BUILDING_CONFIG[bt];
    const lost = buildingsAllow[bt];

    const levelReq = LEVEL_CONFIG[currentLevel];
    const isUnlocked = levelReq?.unlockedBuildings.includes(bt) ?? true;

    const isBuy = cfg.cost > money;
    const isDisabled = !isUnlocked || isBuy || lost === 0;

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
            : isDisabled
              ? `${styles.buildingItem} ${styles.buildingItem__disabled}`
              : styles.buildingItem
        }
        onClick={() => {
          if (!isDisabled) setSelected(isSelected ? null : bt);
        }}
        title={!isUnlocked ? `Откроется на следующем уровне` : ""}
      >
        <img
          className={styles.buildingItem__image}
          src={BUILDING_SVG[bt]}
          alt=""
          style={{ filter: !isUnlocked ? "grayscale(1) opacity(0.5)" : "none" }}
        />
        <div style={{ flex: 1 }}>
          <div className={styles.buildingItem__title}>
            {BUILDING_NAMES[bt]} {!isUnlocked && "🔒"}
          </div>
          <div className={styles.buildingItem__desc}>
            {isUnlocked ? (
              <>
                <p>{desc}</p>
                <p>Осталось: {lost}</p>
              </>
            ) : (
              <p style={{ color: "#d9534f" }}>Заблокировано</p>
            )}
          </div>
        </div>
        <button
          className={styles.infoBtn}
          onClick={(e) => {
            e.stopPropagation();
            setInfoBuilding(bt);
          }}
          title="Инфо"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            info
          </span>
        </button>
      </div>
    );
  };

  const hasMain = Object.values(
    (buildings || {}) as Record<string, Buildings>,
  ).some((b) => b.type === BuildingType.Main);

  return (
    <div className={styles.buildingsList}>
      {!hasMain
        ? renderPaletteItem(BuildingType.Main)
        : buildingTypes.map((bt) => renderPaletteItem(bt))}

      {infoBuilding && (
        <div className={styles.infoPlate}>
          <div className={styles.infoPlate__header}>
            <strong>{BUILDING_NAMES[infoBuilding]}</strong>
            <button onClick={() => setInfoBuilding(null)}>×</button>
          </div>
          <p className={styles.infoPlate__desc}>
            {BUILDING_DESCRIPTIONS[infoBuilding]}
          </p>
          <div className={styles.infoPlate__stats}>
            <p>Цена: {BUILDING_CONFIG[infoBuilding].cost} 💰</p>
            <p>
              Размер: {BUILDING_CONFIG[infoBuilding].width}x
              {BUILDING_CONFIG[infoBuilding].length}
            </p>
            {BUILDING_CONFIG[infoBuilding].maintenanceCost > 0 && (
              <p style={{ color: "#d9534f" }}>
                Содержание: {BUILDING_CONFIG[infoBuilding].maintenanceCost} 💰/день
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
