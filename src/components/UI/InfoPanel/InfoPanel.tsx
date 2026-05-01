import styles from "./InfoPanel.module.css";

function Row({ name, data }: { name: string; data: string }) {
  return (
    <div className={styles.infoPanel__row}>
      <div className={styles.infoPanel__rowName}>{name}</div>
      <div className={styles.infoPanel__rowData}>{data}</div>
    </div>
  );
}

export default function InfoPanel() {
  return (
    <div className={styles.infoPanel}>
      <div className={styles.infoPanel__header}>
        <div className={styles.infoPanel__title}>Весёлая ферма</div>
        <div className={styles.infoPanel__chev}>&gt;</div>
      </div>
      <div className={styles.infoPanel__body}>
        <div className={styles.infoPanel__divider}></div>
        <Row name={"Баланс"} data={"1000"} />
        <Row name={"Жители"} data={"3"} />
        <Row name={"Уровень"} data={"1"} />
      </div>
    </div>
  );
}
