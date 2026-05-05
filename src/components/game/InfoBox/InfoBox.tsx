import styles from "./InfoBox.module.css";
import type { Buildings } from "../../../engine/Types.ts";
import { BUILDING_NAMES, INFO_COMPONENTS } from "../../../engine/Constants.ts";

export default function InfoBox({
  build,
  position,
  onClose,
}: {
  build: Buildings;
  position: { x: number; y: number };
  onClose: () => void;
}) {
  const DefaultInfo = () => <p>Нет данных</p>;

  const SpecificInfo = INFO_COMPONENTS[build.type] ?? DefaultInfo;

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
      {SpecificInfo && <SpecificInfo build={build as Buildings} />}
    </div>
  );
}
