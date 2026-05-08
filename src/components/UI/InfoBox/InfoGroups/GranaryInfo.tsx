import styles from "../InfoBox.module.css";
import type { Granary } from "../../../../engine/Types.ts";
import SizeBlock from "../SizeBlock.tsx";
import { PLANT_CONFIG } from "../../../../engine/Constants.ts";
import ProgressBlock from "../ProgressBlock.tsx";

export default function GranaryInfo({ build }: { build: Granary }) {
  const sumResources = Object.values(PLANT_CONFIG).reduce((acc, { type }) => {
    const amount = build.storage.resources[type] ?? 0;
    return acc + amount;
  }, 0);
  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
      <ProgressBlock
        from={sumResources}
        to={build.storage.maxCapacity}
        name={"Занято"}
        isProcent={true}
      />
      <p>Хранится:</p>
      {Object.values(PLANT_CONFIG).map(({ type, name }) => (
        <p key={type}>
          {name}: {build.storage.resources[type] ?? 0} ед.
        </p>
      ))}
    </div>
  );
}
