import { useEffect, useRef, useState } from "react";
import { TileType, WorldMap } from "../../engine/WorldMap.ts";

const PALETTE = {
  [TileType.Grass]: "#76DC7A",
  [TileType.Hill]: "#02C009",
  [TileType.Water]: "#00E1E9",
  [TileType.Sand]: "#E4ED32",
};

const TILE_SIZE = 25;
const MAP_DIMENSION = 500;

export default function MapViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);

  const cameraRef = useRef({ x: -2000, y: -2000, zoom: 1 });
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const [world] = useState(() => {
    const w = new WorldMap();
    w.generate();
    return w;
  });

  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;

    const size = MAP_DIMENSION * TILE_SIZE;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    console.time("Отрисовка всей карты");
    for (let row = 0; row < MAP_DIMENSION; row++) {
      for (let col = 0; col < MAP_DIMENSION; col++) {
        const tile = world.getTile(col, row);
        ctx.fillStyle = PALETTE[tile];
        ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
    console.timeEnd("Отрисовка всей карты");

    updateTransform();
  }, []);

  const updateTransform = () => {
    if (mapCanvasRef.current) {
      const { x, y, zoom } = cameraRef.current;
      mapCanvasRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`;
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        const zoomSpeed = 0.002;
        const delta = -e.deltaY;
        const oldZoom = cameraRef.current.zoom;
        const newZoom = Math.min(Math.max(oldZoom + delta * zoomSpeed, 0.2), 2);

        cameraRef.current.zoom = newZoom;
      } else {
        cameraRef.current.x -= e.deltaX;
        cameraRef.current.y -= e.deltaY;
      }

      updateTransform();
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current) return;

    cameraRef.current.x += e.clientX - lastMousePosRef.current.x;
    cameraRef.current.y += e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    updateTransform();
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#111",
        overflow: "hidden",
        position: "relative",
        cursor: "grab",
      }}
      onMouseDown={(e) => {
        isPanningRef.current = true;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      }}
      onMouseUp={() => (isPanningRef.current = false)}
      onMouseLeave={() => (isPanningRef.current = false)}
      onMouseMove={onMouseMove}
    >
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
    </div>
  );
}
