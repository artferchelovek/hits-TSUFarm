import useMapCanvas from "./useMapCanvas";
import InfoBox from "../UI/InfoBox/InfoBox";
import { PALETTE } from "../../engine/Constants";
import { TileType } from "../../engine/WorldMap";

export default function MapCanvas({
  isBackground = false,
}: {
  isBackground?: boolean;
}) {
  const {
    containerRef,
    mapCanvasRef,
    buildingsCanvasRef,
    overlayCanvasRef,
    onMouseMove,
    onClick,
    buildInfo,
    infoBoxPos,
    onInfoBoxClose,
    onMouseDown,
    onMouseUp,
  } = useMapCanvas(isBackground);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: PALETTE[TileType.Water],
        overflow: "hidden",
        position: "relative",
      }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
      onClick={onClick}
    >
      {buildInfo && (
        <InfoBox
          build={buildInfo.build}
          position={infoBoxPos || buildInfo.position}
          onClose={onInfoBoxClose}
        />
      )}

      <canvas
        ref={mapCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "0 0",
          willChange: "transform",
          imageRendering: "pixelated",
        }}
      />

      <canvas
        ref={buildingsCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "0 0",
          willChange: "transform",
          pointerEvents: "none",
        }}
      />

      <canvas
        ref={overlayCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "0 0",
          willChange: "transform",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
