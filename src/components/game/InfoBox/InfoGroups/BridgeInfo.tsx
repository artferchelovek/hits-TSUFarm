import styles from "../InfoBox.module.css";
import type { Bridge } from "../../../../engine/Types.ts";
import SizeBlock from "../SizeBlock.tsx";

export default function BridgeInfo({ build }: { build: Bridge }) {
  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
      <p>Множитель: {build.speedModifier}x</p>
    </div>
  );
}
