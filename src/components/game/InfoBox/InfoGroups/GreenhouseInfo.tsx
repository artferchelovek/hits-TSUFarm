import styles from "../InfoBox.module.css";
import type { Greenhouse } from "../../../../engine/Types.ts";
import SizeBlock from "../SizeBlock.tsx";
import { PLANT_CONFIG } from "../../../../engine/Constants.ts";
import ProgressBlock from "../ProgressBlock.tsx";

export default function GreenhouseInfo({ build }: { build: Greenhouse }) {
  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
      <p>Вместимость: {build.baseYield}</p>
      <p>
        Посажено:{" "}
        {build.fixedCropType
          ? PLANT_CONFIG[build.fixedCropType].name
          : "Отсутствует"}
      </p>
      <ProgressBlock
        from={build.waterTank.current}
        to={build.waterTank.max}
        name={"Вода"}
      />
    </div>
  );
}
