import ToolBar from "../ToolBar/ToolBar.tsx";
import InfoPanel from "../InfoPanel/InfoPanel.tsx";
import styles from "./RightPanel.module.css";

export default function RightPanel() {
  return (
    <div className={styles.rightPanel}>
      <ToolBar />
      <InfoPanel />
    </div>
  );
}
