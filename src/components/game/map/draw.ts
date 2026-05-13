import {
  BuildingType,
  type Buildings,
  type Garden,
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
      if (b.type === BuildingType.Garden) {
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
        ctx.drawImage(sprite, sx, sy, sw, sh);
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
