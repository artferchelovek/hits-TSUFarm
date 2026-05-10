import { useEffect, useRef, useState } from "react";
import { TileType, WorldMap } from "../../engine/WorldMap.ts";
import { useBuildSelection } from "../../contexts/BuildSelectionContext";
import { usePopup } from "../../contexts/PopupContext";
import {
  BUILDING_CONFIG,
  BUILDING_SVG,
  MAP_DIMENSION,
  PALETTE,
  TILE_SIZE,
  TILE_SVG,
} from "../../engine/Constants";
import { useGameStore } from "../../Store/GameStore";
import { BuildingType } from "../../engine/Types";
import type { Buildings, GameStore } from "../../engine/Types";
import updateTransform from "./map/camera";
import * as drawFns from "./map/draw";
import { workerManager } from "../../Store/WorkerManager.ts";

export function useMapCanvas(
  isBackground: boolean,
  externalWorld?: WorldMap,
  tileTextures?: Record<number, HTMLImageElement>,
  buildingTextures?: Record<string, HTMLImageElement>,
  onMapReady?: () => void,
  centerCamera?: boolean,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const buildingsCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

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

  const texturesRef = useRef<Record<number, HTMLImageElement>>(
    tileTextures ?? {},
  );
  const [texturesLoaded, setTexturesLoaded] = useState(!!tileTextures);

  const buildingTexturesRef = useRef<Record<string, HTMLImageElement>>(
    buildingTextures ?? {},
  );

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
  const [buildInfo] = useState<null | {
    build: Buildings;
    position: { x: number; y: number };
  }>(null);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const [clickOffset, setClickOffset] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [infoBoxPos, setInfoBoxPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const activeBuilding = useGameStore((state) =>
    selectedBuildId ? state.gameState.buildings[selectedBuildId] : null,
  );

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
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const size = MAP_DIMENSION * TILE_SIZE;
    const dpr = 1;

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
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        const texture = texturesRef.current[tile];

        if (texture && texturesLoaded) {
          ctx.drawImage(texture, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = PALETTE[tile];
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
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

    updateTransform(
      cameraRef,
      mapCanvasRef,
      buildingsCanvasRef,
      overlayCanvasRef,
    );

    onMapReady?.();
  }, [world, texturesLoaded]);

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
    const hovered = hoveredTileRef.current;
    const sel = buildSelectionRef.current?.selected ?? null;
    let cfg;
    if (sel) {
      cfg = (
        BUILDING_CONFIG as unknown as Record<
          BuildingType,
          { width?: number; length?: number }
        >
      )[sel as BuildingType];
    }
    drawFns.drawOverlay(overlay, hovered, cfg);
  };

  const drawBuildings = (buildings: Record<string, Buildings> | null) =>
    drawFns.drawBuildings(
      buildingsCanvasRef.current,
      buildings,
      buildingTexturesRef.current,
    );

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
        const newZoom = Math.min(Math.max(oldZoom + delta * zoomSpeed, 0.2), 2);

        const worldX = (mouseX - cameraRef.current.x) / oldZoom;
        const worldY = (mouseY - cameraRef.current.y) / oldZoom;

        cameraRef.current.zoom = newZoom;
        cameraRef.current.x = mouseX - worldX * newZoom;
        cameraRef.current.y = mouseY - worldY * newZoom;
      } else {
        cameraRef.current.x -= e.deltaX;
        cameraRef.current.y -= e.deltaY;
      }

      updateTransform(
        cameraRef,
        mapCanvasRef,
        buildingsCanvasRef,
        overlayCanvasRef,
      );

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
      updateTransform(
        cameraRef,
        mapCanvasRef,
        buildingsCanvasRef,
        overlayCanvasRef,
      );
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
      updateTransform(
        cameraRef,
        mapCanvasRef,
        buildingsCanvasRef,
        overlayCanvasRef,
      );

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

    const worldX = (mouseX - cameraRef.current.x) / cameraRef.current.zoom;
    const worldY = (mouseY - cameraRef.current.y) / cameraRef.current.zoom;

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
    overlayCanvasRef,
    onMouseMove,
    onClick,
    buildInfo:
      activeBuilding && clickOffset
        ? { build: activeBuilding, position: clickOffset }
        : null,
    infoBoxPos,
    onInfoBoxClose,
    onMouseDown: (e: React.MouseEvent) => {
      if ((e as any).button !== 1) return;
      e.preventDefault();
      isPanningRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    },
    onMouseUp: (e: React.MouseEvent) => {
      if ((e as any).button !== 1) return;
      isPanningRef.current = false;
    },
  };
}

export default useMapCanvas;
