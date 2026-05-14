import { useBuildSelection } from "../../../../contexts/BuildSelectionContext.tsx";
import { useGameStore } from "../../../../Store/GameStore.ts";
import { type Buildings, BuildingType } from "../../../../engine/Types.ts";
import { BUILDING_CONFIG, BUILDING_SVG } from "../../../../engine/Constants.ts";
import styles from "../LeftPanel.module.css";
import { BUILDING_NAMES } from "../../../../engine/localization/locales.ts";

export function BuildingsPanel() {
  const { selected, setSelected } = useBuildSelection();
  const money = useGameStore((state) => state.gameState.economy.money);
  const buildings = useGameStore((state) => state.gameState.buildings);
  const buildingsAllow = useGameStore(
    (state) => state.gameState.buildingRemind,
  );

  const buildingTypes = Object.values(BuildingType) as BuildingType[];

  const renderPaletteItem = (bt: BuildingType) => {
    const cfg = BUILDING_CONFIG[bt];
    const lost = buildingsAllow[bt];
    const isBuy = cfg.cost > money;
    const isDisabled = isBuy || lost === 0;
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
      >
        <img
          className={styles.buildingItem__image}
          src={BUILDING_SVG[bt]}
          alt=""
        />
        <div>
          <div className={styles.buildingItem__title}>{BUILDING_NAMES[bt]}</div>
          <div className={styles.buildingItem__desc}>
            <p>{desc}</p>
            <p>Осталось: {lost}</p>
          </div>
        </div>
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
    </div>
  );
}
