import {
  BuildingType,
  type Buildings,
  type Garden,
  type Position,
  type Resident,
} from "../../../engine/Types";
import { TILE_SIZE, BUILDING_COLORS } from "../../../engine/Constants";

function getGardenTextureKey(b: Buildings): string {
  if (b.type !== BuildingType.Garden) return b.type;
  const g = b as Garden;
  if (!g.harvest) return "GARDEN";
  if (g.harvest.isReady) return "GARDEN_READY";
  if (g.harvest.growthProgress >= 50) return "GARDEN_MED";
  return "GARDEN_PLANTED";
}

const RAIN_DROPS = Array.from({ length: 150 }, () => ({
  x: Math.random(),
  y: Math.random(),
  length: 15 + Math.random() * 25,
  speed: 250 + Math.random() * 350,
  opacity: 0.3 + Math.random() * 0.5,
}));

export function drawRain(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const time = performance.now() / 1000;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;

  for (const drop of RAIN_DROPS) {
    const offset = (time * drop.speed) % (h + drop.length * 2);
    const y = ((drop.y * h + offset) % (h + drop.length * 2)) - drop.length * 2;
    const x = drop.x * w;

    ctx.globalAlpha = drop.opacity;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 8, y + drop.length);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  ctx.globalAlpha = 1;
}

export const drawBuildings = (
  canvas: HTMLCanvasElement | null,
  buildings: Record<string, Buildings> | null,
  textures: Record<string, HTMLImageElement>,
  camera: { x: number; y: number; zoom: number },
) => {
  if (!canvas || !buildings) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  Object.values(buildings).forEach((b) => {
    const sx = Math.round(b.position.x * TILE_SIZE * camera.zoom + camera.x);
    const sy = Math.round(b.position.y * TILE_SIZE * camera.zoom + camera.y);
    const sw = Math.round((b.width || 1) * TILE_SIZE * camera.zoom);
    const sh = Math.round((b.length || 1) * TILE_SIZE * camera.zoom);

    if (sx + sw < 0 || sx > canvas.width || sy + sh < 0 || sy > canvas.height)
      return;

    const sprite = textures[getGardenTextureKey(b)];

    if (sprite && sprite.complete) {
      if (
        b.type === BuildingType.Garden ||
        b.type === BuildingType.Road ||
        b.type === BuildingType.Bridge
      ) {
        const ts = Math.round(TILE_SIZE * camera.zoom);
        for (let dx = 0; dx < (b.width || 1); dx++) {
          for (let dy = 0; dy < (b.length || 1); dy++) {
            const tx = Math.round(
              (b.position.x + dx) * TILE_SIZE * camera.zoom + camera.x,
            );
            const ty = Math.round(
              (b.position.y + dy) * TILE_SIZE * camera.zoom + camera.y,
            );
            ctx.drawImage(sprite, tx, ty, ts, ts);
          }
        }
      } else {
        // Bottom-aligned with sprite aspect ratio — sprite can visually "stick up"
        // above the tile footprint (Stardew Valley style)
        const naturalRatio = sprite.naturalHeight / sprite.naturalWidth;
        const visualH = Math.round(sw * naturalRatio);
        const drawY = sy + sh - visualH;
        ctx.drawImage(sprite, sx, drawY, sw, visualH);
      }
    } else {
      ctx.fillStyle = BUILDING_COLORS[b.type] || "#ccc";
      ctx.fillRect(sx, sy, sw, sh);
    }
  });
};

export const drawResidents = (
  canvas: HTMLCanvasElement | null,
  residents: Record<string, Resident> | null,
  textures: Record<string, HTMLImageElement>,
  camera: { x: number; y: number; zoom: number },
  prevPositions: Record<string, { x: number; y: number }>,
  progress: number,
) => {
  if (!canvas || !residents) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const size = Math.round(TILE_SIZE * camera.zoom);
  const w = canvas.width;
  const h = canvas.height;

  Object.values(residents).forEach((r) => {
    const prev = prevPositions[r.id] ?? r.position;
    const drawX = prev.x + (r.position.x - prev.x) * progress;
    const drawY = prev.y + (r.position.y - prev.y) * progress;
    const sx = Math.round(drawX * TILE_SIZE * camera.zoom + camera.x);
    const sy = Math.round(drawY * TILE_SIZE * camera.zoom + camera.y);

    if (sx + size < 0 || sy + size < 0 || sx > w || sy > h) return;
    const sprite = textures[r.gender];

    if (sprite && sprite.complete) {
      ctx.drawImage(sprite, sx, sy, size, size);
    } else {
      ctx.fillStyle = r.gender === "Male" ? "#4a90d9" : "#e88aa5";
      ctx.beginPath();
      ctx.arc(sx + size / 2, sy + size / 2, size / 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
};

export function drawExportRoutes(
  canvas: HTMLCanvasElement | null,
  camera: { x: number; y: number; zoom: number },
  paths: { path: Position[]; targetName: string }[],
) {
  if (!canvas || paths.length === 0) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const ts2 = Math.round(TILE_SIZE * camera.zoom) / 2;

  paths.forEach(({ path }) => {
    if (path.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(
      Math.round(path[0].x * TILE_SIZE * camera.zoom + camera.x) + ts2,
      Math.round(path[0].y * TILE_SIZE * camera.zoom + camera.y) + ts2,
    );
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(
        Math.round(path[i].x * TILE_SIZE * camera.zoom + camera.x) + ts2,
        Math.round(path[i].y * TILE_SIZE * camera.zoom + camera.y) + ts2,
      );
    }

    ctx.save();
    ctx.strokeStyle = "rgba(46, 204, 113, 0.85)";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.restore();

    const last = path[path.length - 1];
    const labX = Math.round(last.x * TILE_SIZE * camera.zoom + camera.x) + ts2;

    ctx.save();
    ctx.fillStyle = "rgba(46, 204, 113, 0.9)";
    const sx2 =
      Math.round(path[0].x * TILE_SIZE * camera.zoom + camera.x) + ts2;
    const sy2 =
      Math.round(path[0].y * TILE_SIZE * camera.zoom + camera.y) + ts2;
    ctx.beginPath();
    ctx.arc(sx2, sy2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(
      labX,
      Math.round(last.y * TILE_SIZE * camera.zoom + camera.y) + ts2,
      4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  });
}

export function drawOverlay(
  overlayCanvas: HTMLCanvasElement | null,
  hovered: { col: number; row: number } | null,
  camera: { x: number; y: number; zoom: number },
  selectedCfg?: { width?: number; length?: number },
  dragStart?: { col: number; row: number } | null,
  dragEnd?: { col: number; row: number } | null,
) {
  if (!overlayCanvas) return;
  const ctx = overlayCanvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  if (dragStart && dragEnd) {
    const col = Math.min(dragStart.col, dragEnd.col);
    const row = Math.min(dragStart.row, dragEnd.row);
    const w = Math.abs(dragEnd.col - dragStart.col) + 1;
    const h = Math.abs(dragEnd.row - dragStart.row) + 1;

    const cx = Math.round(col * TILE_SIZE * camera.zoom + camera.x);
    const cy = Math.round(row * TILE_SIZE * camera.zoom + camera.y);
    const cw = Math.round(w * TILE_SIZE * camera.zoom);
    const ch = Math.round(h * TILE_SIZE * camera.zoom);

    ctx.strokeStyle = "rgba(46, 44, 44, 1)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "rgba(78,48,23,0.12)";
    ctx.fillRect(cx + 1, cy + 1, cw - 2, ch - 2);
    ctx.strokeRect(cx + 1, cy + 1, cw - 2, ch - 2);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(`${w}x${h}`, cx + 4, cy + 18);
    return;
  }

  if (!hovered) return;

  ctx.strokeStyle = "#acacac";
  ctx.lineWidth = 2;

  if (selectedCfg) {
    const cx = Math.round(hovered.col * TILE_SIZE * camera.zoom + camera.x);
    const cy = Math.round(hovered.row * TILE_SIZE * camera.zoom + camera.y);
    const cw = Math.round((selectedCfg.width ?? 1) * TILE_SIZE * camera.zoom);
    const ch = Math.round((selectedCfg.length ?? 1) * TILE_SIZE * camera.zoom);
    ctx.strokeStyle = "rgba(46, 44, 44, 1)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "rgba(78,48,23,0.12)";
    ctx.fillRect(cx + 1, cy + 1, cw - 2, ch - 2);
    ctx.strokeRect(cx + 1, cy + 1, cw - 2, ch - 2);
  } else {
    const cx = Math.round(hovered.col * TILE_SIZE * camera.zoom + camera.x);
    const cy = Math.round(hovered.row * TILE_SIZE * camera.zoom + camera.y);
    const cs = Math.round(TILE_SIZE * camera.zoom);
    ctx.strokeRect(cx + 1, cy + 1, cs - 2, cs - 2);
  }
}

export function drawDragPreview(
  canvas: HTMLCanvasElement | null,
  camera: { x: number; y: number; zoom: number },
  building: Buildings,
  position: Position,
  isValid: boolean,
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const sx = Math.round(position.x * TILE_SIZE * camera.zoom + camera.x);
  const sy = Math.round(position.y * TILE_SIZE * camera.zoom + camera.y);
  const sw = Math.round((building.width || 1) * TILE_SIZE * camera.zoom);
  const sh = Math.round((building.length || 1) * TILE_SIZE * camera.zoom);

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = isValid ? "rgba(92, 184, 92, 0.3)" : "rgba(217, 83, 79, 0.3)";
  ctx.fillRect(sx, sy, sw, sh);
  ctx.strokeStyle = isValid ? "#5cb85c" : "#d9534f";
  ctx.lineWidth = 3;
  ctx.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2);
  ctx.globalAlpha = 1;
  ctx.restore();
}
