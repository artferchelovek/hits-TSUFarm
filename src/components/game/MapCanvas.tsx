import { useEffect, useRef, useState } from "react";
import { TileType, WorldMap } from "../../engine/WorldMap.ts";
import { useBuildSelection } from "../../contexts/BuildSelectionContext";
import { usePopup } from "../../contexts/PopupContext";
import { BUILDING_CONFIG } from "../../engine/Constants";
import { useGameStore } from "../../Store/GameStore";
import type { BuildingType, Buildings, GameStore } from "../../engine/Types";

const PALETTE = {
  [TileType.Grass]: "#9EEAA1",
  [TileType.Hill]: "#57C35B",
  [TileType.Water]: "#76F2F7",
  [TileType.Sand]: "#F9FE90",
  [TileType.PreHill]: "#76DC7A",
  [TileType.DeepWater]: "#00E1E9",
};

const BUILDING_COLORS: Record<string, string> = {
  MAIN: "#8B5A2B",
  HOUSE: "#C68642",
  GRANARY: "#7A4A24",
  GREENHOUSE: "#6AA84F",
  MARKET: "#B86B3A",
  WELL: "#6C9FBF",
  BRIDGE: "#7B5E3A",
  ROAD: "#9E7B5A",
  GARDEN: "#4CAF50",
  GRAVEYARD: "#5D5D5D",
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
  const buildingsCanvasRef = useRef<HTMLCanvasElement>(null);
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

  const updateTransform = () => {
    if (mapCanvasRef.current) {
      const { x, y, zoom } = cameraRef.current;
      mapCanvasRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`;
      buildingsCanvasRef.current!.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`;
      overlayCanvasRef.current!.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`;
    }
  };

  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const size = MAP_DIMENSION * TILE_SIZE;
    const dpr = window.devicePixelRatio || 1;

    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

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
      overlay.style.width = `${size}px`;
      overlay.style.height = `${size}px`;
      overlay.width = Math.floor(size * dpr);
      overlay.height = Math.floor(size * dpr);
      const octx = overlay.getContext("2d");
      if (octx) {
        octx.setTransform(dpr, 0, 0, dpr, 0, 0);
        octx.imageSmoothingEnabled = false;
      }
    }

    const buildingsCanvas = buildingsCanvasRef.current;
    if (buildingsCanvas) {
      buildingsCanvas.style.width = `${size}px`;
      buildingsCanvas.style.height = `${size}px`;
      buildingsCanvas.width = Math.floor(size * dpr);
      buildingsCanvas.height = Math.floor(size * dpr);
      const bctx = buildingsCanvas.getContext("2d");
      if (bctx) {
        bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        bctx.imageSmoothingEnabled = false;
      }
    }

    updateTransform();
  }, [world]);

  const { selected } = useBuildSelection();
  const buildSelectionRef = useRef<{ selected: BuildingType | null } | null>(
    null,
  );
  const { showPopup } = usePopup();
  useEffect(() => {
    buildSelectionRef.current = { selected };
  }, [selected]);

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

    const { selected } = buildSelectionRef.current ?? { selected: null };
    if (selected) {
      const cfg = (
        BUILDING_CONFIG as unknown as Record<
          BuildingType,
          { width?: number; length?: number; cost?: number }
        >
      )[selected as BuildingType];
      const w = cfg?.width ?? 1;
      const h = cfg?.length ?? 1;
      ctx.strokeStyle = "rgba(46, 44, 44, 1)";
      ctx.lineWidth = 3;
      ctx.fillStyle = "rgba(78,48,23,0.12)";
      ctx.fillRect(
        hovered.col * TILE_SIZE + 1,
        hovered.row * TILE_SIZE + 1,
        w * TILE_SIZE - 2,
        h * TILE_SIZE - 2,
      );
      ctx.strokeRect(
        hovered.col * TILE_SIZE + 1,
        hovered.row * TILE_SIZE + 1,
        w * TILE_SIZE - 2,
        h * TILE_SIZE - 2,
      );
    } else {
      ctx.strokeRect(
        hovered.col * TILE_SIZE + 1,
        hovered.row * TILE_SIZE + 1,
        TILE_SIZE - 2,
        TILE_SIZE - 2,
      );
    }
  };

  const drawBuildings = (buildings: Record<string, Buildings> | null) => {
    const canvas = buildingsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!buildings) return;

    const list = Object.values(buildings).slice() as Buildings[];
    list.sort(
      (a: Buildings, b: Buildings) =>
        a.position.y + (a.length || 1) - (b.position.y + (b.length || 1)),
    );

    list.forEach((b: Buildings) => {
      const x = b.position.x * TILE_SIZE;
      const y = b.position.y * TILE_SIZE;
      const w = (b.width || 1) * TILE_SIZE;
      const h = (b.length || 1) * TILE_SIZE;

      const color = BUILDING_COLORS[b.type] || "#6b4b3a";
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = "rgba(46,44,44,1)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    });
  };

  useEffect(() => {
    const unsub = useGameStore.subscribe((s: GameStore) =>
      drawBuildings(s.gameState.buildings),
    );

    try {
      const state = useGameStore.getState();
      drawBuildings(state.gameState.buildings);
    } catch {
      // ignore
    }

    return () => unsub();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onContext = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = mouseX - cameraRef.current.x;
      const worldY = mouseY - cameraRef.current.y;

      const col = Math.floor(worldX / TILE_SIZE);
      const row = Math.floor(worldY / TILE_SIZE);

      const state = useGameStore.getState();
      const buildings = Object.values(
        state.gameState.buildings || ({} as Record<string, Buildings>),
      ) as Buildings[];
      const found = buildings.find((b: Buildings) => {
        const bx = b.position.x;
        const by = b.position.y;
        const bw = b.width || 1;
        const bh = b.length || 1;
        return col >= bx && col < bx + bw && row >= by && row < by + bh;
      });

      if (found) {
        e.preventDefault();
        const f = found as Buildings;
        showPopup(
          `Здание: ${f.type}\nID: ${f.id}\nПозиция: (${f.position.x}, ${f.position.y})`,
          "info",
          5000,
        );
      }
    };

    container.addEventListener("contextmenu", onContext);
    return () => container.removeEventListener("contextmenu", onContext);
  }, [showPopup]);

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
      const sel = buildSelectionRef.current?.selected ?? null;
      if (!sel) return;

      const cfg = (
        BUILDING_CONFIG as unknown as Record<
          BuildingType,
          { width?: number; length?: number }
        >
      )[sel as BuildingType];
      const w = cfg?.width ?? 1;
      const h = cfg?.length ?? 1;

      const state = useGameStore.getState();
      const existing = Object.values(
        state.gameState.buildings || ({} as Record<string, Buildings>),
      ) as Buildings[];

      const overlap = existing.some((b: Buildings) => {
        const ax1 = col;
        const ay1 = row;
        const ax2 = col + w - 1;
        const ay2 = row + h - 1;

        const bx1 = b.position.x;
        const by1 = b.position.y;
        const bx2 = b.position.x + (b.width || 1) - 1;
        const by2 = b.position.y + (b.length || 1) - 1;

        return !(ax2 < bx1 || ax1 > bx2 || ay2 < by1 || ay1 > by2);
      });

      if (overlap) {
        showPopup("Нельзя разместить здание поверх другого здания", "error");
        return;
      }

      const tiles = new Set<number>();
      for (let yy = row; yy < row + h; yy++) {
        for (let xx = col; xx < col + w; xx++) {
          tiles.add(world.getTile(xx, yy));
        }
      }

      if (
        tiles.has(TileType.Sand) ||
        tiles.has(TileType.Water) ||
        tiles.has(TileType.DeepWater)
      ) {
        showPopup("Нельзя строить на воде или песке", "error");
        return;
      }

      if (
        tiles.has(TileType.Hill) &&
        (tiles.has(TileType.Grass) || tiles.has(TileType.PreHill))
      ) {
        showPopup(
          "Рельеф слишком нерoвный (холм + равнина) — найдите более ровное место",
          "warning",
        );
        return;
      }

      const res = useGameStore.getState().addBuilding(sel, { x: col, y: row });
      if (!res.success) {
        showPopup(res.message, "warning");
      }
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
