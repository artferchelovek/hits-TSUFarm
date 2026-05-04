export function updateTransform(
  cameraRef: { current: { x: number; y: number; zoom: number } },
  mapCanvasRef: { current: HTMLCanvasElement | null },
  buildingsCanvasRef: { current: HTMLCanvasElement | null },
  overlayCanvasRef: { current: HTMLCanvasElement | null },
) {
  if (mapCanvasRef.current) {
    const { x, y, zoom } = cameraRef.current;
    const t = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`;
    mapCanvasRef.current.style.transform = t;
    if (buildingsCanvasRef.current)
      buildingsCanvasRef.current.style.transform = t;
    if (overlayCanvasRef.current) overlayCanvasRef.current.style.transform = t;
  }
}

export default updateTransform;
