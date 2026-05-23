import styles from "../InfoBox.module.css";
import type { Bakery } from "../../../../engine/Types.ts";
import { ResourceType } from "../../../../engine/Types.ts";
import SizeBlock from "../SizeBlock.tsx";
import ProgressBlock from "../ProgressBlock.tsx";
import { usePopup } from "../../../../contexts/PopupContext.tsx";
import { useGameStore } from "../../../../Store/GameStore.ts";
import { BUILDING_NAMES } from "../../../../engine/localization/locales.ts";

export default function BakeryInfo({ build }: { build: Bakery }) {
  const { showPopup } = usePopup();
  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
      <ProgressBlock
        from={build.storage[ResourceType.Flour] ?? 0}
        to={build.maxCapacity}
        name={"Мука"}
        isProcent={false}
      />
      <ProgressBlock
        from={build.storage[ResourceType.Bread] ?? 0}
        to={build.maxCapacity}
        name={"Хлеб"}
        isProcent={false}
      />

      <div className={styles.InfoBox__divider}></div>

      <div className={styles.InfoBox__recipe}>
        <p className={styles.InfoBox__sectionTitle}>Выпекание</p>
        <p className={styles.InfoBox__recipeRow}>
          {build.recipe.importCount} Мука ➔ {build.recipe.exportCount} Хлеб
        </p>
        <ProgressBlock
          from={Math.round(build.progress * 100)}
          to={100}
          name={"Прогресс"}
          isProcent={true}
        />
      </div>

      <button
        className={styles.InfoBox__actionBtn}
        onClick={(e) => {
          e.stopPropagation();
          useGameStore.getState().setPendingExportSource(build.id);
        }}
      >
        Экспорт
      </button>
      {build.export && build.export.length > 0 && (
        <div>
          <p>Экспорт в:</p>
          {build.export.map((id) => {
            const target = useGameStore.getState().gameState.buildings[id];
            const name = target
              ? BUILDING_NAMES[target.type]
              : "Неизвестное здание";
            const pos = target
              ? `(${target.position.x}, ${target.position.y})`
              : "";
            return (
              <p
                key={id}
                style={{ display: "flex", gap: 6, alignItems: "center" }}
              >
                <span>{name}</span>
                <span style={{ opacity: 0.6, fontSize: 12 }}>{pos}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    useGameStore.getState().removeExportLink(build.id, id);
                    showPopup("Связь экспорта удалена");
                  }}
                  style={{
                    marginLeft: "auto",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontWeight: "bold",
                    color: "#c0392b",
                  }}
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
