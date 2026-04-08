export interface AspectRatioPreset {
  label: string;
  ratio: number; // width / height
  width: number;
  height: number;
}

export const ASPECT_RATIOS: AspectRatioPreset[] = [
  { label: "16:9", ratio: 16 / 9, width: 1920, height: 1080 },
  { label: "1:1", ratio: 1, width: 1080, height: 1080 },
  { label: "9:16", ratio: 9 / 16, width: 1080, height: 1920 },
  { label: "4:3", ratio: 4 / 3, width: 1600, height: 1200 },
  { label: "3:2", ratio: 3 / 2, width: 1800, height: 1200 },
  { label: "21:9", ratio: 21 / 9, width: 2520, height: 1080 },
];

export function canvasSize(
  preset: AspectRatioPreset,
  maxDimension = 1920,
): { width: number; height: number } {
  if (preset.width <= maxDimension && preset.height <= maxDimension) {
    return { width: preset.width, height: preset.height };
  }
  if (preset.ratio >= 1) {
    return { width: maxDimension, height: Math.round(maxDimension / preset.ratio) };
  }
  return { width: Math.round(maxDimension * preset.ratio), height: maxDimension };
}
