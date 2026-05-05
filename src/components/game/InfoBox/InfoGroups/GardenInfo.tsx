import styles from "../InfoBox.module.css";
import type { Garden } from "../../../../engine/Types.ts";
import SizeBlock from "../SizeBlock.tsx";
import { PLANT_CONFIG } from "../../../../engine/Constants.ts";
import ProgressBlock from "../ProgressBlock.tsx";

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
      <p>Состояние: {build.health}</p>
      <p>Требует полива: {build.isWatered ? "Да" : "Нет"}</p>
    </div>
  );
}
