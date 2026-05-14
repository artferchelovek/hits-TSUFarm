import useMapCanvas from "./useMapCanvas";
import InfoBox from "../UI/InfoBox/InfoBox";
import ExportLinkingBanner from "./ExportLinkingBanner";
import { PALETTE } from "../../engine/Constants";
import { TileType, type WorldMap } from "../../engine/WorldMap";

export default function MapCanvas({
  isBackground = false,
  world,
  tileTextures,
  buildingTextures,
  onMapReady,
  centerCamera,
  residentTextures,
}: {
  isBackground?: boolean;
  world?: WorldMap;
  tileTextures?: Record<number, HTMLImageElement>;
  buildingTextures?: Record<string, HTMLImageElement>;
  residentTextures?: Record<string, HTMLImageElement>;
  onMapReady?: () => void;
  centerCamera?: boolean;
}) {
  const {
    containerRef,
    mapCanvasRef,
    buildingsCanvasRef,
    overlayCanvasRef,
    residentCanvasRef,
    weatherCanvasRef,
    onMouseMove,
    onClick,
    buildInfo,
    infoBoxPos,
    onInfoBoxClose,
    onMouseDown,
    onMouseUp,
  } = useMapCanvas(
    isBackground,
    world,
    tileTextures,
    buildingTextures,
    residentTextures,
    onMapReady,
    centerCamera,
  );

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
      <ExportLinkingBanner />

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
        ref={residentCanvasRef}
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

      <canvas
        ref={weatherCanvasRef}
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
