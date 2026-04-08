/**
 * Extract the dominant color from an image element by sampling pixels.
 * Used for auto color-matched inset borders.
 */
export function extractDominantColor(img: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  const size = 64; // downsample for speed
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "#6366f1";

  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  // Sample edges only (top, bottom, left, right rows/columns)
  for (let x = 0; x < size; x++) {
    for (const y of [0, 1, size - 2, size - 1]) {
      const i = (y * size + x) * 4;
      rSum += data[i]!;
      gSum += data[i + 1]!;
      bSum += data[i + 2]!;
      count++;
    }
  }
  for (let y = 2; y < size - 2; y++) {
    for (const x of [0, 1, size - 2, size - 1]) {
      const i = (y * size + x) * 4;
      rSum += data[i]!;
      gSum += data[i + 1]!;
      bSum += data[i + 2]!;
      count++;
    }
  }

  const r = Math.round(rSum / count);
  const g = Math.round(gSum / count);
  const b = Math.round(bSum / count);

  return `rgb(${r}, ${g}, ${b})`;
}
