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
  return (
    <div className={styles.InfoBox__progress}>
      <p>{name}:</p>
      <div className={styles.InfoBox__progressTop}>
        <p>{isProcent ? `${((from / to) * 100).toFixed(1)}%` : from}</p>
        <p>{to}</p>
      </div>
      <progress max={to} value={from} />
    </div>
  );
}
