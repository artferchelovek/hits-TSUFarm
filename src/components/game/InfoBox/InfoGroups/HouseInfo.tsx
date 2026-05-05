import type { House } from "../../../../engine/Types.ts";
import styles from "../InfoBox.module.css";
import SizeBlock from "../SizeBlock.tsx";

export default function HouseInfo({ build }: { build: House }) {
  return (
    <div className={styles.InfoBox__body}>
      <SizeBlock build={build} />
      <p>Вместимость: {build.capacity} жителя</p>
      {build.residentsId.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <p>Проживают:</p>
          {build.residentsId.map((id, index) => (
            <p key={index}>{id}</p>
          ))}
        </div>
      ) : (
        <p
          style={{
            fontStyle: "italic",
          }}
        >
          Не заселенно
        </p>
      )}
    </div>
  );
}
