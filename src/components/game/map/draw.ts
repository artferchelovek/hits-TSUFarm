import type { Buildings } from "../../../engine/Types";
import { TILE_SIZE, BUILDING_COLORS } from "../../../engine/Constants";

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

    const sprite = textures[b.type];

    if (sprite && sprite.complete) {
      ctx.drawImage(sprite, sx, sy, sw, sh);
    } else {
      ctx.fillStyle = BUILDING_COLORS[b.type] || "#ccc";
      ctx.fillRect(sx, sy, sw, sh);
    }
  });
};

export function drawOverlay(
  overlayCanvas: HTMLCanvasElement | null,
  hovered: { col: number; row: number } | null,
  camera: { x: number; y: number; zoom: number },
  selectedCfg?: { width?: number; length?: number },
) {
  if (!overlayCanvas) return;
  const ctx = overlayCanvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
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
