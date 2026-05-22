import styles from "../InfoBox.module.css";
import {
  type CropType,
  type Greenhouse,
  ResourceType,
} from "../../../../engine/Types.ts";
import SizeBlock from "../SizeBlock.tsx";
import { PLANT_CONFIG } from "../../../../engine/Constants.ts";
import ProgressBlock from "../ProgressBlock.tsx";
import { useGameStore } from "../../../../Store/GameStore.ts";
import { useState } from "react";

export default function GreenhouseInfo({ build }: { build: Greenhouse }) {
  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
      <ProgressBlock
        from={parseFloat(build.waterTank.current.toFixed(2))}
        to={build.waterTank.max}
        name={"Вода"}
      />
      {!build.harvestType ? (
        <p
          style={{
            fontStyle: "italic",
          }}
        >
          Ничего не выращивается
        </p>
      ) : (
        <p> Культура: {PLANT_CONFIG[build.harvestType].name}</p>
      )}{" "}
      {build.harvest ? (
        <>
          <ProgressBlock
            from={parseFloat(build.harvest.growthProgress.toFixed(2))}
            to={100}
            name={"Процесс роста"}
          />
          <p>
            Коэффицент роста: {parseFloat(build.growthCoefficient.toFixed(2))}x
          </p>
          <p>Состояние: {build.health.toFixed(2)}</p>
        </>
      ) : (
        <>
          <ProgressBlock from={0} to={100} name={"Процесс роста"} />
          <AddPlant build={build} />
        </>
      )}
    </div>
  );
}

const AddPlant = ({ build }: { build: Greenhouse }) => {
  const plantAction = useGameStore((state) => state.addPlant);

  const [selection, setSelection] = useState<CropType>(
    build.harvestType ?? ResourceType.Wheat,
  );

  return (
    <>
      <p>Выберите культуру: </p>
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
