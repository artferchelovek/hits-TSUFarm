import styles from "./CenteredPopup.module.css";
import type { LogType } from "../../../engine/Types";

export default function CenteredPopup({
  visible,
  message,
  type = "info",
}: {
  visible: boolean;
  message: string;
  type?: LogType;
  onClose?: () => void;
}) {
  const cls = [
    styles.popup,
    type ? styles[`popup--${type}`] : "",
    visible ? styles["popup--visible"] : styles["popup--hidden"],
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} role="alert">
      <p className={styles.popup__msg}>{message}</p>
    </div>
  );
}
