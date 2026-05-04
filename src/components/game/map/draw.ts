import type { Buildings } from "../../../engine/Types";
import { TILE_SIZE, BUILDING_COLORS } from "../../../engine/Constants";

export function drawBuildings(
  buildingsCanvas: HTMLCanvasElement | null,
  buildings: Record<string, Buildings> | null,
) {
  if (!buildingsCanvas) return;
  const ctx = buildingsCanvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, buildingsCanvas.width, buildingsCanvas.height);

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
}

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
