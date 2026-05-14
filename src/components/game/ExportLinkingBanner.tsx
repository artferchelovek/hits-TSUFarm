import { useGameStore } from "../../Store/GameStore.ts";

export default function ExportLinkingBanner() {
  const pendingId = useGameStore((s) => s.pendingExportSourceId);

  if (!pendingId) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10001,
        background: "rgba(46, 204, 113, 0.95)",
        color: "#fff",
        padding: "12px 24px",
        borderRadius: 8,
        maxWidth: 460,
        width: "90vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        fontSize: 15,
        fontWeight: 600,
        pointerEvents: "auto",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      }}
    >
      <span>Выберите здание на карте для связи экспорта</span>
      <button
        onClick={() => {
          useGameStore.getState().setPendingExportSource(null);
        }}
        style={{
          flexShrink: 0,
          background: "rgba(255,255,255,0.2)",
          border: "1px solid rgba(255,255,255,0.5)",
          borderRadius: 4,
          color: "#fff",
          padding: "4px 14px",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Отмена
      </button>
    </div>
  );
}
