import type { House } from "../../../../engine/Types.ts";
import styles from "../InfoBox.module.css";
import SizeBlock from "../SizeBlock.tsx";
import { useGameStore } from "../../../../Store/GameStore.ts";

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
            <p key={index}>
              {useGameStore.getState().gameState.residents[id].name +
                " " +
                useGameStore.getState().gameState.residents[id].surname +
                ` (Возраст: ${useGameStore.getState().gameState.residents[id].age.toFixed(0)})`}
            </p>
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
