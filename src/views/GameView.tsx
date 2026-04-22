import MapCanvas from "../components/game/MapCanvas.tsx";

export default function GameView() {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <MapCanvas />
    </div>
  );
}
