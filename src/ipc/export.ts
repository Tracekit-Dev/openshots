import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

export type ExportFormat = "png" | "jpeg" | "webp";

export interface PrivacyRegionExport {
  region_type: "blur" | "pixelate";
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
}

export interface ExportOptions {
  format: ExportFormat;
  quality: number;
  scale: number;
  privacyRegions?: PrivacyRegionExport[];
}

const FORMAT_FILTERS: Record<ExportFormat, { name: string; extensions: string[] }[]> = {
  png: [{ name: "PNG Image", extensions: ["png"] }],
  jpeg: [{ name: "JPEG Image", extensions: ["jpg", "jpeg"] }],
  webp: [{ name: "WebP Image", extensions: ["webp"] }],
};

/**
 * Show a native save dialog, then export canvas pixel data via Rust.
 */
export async function exportCanvas(
  imageData: Uint8Array,
  width: number,
  height: number,
  options: ExportOptions,
): Promise<string | null> {
  const path = await save({
    defaultPath: `screenshot.${options.format}`,
    filters: FORMAT_FILTERS[options.format],
  });

  if (!path) return null;

  return invoke<string>("export_image", {
    imageData: Array.from(imageData),
    width,
    height,
    outputPath: path,
    format: options.format,
    quality: options.quality,
    scale: options.scale,
    privacyRegions: options.privacyRegions ?? null,
  });
}
