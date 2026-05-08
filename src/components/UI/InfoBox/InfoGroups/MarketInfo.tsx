import styles from "../InfoBox.module.css";
import type { Market } from "../../../../engine/Types.ts";
import SizeBlock from "../SizeBlock.tsx";

export default function MarketInfo({ build }: { build: Market }) {
  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
    </div>
  );
}
