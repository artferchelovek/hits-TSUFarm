import styles from "./ToolBar.module.css";
import { useBuildSelection } from "../../../contexts/BuildSelectionContext.tsx";
import { usePopup } from "../../../contexts/PopupContext.tsx";

export default function ToolBar() {
  const { selected, setSelected } = useBuildSelection();
  const { showPopup } = usePopup();

  const isRemoveMode = selected === "remove";

  const toggleRemoveMode = () => {
    const nextMode = isRemoveMode ? null : "remove";
    setSelected(nextMode);
    if (nextMode === "remove") {
      showPopup("Режим удаления активирован", "warning");
    }
  };

  return (
    <div className={styles.toolBar}>
      <button
        className={`${styles.button} ${isRemoveMode ? styles.active : ""}`}
        onClick={toggleRemoveMode}
        title="Удалить строение"
      >
        <span className="material-symbols-outlined">delete</span>
      </button>
    </div>
  );
}
