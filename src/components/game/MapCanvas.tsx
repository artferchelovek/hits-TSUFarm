import { useEffect, useRef, useState } from "react";
import { TileType, WorldMap } from "../../engine/WorldMap.ts";

const PALETTE = {
  [TileType.Grass]: "#9EEAA1",
  [TileType.Hill]: "#57C35B",
  [TileType.Water]: "#76F2F7",
  [TileType.Sand]: "#F9FE90",
  [TileType.PreHill]: "#76DC7A",
  [TileType.DeepWater]: "#00E1E9",
};

const TILE_SIZE = 25;
const MAP_DIMENSION = 500;

export default function MapCanvas({
  isBackground = false,
}: {
  isBackground?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  const cameraRef = useRef({ x: -2000, y: -2000, zoom: 1 });
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const hoveredTileRef = useRef<{ col: number; row: number } | null>(null);

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

    const overlay = overlayCanvasRef.current;
    if (overlay) {
      overlay.width = size;
      overlay.height = size;
    }

    updateTransform();
  }, []);

  const updateTransform = () => {
    if (mapCanvasRef.current) {
      const { x, y, zoom } = cameraRef.current;
      mapCanvasRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`;
      overlayCanvasRef.current!.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`;
    }
  };

  const drawOverlay = () => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const hovered = hoveredTileRef.current;
    if (!hovered) return;

    ctx.strokeStyle = "#acacac";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      hovered.col * TILE_SIZE + 1,
      hovered.row * TILE_SIZE + 1,
      TILE_SIZE - 2,
      TILE_SIZE - 2,
    );
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (isBackground) return;

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

  useEffect(() => {
    if (!isBackground) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      cameraRef.current.x += dt * 12;
      cameraRef.current.y += dt * 6;
      updateTransform();
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
    };
  }, [isBackground]);

  const onMouseMove = (e: React.MouseEvent) => {
    if (isBackground) return;
    if (isPanningRef.current) {
      cameraRef.current.x += e.clientX - lastMousePosRef.current.x;
      cameraRef.current.y += e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      updateTransform();
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = mouseX - cameraRef.current.x;
    const worldY = mouseY - cameraRef.current.y;

    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);

    if (col >= 0 && col < MAP_DIMENSION && row >= 0 && row < MAP_DIMENSION) {
      hoveredTileRef.current = { col, row };
    } else {
      hoveredTileRef.current = null;
    }

    drawOverlay();
  };

  const onClick = (e: React.MouseEvent) => {
    if (isBackground) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = mouseX - cameraRef.current.x;
    const worldY = mouseY - cameraRef.current.y;

    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);

    if (col >= 0 && col < MAP_DIMENSION && row >= 0 && row < MAP_DIMENSION) {
      alert(`x=${col}, y=${row}`);
    }
  };

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
      onMouseDown={(e) => {
        if (e.button !== 1) return;
        e.preventDefault();
        isPanningRef.current = true;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      }}
      onMouseUp={(e) => {
        if (e.button !== 1) return;
        isPanningRef.current = false;
      }}
      onMouseLeave={() => {
        isPanningRef.current = false;
        hoveredTileRef.current = null;
        drawOverlay();
      }}
      onMouseMove={onMouseMove}
      onClick={onClick}
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
