import styles from "./InfoBox.module.css";
import type { Buildings } from "../../../engine/Types.ts";
import { BUILDING_NAMES } from "../../../engine/Constants.ts";

export default function InfoBox({
  build,
  position,
  onClose,
}: {
  build: Buildings;
  position: { x: number; y: number };
  onClose: () => void;
}) {
  console.log(build, "sex");
  return (
    <div
      className={styles.InfoBox}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className={styles.InfoBox__label}>
        <p>{BUILDING_NAMES[build.type]}</p>
        <button onClick={onClose}>Закрыть</button>
      </div>
      <div className={styles.InfoBox__body}>
        <p>
          Размер: {build.length} {build.width}
        </p>
      </div>
    </div>
  );
}
