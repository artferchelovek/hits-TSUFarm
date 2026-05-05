import styles from "../InfoBox.module.css";
import type { Graveyard } from "../../../../engine/Types.ts";
import SizeBlock from "../SizeBlock.tsx";
import ProgressBlock from "../ProgressBlock.tsx";

export default function GraveyardInfo({ build }: { build: Graveyard }) {
  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
      <ProgressBlock
        from={build.decedents.length}
        to={build.maxCapacity}
        name={"Вместимость"}
      />
    </div>
  );
}
