import styles from "./CenteredPopup.module.css";
import type { LogType } from "../../../engine/Types";
import { useGameStore } from "../../../Store/GameStore";

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
  const bannerVisible = !!useGameStore((s) => s.pendingExportSourceId);

  const cls = [
    styles.popup,
    type ? styles[`popup--${type}`] : "",
    visible ? styles["popup--visible"] : styles["popup--hidden"],
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      role="alert"
      style={
        visible && bannerVisible
          ? { transform: "translateX(-50%) translateY(60px)" }
          : undefined
      }
    >
      <p className={styles.popup__msg}>{message}</p>
    </div>
  );
}
