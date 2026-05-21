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
          {build.residentsId.map((id, index) => {
            const r = useGameStore.getState().gameState.residents[id];
            if (!r) return null;
            return (
              <p key={index}>
                {r.name} {r.surname} (Возраст: {r.age.toFixed(0)})
              </p>
            );
          })}
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
