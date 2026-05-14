import styles from "../InfoBox.module.css";
import type { Granary, CropType } from "../../../../engine/Types.ts";
import SizeBlock from "../SizeBlock.tsx";
import { PLANT_CONFIG } from "../../../../engine/Constants.ts";
import ProgressBlock from "../ProgressBlock.tsx";
import { useState } from "react";
import { useGameStore } from "../../../../Store/GameStore.ts";

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
    </div>
  );
}
