import { useEffect, useRef, useState } from "react";
import { TileType, WorldMap } from "../../engine/WorldMap.ts";
import { useBuildSelection } from "../../contexts/BuildSelectionContext";
import { usePopup } from "../../contexts/PopupContext";
import {
  BUILDING_CONFIG,
  BUILDING_SVG,
  EXPORT_RULES,
  MAP_DIMENSION,
  PALETTE,
  TILE_SIZE,
  TILE_SVG,
} from "../../engine/Constants";
import { useGameStore } from "../../Store/GameStore";
import {
  BuildingType,
  type Position,
  type Resident,
  Weather,
} from "../../engine/Types";
import type { Buildings, GameStore } from "../../engine/Types";
import { BUILDING_NAMES } from "../../engine/localization/locales.ts";
import { PathFinding } from "../../engine/CitizenWorker/pathfinding.ts";
import * as drawFns from "./map/draw";
import { workerManager } from "../../Store/WorkerManager.ts";

const PALETTE_RGBA: Record<number, [number, number, number, number]> = {};
for (const [key, hex] of Object.entries(PALETTE)) {
  const i = Number(key);
  PALETTE_RGBA[i] = [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    255,
  ];
}

export function useMapCanvas(
  isBackground: boolean,
  externalWorld?: WorldMap,
  tileTextures?: Record<number, HTMLImageElement>,
  buildingTextures?: Record<string, HTMLImageElement>,
  residentTextures?: Record<string, HTMLImageElement>,
  onMapReady?: () => void,
  centerCamera?: boolean,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const buildingsCanvasRef = useRef<HTMLCanvasElement>(null);
  const residentCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const weatherCanvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const renderQueued = useRef(false);
  const lowResCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const queueRender = () => {
    if (renderQueued.current) return;
    renderQueued.current = true;
    requestAnimationFrame(() => {
      renderQueued.current = false;
      renderAll();
    });
  };

  const renderMap = (camera: { x: number; y: number; zoom: number }) => {
    const canvas = mapCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const { x: camX, y: camY, zoom } = camera;
    const vpW = canvas.width;
    const vpH = canvas.height;

    const minCol = Math.max(0, Math.floor(-camX / (TILE_SIZE * zoom)));
    const minRow = Math.max(0, Math.floor(-camY / (TILE_SIZE * zoom)));
    const maxCol = Math.min(
      MAP_DIMENSION - 1,
      Math.ceil((vpW - camX) / (TILE_SIZE * zoom)) - 1,
    );
    const maxRow = Math.min(
      MAP_DIMENSION - 1,
      Math.ceil((vpH - camY) / (TILE_SIZE * zoom)) - 1,
    );
    const cols = maxCol - minCol + 1;
    const rows = maxRow - minRow + 1;
    if (cols <= 0 || rows <= 0) return;

    const tileSize = Math.ceil(TILE_SIZE * zoom);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, vpW, vpH);

    if (tileSize < 12) {
      if (!lowResCanvasRef.current) {
        lowResCanvasRef.current = document.createElement("canvas");
      }
      const temp = lowResCanvasRef.current;
      temp.width = cols;
      temp.height = rows;
      const tctx = temp.getContext("2d");
      if (!tctx) return;
      const imgData = tctx.createImageData(cols, rows);
      const data = imgData.data;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tile = world.getTile(minCol + c, minRow + r);
          const color = PALETTE_RGBA[tile];
          const idx = (r * cols + c) * 4;
          data[idx] = color[0];
          data[idx + 1] = color[1];
          data[idx + 2] = color[2];
          data[idx + 3] = color[3];
        }
      }
      tctx.putImageData(imgData, 0, 0);
      const sx = Math.round(minCol * TILE_SIZE * zoom + camX);
      const sy = Math.round(minRow * TILE_SIZE * zoom + camY);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(temp, sx, sy, cols * tileSize, rows * tileSize);
    } else {
      for (let row = minRow; row <= maxRow; row++) {
        const sy = Math.round(row * TILE_SIZE * zoom + camY);
        for (let col = minCol; col <= maxCol; col++) {
          const sx = Math.round(col * TILE_SIZE * zoom + camX);
          const tile = world.getTile(col, row);
          const texture = texturesRef.current[tile];
          if (texture && texturesLoaded) {
            ctx.drawImage(texture, sx, sy, tileSize, tileSize);
          } else {
            ctx.fillStyle = PALETTE[tile];
            ctx.fillRect(sx, sy, tileSize, tileSize);
          }
        }
      }
    }
  };

  const renderAll = () => {
    const cam = cameraRef.current;
    renderMap(cam);
    const s = useGameStore.getState();
    drawBuildings(s.gameState.buildings);
    drawOverlay();
  };

  const buildClientGrid = (
    w: WorldMap,
    builds: Record<string, Buildings>,
  ): number[][] => {
    const { width, height, data } = w;
    const grid: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        const tile = data[y * width + x];
        row.push(
          tile === TileType.Grass ||
            tile === TileType.Sand ||
            tile === TileType.PreHill ||
            tile === TileType.Hill
            ? 5
            : 999,
        );
      }
      grid.push(row);
    }
    Object.values(builds).forEach((b) => {
      for (let dy = 0; dy < (b.length || 1); dy++) {
        for (let dx = 0; dx < (b.width || 1); dx++) {
          const bx = b.position.x + dx;
          const by = b.position.y + dy;
          if (bx >= 0 && bx < width && by >= 0 && by < height) {
            if (b.type === BuildingType.Road) grid[by][bx] = 1;
            else if (b.type === BuildingType.Bridge) grid[by][bx] = 2;
            else grid[by][bx] = 999;
          }
        }
      }
    });
    return grid;
  };

  const getExitPos = (b: Buildings): Position => ({
    x: b.position.x + Math.floor((b.width || 1) / 2),
    y: b.position.y + (b.length || 1),
  });

  const computeExportPaths = (buildingId: string) => {
    const state = useGameStore.getState();
    const source = state.gameState.buildings[buildingId];
    if (
      !source ||
      !Array.isArray((source as any).export) ||
      (source as any).export.length === 0
    ) {
      exportPathsRef.current = [];
      drawOverlay();
      return;
    }

    const grid = buildClientGrid(world, state.gameState.buildings);
    const pf = new PathFinding(grid);

    const srcExit = getExitPos(source);

    const paths: { path: Position[]; targetName: string }[] = [];
    const exports = (source as any).export as string[];

    exports.forEach((targetId) => {
      const target = state.gameState.buildings[targetId];
      if (!target) return;

      const tgtExit = getExitPos(target);

      const raw = pf.findPath(srcExit, tgtExit);
      if (raw.length < 2) return;

      const path = [srcExit, ...raw, tgtExit];

      paths.push({
        path,
        targetName: BUILDING_NAMES[target.type] || target.type,
      });
    });

    exportPathsRef.current = paths;
    drawOverlay();
  };

  const getInitialCam = () => {
    if (centerCamera && !isBackground) {
      const buildings = useGameStore.getState().gameState.buildings;
      const main = Object.values(buildings).find(
        (b) => b.type === BuildingType.Main,
      );
      const viewW = window.innerWidth;
      const viewH = window.innerHeight;
      if (main) {
        const cx = (main.position.x + main.width / 2) * TILE_SIZE;
        const cy = (main.position.y + main.length / 2) * TILE_SIZE;
        return {
          x: viewW / 2 - cx,
          y: viewH / 2 - cy,
          zoom: 1,
        };
      }
      const worldSize = MAP_DIMENSION * TILE_SIZE;
      return {
        x: viewW / 2 - worldSize / 2,
        y: viewH / 2 - worldSize / 2,
        zoom: 1,
      };
    }
    return { x: -2000, y: -2000, zoom: 1 };
  };
  const cameraRef = useRef(getInitialCam());
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const hoveredTileRef = useRef<{ col: number; row: number } | null>(null);
  const isDragPlacingRef = useRef(false);
  const dragStartRef = useRef<{ col: number; row: number } | null>(null);
  const dragEndRef = useRef<{ col: number; row: number } | null>(null);
  const wasDragPlacedRef = useRef(false);
  const dragTypeRef = useRef<BuildingType | "remove" | null>(null);
  const exportPathsRef = useRef<{ path: Position[]; targetName: string }[]>([]);

  const texturesRef = useRef<Record<number, HTMLImageElement>>(
    tileTextures ?? {},
  );
  const [texturesLoaded, setTexturesLoaded] = useState(!!tileTextures);

  const buildingTexturesRef = useRef<Record<string, HTMLImageElement>>(
    buildingTextures ?? {},
  );

  const residentTexturesRef = useRef<Record<string, HTMLImageElement>>(
    residentTextures ?? {},
  );

  const prevResidentPosRef = useRef<Record<string, { x: number; y: number }>>(
    {},
  );
  const lastTickTimeRef = useRef(performance.now());
  const TICK_INTERVAL = 1000;

  const { setSelected } = useBuildSelection();

  const [world] = useState(() => {
    if (externalWorld) return externalWorld;
    const w = new WorldMap();
    w.generate();
    return w;
  });
  useEffect(() => {
    if (!world) return;
    const tiles = world.data;
    const width = world.width;
    const height = world.height;

    const state = useGameStore.getState();
    workerManager.init((payload) =>
      useGameStore.getState().applyWorkerUpdate(payload),
    );

    async function init() {
      await workerManager.sendAndWait(
        "INIT_WORLD",
        {
          grid: tiles,
          buildings: state.gameState.buildings,
          width,
          height,
        },
        "INIT_DONE",
      );
      workerManager.send("SET_RESIDENTS", {
        residents: state.gameState.residents,
      });
    }
    init();

    return () => {
      workerManager.terminate();
    };
  }, [world]);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const [clickOffset, setClickOffset] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const savedStateRef = useRef<{
    buildId: string;
    clickOffset: { x: number; y: number } | null;
  } | null>(null);
  const clickOffsetRef = useRef<{ x: number; y: number } | null>(null);
  clickOffsetRef.current = clickOffset;

  const [infoBoxPos, setInfoBoxPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<{
    building: Buildings;
    position: Position;
    isValid: boolean;
  } | null>(null);
  const draggedBuildingRef = useRef<{
    id: string;
    building: Buildings;
  } | null>(null);

  const activeBuilding = useGameStore((state) =>
    selectedBuildId ? state.gameState.buildings[selectedBuildId] : null,
  );

  useEffect(() => {
    if (selectedBuildId) {
      computeExportPaths(selectedBuildId);
    } else {
      exportPathsRef.current = [];
      drawOverlay();
    }
  }, [selectedBuildId]);

  useEffect(() => {
    let prevId: string | null = null;

    const unsub = useGameStore.subscribe((s) => {
      const currId = s.pendingExportSourceId;
      if (currId === prevId) return;

      if (currId) {
        savedStateRef.current = {
          buildId: currId,
          clickOffset: clickOffsetRef.current,
        };
        setSelectedBuildId(null);
        setClickOffset(null);
        setInfoBoxPos(null);
      } else if (prevId) {
        const saved = savedStateRef.current;
        savedStateRef.current = null;
        if (saved) {
          setSelectedBuildId(saved.buildId);
          setClickOffset(saved.clickOffset);
        }
      }
      prevId = currId;
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (tileTextures) return;
    const types = Object.keys(TILE_SVG).map(Number);
    let loadedCount = 0;

    types.forEach((type) => {
      const img = new Image();
      img.src = TILE_SVG[type as keyof typeof TILE_SVG];

      img.onload = () => {
        texturesRef.current[type] = img;
        loadedCount++;
        if (loadedCount === types.length) {
          setTexturesLoaded(true);
        }
      };
    });
  }, [tileTextures]);

  useEffect(() => {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const dpr = 1;

    const mc = mapCanvasRef.current;
    if (mc) {
      mc.style.width = `${vpW}px`;
      mc.style.height = `${vpH}px`;
      mc.width = Math.floor(vpW * dpr);
      mc.height = Math.floor(vpH * dpr);
      const ctx = mc.getContext("2d", { alpha: false });
      if (ctx) ctx.imageSmoothingEnabled = false;
    }

    [
      overlayCanvasRef,
      buildingsCanvasRef,
      residentCanvasRef,
      weatherCanvasRef,
    ].forEach((ref) => {
      const c = ref.current;
      if (!c) return;
      c.style.width = `${vpW}px`;
      c.style.height = `${vpH}px`;
      c.width = Math.floor(vpW * dpr);
      c.height = Math.floor(vpH * dpr);
      const ctx = c.getContext("2d");
      if (ctx) ctx.imageSmoothingEnabled = false;
    });

    const cam = cameraRef.current;
    renderMap(cam);
    const s = useGameStore.getState();
    drawBuildings(s.gameState.buildings);

    onMapReady?.();
  }, [world, texturesLoaded]);

  useEffect(() => {
    const onResize = () => {
      const vpW = window.innerWidth;
      const vpH = window.innerHeight;
      [
        mapCanvasRef,
        overlayCanvasRef,
        buildingsCanvasRef,
        residentCanvasRef,
        weatherCanvasRef,
      ].forEach((ref) => {
        const c = ref.current;
        if (!c) return;
        c.style.width = `${vpW}px`;
        c.style.height = `${vpH}px`;
        c.width = Math.floor(vpW);
        c.height = Math.floor(vpH);
      });
      queueRender();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { selected } = useBuildSelection();
  const buildSelectionRef = useRef<BuildingType | "remove" | null>(null);
  const { showPopup } = usePopup();
  useEffect(() => {
    buildSelectionRef.current = selected;
  }, [selected]);

  const drawOverlay = () => {
    const overlay = overlayCanvasRef.current;
    const hovered = hoveredTileRef.current;
    const sel = buildSelectionRef.current;
    let cfg;
    if (sel) {
      cfg = (
        BUILDING_CONFIG as unknown as Record<
          BuildingType,
          { width?: number; length?: number }
        >
      )[sel as BuildingType];
    }
    drawFns.drawOverlay(
      overlay,
      hovered,
      cameraRef.current,
      cfg,
      isDragPlacingRef.current ? dragStartRef.current : null,
      isDragPlacingRef.current ? dragEndRef.current : null,
    );
    drawFns.drawExportRoutes(
      overlay,
      cameraRef.current,
      exportPathsRef.current,
    );

    if (dragPreview && overlay) {
      drawFns.drawDragPreview(
        overlay,
        cameraRef.current,
        dragPreview.building,
        dragPreview.position,
        dragPreview.isValid,
      );
    }
  };

  const drawBuildings = (buildings: Record<string, Buildings> | null) =>
    drawFns.drawBuildings(
      buildingsCanvasRef.current,
      buildings,
      buildingTexturesRef.current,
      cameraRef.current,
    );

  const drawResidents = (
    residents: Record<string, Resident> | null,
    progress: number,
  ) => {
    drawFns.drawResidents(
      residentCanvasRef.current,
      residents,
      residentTexturesRef.current,
      cameraRef.current,
      prevResidentPosRef.current,
      progress,
    );
  };

  const getPositions = (
    residents: Record<string, Resident>,
  ): Record<string, { x: number; y: number }> => {
    const pos: Record<string, { x: number; y: number }> = {};
    for (const id in residents) {
      pos[id] = { ...residents[id].position };
    }
    return pos;
  };

  const targetPosRef = useRef<Record<string, { x: number; y: number }>>({});

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
    const unsub = useGameStore.subscribe((s: GameStore) => {
      prevResidentPosRef.current = targetPosRef.current;
      targetPosRef.current = getPositions(s.gameState.residents);
      lastTickTimeRef.current = performance.now();
    });

    const state = useGameStore.getState();
    const initial = getPositions(state.gameState.residents);
    prevResidentPosRef.current = initial;
    targetPosRef.current = initial;

    let running = true;
    const frame = () => {
      if (!running) return;
      const now = performance.now();
      const elapsed = now - lastTickTimeRef.current;
      const progress = Math.min(elapsed / TICK_INTERVAL, 1);
      const state = useGameStore.getState();
      drawResidents(state.gameState.residents, progress);
      if (state.gameState.meta.currentWeather === Weather.Rain) {
        drawFns.drawRain(weatherCanvasRef.current);
      } else {
        const wc = weatherCanvasRef.current;
        if (wc) {
          const wctx = wc.getContext("2d");
          if (wctx) wctx.clearRect(0, 0, wc.width, wc.height);
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    return () => {
      unsub();
      running = false;
    };
  }, []);

  useEffect(() => {
    if (buildingTextures) return;
    Object.entries(BUILDING_SVG).forEach(([key, url]) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        buildingTexturesRef.current[key] = img;
        const currentBuildings = useGameStore.getState().gameState.buildings;
        drawBuildings(currentBuildings);
      };
    });
  }, [buildingTextures]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onContext = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - cameraRef.current.x) / cameraRef.current.zoom;
      const worldY = (mouseY - cameraRef.current.y) / cameraRef.current.zoom;

      const col = Math.floor(worldX / TILE_SIZE);
      const row = Math.floor(worldY / TILE_SIZE);

      const state = useGameStore.getState();
      const buildings = Object.values(state.gameState.buildings) as Buildings[];
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

        const clickCanvasX =
          (mouseX - cameraRef.current.x) / cameraRef.current.zoom;
        const clickCanvasY =
          (mouseY - cameraRef.current.y) / cameraRef.current.zoom;
        const offsetX = clickCanvasX - f.position.x * TILE_SIZE;
        const offsetY = clickCanvasY - f.position.y * TILE_SIZE;

        setSelectedBuildId(f.id);
        setClickOffset({ x: offsetX, y: offsetY });

        setSelected(null);
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
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomSpeed = 0.002;
        const delta = -e.deltaY;
        const oldZoom = cameraRef.current.zoom;
        const newZoom = Math.min(
          Math.max(oldZoom + delta * zoomSpeed, 0.35),
          2,
        );

        const worldX = (mouseX - cameraRef.current.x) / oldZoom;
        const worldY = (mouseY - cameraRef.current.y) / oldZoom;

        cameraRef.current.zoom = newZoom;
        cameraRef.current.x = mouseX - worldX * newZoom;
        cameraRef.current.y = mouseY - worldY * newZoom;
      } else {
        cameraRef.current.x -= e.deltaX;
        cameraRef.current.y -= e.deltaY;
      }

      queueRender();
      updateInfoBoxPosition();
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
      queueRender();
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
      queueRender();

      updateInfoBoxPosition();
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - cameraRef.current.x) / cameraRef.current.zoom;
    const worldY = (mouseY - cameraRef.current.y) / cameraRef.current.zoom;

    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);

    if (isDragging && draggedBuildingRef.current) {
      if (col >= 0 && col < MAP_DIMENSION && row >= 0 && row < MAP_DIMENSION) {
        const isValid = checkPlacementValid(
          col,
          row,
          draggedBuildingRef.current.building,
          draggedBuildingRef.current.id,
        );
        setDragPreview({
          building: draggedBuildingRef.current.building,
          position: { x: col, y: row },
          isValid,
        });
      }
    }

    if (col >= 0 && col < MAP_DIMENSION && row >= 0 && row < MAP_DIMENSION) {
      hoveredTileRef.current = { col, row };
      if (isDragPlacingRef.current) {
        dragEndRef.current = { col, row };
      }
    } else {
      hoveredTileRef.current = null;
    }

    drawOverlay();
  };

  const checkPlacementValid = (
    col: number,
    row: number,
    building: Buildings,
    excludeId?: string,
  ): boolean => {
    const w = building.width || 1;
    const h = building.length || 1;

    if (
      col < 0 ||
      col + w > MAP_DIMENSION ||
      row < 0 ||
      row + h > MAP_DIMENSION
    ) {
      return false;
    }

    const state = useGameStore.getState();
    const existing = Object.values(state.gameState.buildings).filter(
      (b) => b.id !== excludeId,
    );

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

    if (overlap) return false;

    const tiles = new Set<number>();
    for (let yy = row; yy < row + h; yy++) {
      for (let xx = col; xx < col + w; xx++) {
        tiles.add(world.getTile(xx, yy));
      }
    }

    return (
      !tiles.has(TileType.Sand) &&
      !tiles.has(TileType.Water) &&
      !tiles.has(TileType.DeepWater) &&
      !(
        tiles.has(TileType.Hill) &&
        (tiles.has(TileType.Grass) || tiles.has(TileType.PreHill))
      )
    );
  };

  const startDrag = (build: Buildings) => {
    setIsDragging(true);
    draggedBuildingRef.current = { id: build.id, building: build };
    setDragPreview({
      building: build,
      position: build.position,
      isValid: true,
    });
    setSelectedBuildId(null);
    setClickOffset(null);
    setInfoBoxPos(null);
  };

  const handleToolAction = (col: number, row: number, mode: "remove") => {
    const state = useGameStore.getState();

    const clickedBuild = Object.values(state.gameState.buildings).find((b) => {
      return (
        col >= b.position.x &&
        col < b.position.x + (b.width || 1) &&
        row >= b.position.y &&
        row < b.position.y + (b.length || 1)
      );
    });

    if (mode === "remove") {
      if (clickedBuild) {
        const result = useGameStore.getState().removeBuilding(clickedBuild.id);
        if (result.success) {
          showPopup(result.message, "success");
          setSelectedBuildId(null);
          setClickOffset(null);
          setInfoBoxPos(null);
        } else {
          showPopup(result.message, "error");
        }
      } else {
        showPopup("Здание не найдено", "warning");
      }
      return;
    }
  };

  const onClick = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - cameraRef.current.x) / cameraRef.current.zoom;
    const worldY = (mouseY - cameraRef.current.y) / cameraRef.current.zoom;

    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);

    if (col >= 0 && col < MAP_DIMENSION && row >= 0 && row < MAP_DIMENSION) {
      const pendingId = useGameStore.getState().pendingExportSourceId;
      if (pendingId) {
        const state = useGameStore.getState();
        const clickedBuild = Object.values(state.gameState.buildings).find(
          (b) => {
            return (
              col >= b.position.x &&
              col < b.position.x + (b.width || 1) &&
              row >= b.position.y &&
              row < b.position.y + (b.length || 1)
            );
          },
        );
        if (clickedBuild && clickedBuild.id !== pendingId) {
          const source = state.gameState.buildings[pendingId];
          const allowed = EXPORT_RULES[source?.type];
          if (!allowed || !allowed.includes(clickedBuild.type)) {
            showPopup("Это здание не может принимать экспорт", "error");
          } else {
            useGameStore
              .getState()
              .linkExportBuildings(pendingId, clickedBuild.id);
            showPopup("Связь экспорта установлена", "success");
            computeExportPaths(pendingId);
          }
        }
        useGameStore.getState().setPendingExportSource(null);
        return;
      }

      const sel = buildSelectionRef.current;

      if (isDragPlacingRef.current || wasDragPlacedRef.current) {
        wasDragPlacedRef.current = false;
        return;
      }

      if (sel === "remove") {
        handleToolAction(col, row, sel);
        return;
      }

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
        showPopup("Рельеф слишком нерoвный", "warning");
        return;
      }

      useGameStore.getState().addBuilding(sel, { x: col, y: row });
    }
  };

  const updateInfoBoxPosition = () => {
    const b = activeBuilding;
    const offs = clickOffset;

    if (!b || !offs) return;

    const { x, y, zoom } = cameraRef.current;
    const canvasX = b.position.x * TILE_SIZE + offs.x;
    const canvasY = b.position.y * TILE_SIZE + offs.y;

    const screenX = Math.round(canvasX * zoom + x);
    const screenY = Math.round(canvasY * zoom + y);

    setInfoBoxPos({ x: screenX, y: screenY });
  };

  useEffect(() => {
    if (activeBuilding && clickOffset) {
      updateInfoBoxPosition();
    }
  }, [activeBuilding, clickOffset]);

  const onInfoBoxClose = () => {
    setSelectedBuildId(null);
    setClickOffset(null);
    setInfoBoxPos(null);
  };

  return {
    containerRef,
    mapCanvasRef,
    buildingsCanvasRef,
    residentCanvasRef,
    overlayCanvasRef,
    weatherCanvasRef,
    onMouseMove,
    onClick,
    buildInfo:
      activeBuilding && clickOffset
        ? { build: activeBuilding, position: clickOffset }
        : null,
    infoBoxPos,
    onInfoBoxClose,
    onMoveStart: startDrag,
    isDragging,
    onMouseDown: (e: React.MouseEvent) => {
      if ((e as any).button === 1) {
        e.preventDefault();
        isPanningRef.current = true;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      if ((e as any).button === 0) {
        const sel = buildSelectionRef.current;
        if (
          sel === BuildingType.Garden ||
          sel === BuildingType.Road ||
          sel === BuildingType.Bridge ||
          sel === "remove"
        ) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          const worldX =
            (mouseX - cameraRef.current.x) / cameraRef.current.zoom;
          const worldY =
            (mouseY - cameraRef.current.y) / cameraRef.current.zoom;
          const col = Math.floor(worldX / TILE_SIZE);
          const row = Math.floor(worldY / TILE_SIZE);
          if (
            col >= 0 &&
            col < MAP_DIMENSION &&
            row >= 0 &&
            row < MAP_DIMENSION
          ) {
            isDragPlacingRef.current = true;
            dragStartRef.current = { col, row };
            dragEndRef.current = { col, row };
            dragTypeRef.current = sel;
          }
        }
      }
    },
    onMouseUp: (e: React.MouseEvent) => {
      if ((e as any).button === 1) {
        isPanningRef.current = false;
        return;
      }
      if ((e as any).button === 0) {
        if (isDragging && draggedBuildingRef.current && dragPreview) {
          if (dragPreview.isValid) {
            const result = useGameStore
              .getState()
              .moveBuilding(
                draggedBuildingRef.current.id,
                dragPreview.position,
              );
            if (result.success) {
              showPopup(result.message, "success");
            } else {
              showPopup(result.message, "error");
            }
          }
          setIsDragging(false);
          setDragPreview(null);
          draggedBuildingRef.current = null;
          drawOverlay();
          return;
        }

        if (isDragPlacingRef.current) {
          isDragPlacingRef.current = false;
          wasDragPlacedRef.current = true;

          const start = dragStartRef.current;
          const end = dragEndRef.current;
          const dragType = dragTypeRef.current;
          dragStartRef.current = null;
          dragEndRef.current = null;
          dragTypeRef.current = null;

          if (!start || !end || !dragType) {
            drawOverlay();
            return;
          }

          const col = Math.min(start.col, end.col);
          const row = Math.min(start.row, end.row);
          const w = Math.abs(end.col - start.col) + 1;
          const h = Math.abs(end.row - start.row) + 1;

          const state = useGameStore.getState();

          if (dragType !== "remove") {
            const existing = Object.values(
              state.gameState.buildings || ({} as Record<string, Buildings>),
            ) as Buildings[];

            const overlap = existing.some((b: Buildings) => {
              const ax1 = col,
                ay1 = row;
              const ax2 = col + w - 1,
                ay2 = row + h - 1;
              const bx1 = b.position.x,
                by1 = b.position.y;
              const bx2 = b.position.x + (b.width || 1) - 1,
                by2 = b.position.y + (b.length || 1) - 1;
              return !(ax2 < bx1 || ax1 > bx2 || ay2 < by1 || ay1 > by2);
            });

            if (overlap) {
              showPopup(
                "Нельзя разместить здание поверх другого здания",
                "error",
              );
              drawOverlay();
              return;
            }

            const tiles = new Set<number>();
            for (let yy = row; yy < row + h; yy++) {
              for (let xx = col; xx < col + w; xx++) {
                tiles.add(world.getTile(xx, yy));
              }
            }

            if (dragType === BuildingType.Bridge) {
              const isLand = (t: number) =>
                t === TileType.Grass ||
                t === TileType.Hill ||
                t === TileType.PreHill;

              if (
                !isLand(world.getTile(start.col, start.row)) ||
                !isLand(world.getTile(end.col, end.row))
              ) {
                showPopup(
                  "Мост должен начинаться и заканчиваться на суше",
                  "error",
                );
                drawOverlay();
                return;
              }

              for (let yy = row; yy < row + h; yy++) {
                for (let xx = col; xx < col + w; xx++) {
                  if (
                    (xx === start.col && yy === start.row) ||
                    (xx === end.col && yy === end.row)
                  )
                    continue;
                  const tile = world.getTile(xx, yy);
                  if (
                    tile !== TileType.Water &&
                    tile !== TileType.DeepWater &&
                    tile !== TileType.Sand
                  ) {
                    showPopup(
                      "Мост можно строить только над водой или песком",
                      "error",
                    );
                    drawOverlay();
                    return;
                  }
                }
              }
            } else {
              if (
                tiles.has(TileType.Sand) ||
                tiles.has(TileType.Water) ||
                tiles.has(TileType.DeepWater)
              ) {
                showPopup("Нельзя строить на воде или песке", "error");
                drawOverlay();
                return;
              }

              if (
                tiles.has(TileType.Hill) &&
                (tiles.has(TileType.Grass) || tiles.has(TileType.PreHill))
              ) {
                showPopup("Рельеф слишком нерoвный", "warning");
                drawOverlay();
                return;
              }
            }

            useGameStore.getState().addBuilding(
              dragType,
              { x: col, y: row },
              { width: w, length: h },
            );
            drawOverlay();
          } else {
            const buildingsToRemove = Object.values(
              state.gameState.buildings,
            ).filter((b) => {
              const bx1 = b.position.x;
              const by1 = b.position.y;
              const bx2 = b.position.x + (b.width || 1) - 1;
              const by2 = b.position.y + (b.length || 1) - 1;
              return !(
                bx2 < col ||
                bx1 > col + w - 1 ||
                by2 < row ||
                by1 > row + h - 1
              );
            });

            let removedCount = 0;
            let failCount = 0;
            for (const building of buildingsToRemove) {
              const result = useGameStore
                .getState()
                .removeBuilding(building.id);
              if (result.success) {
                removedCount++;
              } else {
                failCount++;
              }
            }
            if (removedCount > 0) {
              showPopup(`Удалено: ${removedCount} зданий`, "success");
            }
            if (failCount > 0) {
              showPopup(`Не удалось удалить: ${failCount} зданий`, "warning");
            }
            drawOverlay();
          }
        }
      }
    },
  };
}
