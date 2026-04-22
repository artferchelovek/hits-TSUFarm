import { TileType, WorldMap } from "../../engine/WorldMap.ts";
import { useEffect, useRef, useState } from "react";

const PALETTE = {
  [TileType.Grass]: "#4CAF50",
  [TileType.Hill]: "#795548",
  [TileType.Water]: "#2196F3",
};

const TILE_SIZE = 25;

export default function MapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [world] = useState(() => {
    const w = new WorldMap();
    w.generate();
    return w;
  });

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const draw = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => {
    ctx.clearRect(0, 0, width, height);

    const zoomedTileSize = TILE_SIZE * camera.zoom;

    const startCol = Math.floor(-camera.x / zoomedTileSize);
    const endCol = startCol + Math.ceil(width / zoomedTileSize);

    const startRow = Math.floor(-camera.y / zoomedTileSize);
    const endRow = startRow + Math.ceil(height / zoomedTileSize);

    const col0 = Math.max(0, startCol);
    const col1 = Math.min(500, endCol);
    const row0 = Math.max(0, startRow);
    const row1 = Math.min(500, endRow);

    for (let row = row0; row < row1; row++) {
      for (let col = col0; col < col1; col++) {
        const tile = world.getTile(col, row);

        const screenX = col * zoomedTileSize + camera.x;
        const screenY = row * zoomedTileSize + camera.y;

        ctx.fillStyle = PALETTE[tile];
        ctx.fillRect(
          screenX,
          screenY,
          zoomedTileSize + 0.5,
          zoomedTileSize + 0.5,
        );
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const render = () => {
      draw(ctx, width, height);
      requestAnimationFrame(render);
    };

    render();
  }, [camera]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;

    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;

    setCamera((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      style={{ display: "block" }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    />
  );
}
