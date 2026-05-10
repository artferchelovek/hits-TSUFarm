import styles from "../InfoBox.module.css";
import {
  type CropType,
  type Garden,
  ResourceType,
} from "../../../../engine/Types.ts";
import SizeBlock from "../SizeBlock.tsx";
import { PLANT_CONFIG } from "../../../../engine/Constants.ts";
import ProgressBlock from "../ProgressBlock.tsx";
import { useGameStore } from "../../../../Store/GameStore.ts";
import { useState } from "react";

export default function GardenInfo({ build }: { build: Garden }) {
  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
      {!build.harvest ? (
        <p
          style={{
            fontStyle: "italic",
          }}
        >
          Ничего не выращивается
        </p>
      ) : (
        <>
          <p>
            Посажено:{" "}
            {build.harvest
              ? PLANT_CONFIG[build.harvest.type].name
              : "Отсутствует"}
          </p>
          <ProgressBlock
            from={build.harvest.growthProgress}
            to={100}
            name={"Процесс роста"}
          />
        </>
      )}
      <p>Коэффицент роста: {build.growthCoefficient}x</p>
      <p>Состояние: {build.health.toFixed(2)}</p>
      <p>Требует полива: {build.isWatered ? "Нет" : "Да"}</p>
      <p>Влажность: {build.moisture.toFixed()}</p>
      {!build.harvest ? <AddPlant build={build} /> : null}
    </div>
  );
}

const AddPlant = ({ build }: { build: Garden }) => {
  const plantAction = useGameStore((state) => state.addPlant);

  const [selection, setSelection] = useState<CropType>(ResourceType.Wheat);

  return (
    <>
      <p>Выберите культуру</p>
      <select
        className={styles.InfoBox__plantSelect}
        value={selection}
        onChange={(e) => setSelection(e.target.value as CropType)}
      >
        {Object.values(PLANT_CONFIG).map((plant) => (
          <option key={plant.type} value={plant.type}>
            {plant.name}
          </option>
        ))}
      </select>

      <button
        onClick={() => {
          plantAction(build, selection);
        }}
      >
        Посадить
      </button>
    </>
  );
};
