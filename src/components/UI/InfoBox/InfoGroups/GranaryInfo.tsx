import styles from "../InfoBox.module.css";
import type { Granary, CropType } from "../../../../engine/Types.ts";
import SizeBlock from "../SizeBlock.tsx";
import { PLANT_CONFIG } from "../../../../engine/Constants.ts";
import ProgressBlock from "../ProgressBlock.tsx";
import { useState } from "react";
import { usePopup } from "../../../../contexts/PopupContext.tsx";
import { useGameStore } from "../../../../Store/GameStore.ts";
import { BUILDING_NAMES } from "../../../../engine/localization/locales.ts";

export default function GranaryInfo({ build }: { build: Granary }) {
  const setGranaryResourceType = useGameStore(
    (state) => state.setGranaryResourceType
  );
  const [selection, setSelection] = useState<CropType | null>(
    build.resourceType
  );
  const [isChanging, setIsChanging] = useState(false);

  const handleSelect = (type: CropType) => {
    setSelection(type);
    setGranaryResourceType(build.id, type);
    setIsChanging(false);
  };

  const isEmpty = build.storage.amount === 0;

  const { showPopup } = usePopup();
  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
      <ProgressBlock
        from={build.storage.amount}
        to={build.storage.maxCapacity}
        name={"Занято"}
        isProcent={true}
      />
      <p>Хранимый ресурс:</p>
      {build.resourceType ? (
        <div className={styles.InfoBox__resourceRow}>
          <p>{PLANT_CONFIG[build.resourceType].name}</p>
          {isEmpty && (
            <button
              className={styles.InfoBox__changeBtn}
              onClick={() => setIsChanging(true)}
            >
              Изменить
            </button>
          )}
        </div>
      ) : (
        <div className={styles.InfoBox__selector}>
          {Object.values(PLANT_CONFIG).map(({ type, name }) => (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              className={
                selection === type
                  ? styles.InfoBox__selectorBtn__selected
                  : styles.InfoBox__selectorBtn
              }
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {isChanging && (
        <div className={styles.InfoBox__selector}>
          {Object.values(PLANT_CONFIG).map(({ type, name }) => (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              className={
                selection === type
                  ? styles.InfoBox__selectorBtn__selected
                  : styles.InfoBox__selectorBtn
              }
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {build.resourceType && (
        <p>Количество: {build.storage.amount} ед.</p>
      )}
      <p>Хранится:</p>
      {Object.values(PLANT_CONFIG).map(({ type, name }) => (
        <p key={type}>
          {name}: {build.storage.amount} ед.
        </p>
      ))}
      <button
        onClick={(e) => {
          e.stopPropagation();
          useGameStore.getState().setPendingExportSource(build.id);
          showPopup("Выберите конечное здание");
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
