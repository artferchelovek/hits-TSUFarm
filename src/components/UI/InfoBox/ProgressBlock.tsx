import styles from "./InfoBox.module.css";

interface ProgressProps {
  from: number;
  to: number;
  name: string;
  isProcent?: boolean;
}

export default function ProgressBlock({
  from,
  to,
  name,
  isProcent = false,
}: ProgressProps) {
  const safeFrom = isNaN(from) ? 0 : from;
  const safeTo = isNaN(to) || to <= 0 ? 1 : to;
  
  const percentage = isProcent 
    ? `${((safeFrom / safeTo) * 100).toFixed(1)}%` 
    : Math.floor(safeFrom);

  return (
    <div className={styles.InfoBox__progress}>
      <p>{name}:</p>
      <div className={styles.InfoBox__progressTop}>
        <p>{percentage}</p>
        <p>{isNaN(to) ? 0 : to}</p>
      </div>
      <progress max={safeTo} value={safeFrom} />
    </div>
  );
}
