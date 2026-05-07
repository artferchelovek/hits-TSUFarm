import styles from "./InfoPanel.module.css";
import { useGameStore } from "../../../Store/GameStore.ts";
import { useRef, useState } from "react";

function Row({ name, data }: { name: string; data: string | number }) {
  return (
    <div className={styles.infoPanel__row}>
      <div className={styles.infoPanel__rowName}>{name}</div>
      <div className={styles.infoPanel__rowData}>{data}</div>
    </div>
  );
}

export default function InfoPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.infoPanel}>
      <div
        className={styles.infoPanel__header}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        <div className={styles.infoPanel__title}>
          <p>Весёлая ферма</p>
        </div>
        <div
          className={styles.infoPanel__chev}
          style={{
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "0.3s",
          }}
        >
          &gt;
        </div>
      </div>
      <div
        className={`${styles.infoPanel__body} ${isOpen ? "" : styles.infoPanel__body__close}`}
        ref={contentRef}
        style={{
          height: isOpen ? `${contentRef.current?.scrollHeight}px` : "0px",
        }}
      >
        <div className={styles.infoPanel__divider}></div>
        <Row
          name={"Время суток"}
          data={useGameStore((state) =>
            state.gameState.meta.isNight ? "Ночь" : "День",
          )}
        />
        <Row
          name={"Баланс"}
          data={useGameStore((state) => state.gameState.economy.money)}
        />
        <Row
          name={"Жители"}
          data={useGameStore(
            (state) => state.gameState.economy.totalPopulation,
          )}
        />
        <Row
          name={"Уровень"}
          data={useGameStore((state) => state.gameState.economy.level)}
        />
      </div>
    </div>
  );
}
