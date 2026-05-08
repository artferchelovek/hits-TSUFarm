import styles from "../InfoBox.module.css";
import type { Well } from "../../../../engine/Types.ts";
import SizeBlock from "../SizeBlock.tsx";
import ProgressBlock from "../ProgressBlock.tsx";

export default function WellInfo({ build }: { build: Well }) {
  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
      <ProgressBlock
        from={build.currentAmount}
        to={build.maxCapacity}
        name={"Ëмкость"}
        isProcent={true}
      />
    </div>
  );
}
