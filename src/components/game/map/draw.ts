import type { Buildings } from "../../../engine/Types";
import { TILE_SIZE, BUILDING_COLORS } from "../../../engine/Constants";

export const drawBuildings = (
  canvas: HTMLCanvasElement | null,
  buildings: Record<string, Buildings> | null,
  textures: Record<string, HTMLImageElement>,
) => {
  if (!canvas || !buildings) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  Object.values(buildings).forEach((b) => {
    const x = b.position.x * TILE_SIZE;
    const y = b.position.y * TILE_SIZE;
    const w = (b.width || 1) * TILE_SIZE;
    const h = (b.length || 1) * TILE_SIZE;

    const sprite = textures[b.type];

    if (sprite && sprite.complete) {
      ctx.drawImage(sprite, x, y, w, h);
    } else {
      ctx.fillStyle = BUILDING_COLORS[b.type] || "#ccc";
      ctx.fillRect(x, y, w, h);
    }
  });
};

export function drawOverlay(
  overlayCanvas: HTMLCanvasElement | null,
  hovered: { col: number; row: number } | null,
  selectedCfg?: { width?: number; length?: number },
) {
  if (!overlayCanvas) return;
  const ctx = overlayCanvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  if (!hovered) return;

  ctx.strokeStyle = "#acacac";
  ctx.lineWidth = 2;

  if (selectedCfg) {
    const w = selectedCfg.width ?? 1;
    const h = selectedCfg.length ?? 1;
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
}
