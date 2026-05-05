import styles from "../InfoBox.module.css";
import type { Road } from "../../../../engine/Types.ts";
import SizeBlock from "../SizeBlock.tsx";

export default function RoadInfo({ build }: { build: Road }) {
  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
      <p>Множитель: {build.speedModifier}x</p>
    </div>
  );
}
