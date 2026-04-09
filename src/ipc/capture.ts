import { invoke } from "@tauri-apps/api/core";

export interface WindowInfo {
  id: number;
  title: string;
  app_name: string;
}

/**
 * Capture the primary monitor.
 * Returns a data URL (data:image/png;base64,...).
 */
export async function captureFullscreen(): Promise<string> {
  return invoke<string>("capture_fullscreen");
}

/**
 * Capture all monitors stitched together.
 * Used for region selection across multiple displays.
 */
export async function captureAllMonitors(): Promise<string> {
  return invoke<string>("capture_all_monitors");
}

/**
 * List all capturable windows with their metadata.
 */
export async function listWindows(): Promise<WindowInfo[]> {
  return invoke<WindowInfo[]>("list_windows");
}

/**
 * Capture a specific window by ID.
 * Returns a data URL (data:image/png;base64,...).
 */
export async function captureWindow(windowId: number): Promise<string> {
  return invoke<string>("capture_window", { windowId });
}

/**
 * Read a local image file and return it as a data URL.
 * Used by the upload flow to bypass the asset protocol.
 */
export async function readImageFile(path: string): Promise<string> {
  return invoke<string>("read_image_file", { path });
}

/**
 * macOS only: check Screen Recording permission.
 * Returns true if granted.
 */
export async function checkScreenPermission(): Promise<boolean> {
  return invoke<boolean>("check_screen_permission");
}

/**
 * List macOS system wallpaper thumbnails. Returns [name, path] pairs.
 */
export async function listSystemWallpapers(): Promise<[string, string][]> {
  return invoke<[string, string][]>("list_system_wallpapers");
}

/**
 * Convert a HEIC file to a small thumbnail data URL.
 */
export async function convertHeicThumbnail(path: string): Promise<string> {
  return invoke<string>("convert_heic_thumbnail", { path });
}

/**
 * Convert a HEIC file to full-size JPEG data URL using macOS sips.
 */
export async function convertHeicToDataUrl(path: string): Promise<string> {
  return invoke<string>("convert_heic_to_data_url", { path });
}

/**
 * Update global hotkey registrations at runtime.
 */
export async function updateHotkeys(config: {
  capture_region: string;
  capture_fullscreen: string;
  capture_window: string;
}): Promise<void> {
  return invoke("update_hotkeys", { config });
}
