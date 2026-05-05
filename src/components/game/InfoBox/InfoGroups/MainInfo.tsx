import styles from "../InfoBox.module.css";
import type { Main } from "../../../../engine/Types.ts";
import ProgressBlock from "../ProgressBlock.tsx";
import SizeBlock from "../SizeBlock.tsx";

export default function MainInfo({ build }: { build: Main }) {
  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
      <ProgressBlock
        name={"Население"}
        from={build.populationStats.currentAmount}
        to={build.populationStats.maxCapacity}
      />
    </div>
  );
}
