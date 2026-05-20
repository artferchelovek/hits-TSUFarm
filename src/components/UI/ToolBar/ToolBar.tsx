import styles from "./ToolBar.module.css";
import { useBuildSelection } from "../../../contexts/BuildSelectionContext.tsx";

export default function ToolBar() {
  const { selected, setSelected } = useBuildSelection();

  const isRemoveMode = selected === "remove";

  return (
    <div className={styles.toolBar}>
      <button
        className={`${styles.button} ${styles.removeButton} ${isRemoveMode ? styles.active : ""}`}
        onClick={() => setSelected(isRemoveMode ? null : "remove")}
      >
        Удалить
      </button>
    </div>
  );
}
