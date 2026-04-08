export interface FanPosition {
  x: number;
  y: number;
  rotation: number;
}

/**
 * Compute fan layout positions for N images centered on the canvas.
 * Images are spread in a slight arc with increasing rotation.
 */
export function computeFanLayout(
  count: number,
  canvasWidth: number,
  canvasHeight: number,
): FanPosition[] {
  if (count === 0) return [];
  if (count === 1) {
    return [{ x: canvasWidth / 2, y: canvasHeight / 2, rotation: 0 }];
  }

  const maxSpread = Math.min(canvasWidth * 0.6, 400);
  const maxRotation = 15;
  const positions: FanPosition[] = [];

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1; // -1 to 1
    positions.push({
      x: canvasWidth / 2 + t * (maxSpread / 2),
      y: canvasHeight / 2 + Math.abs(t) * 20,
      rotation: t * maxRotation,
    });
  }

  return positions;
}
