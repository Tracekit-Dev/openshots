import { invoke } from "@tauri-apps/api/core";

export interface WindowInfo {
  id: number;
  title: string;
  app_name: string;
}

export interface CaptureRegionArgs {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Capture the primary monitor.
 * Returns an absolute file path to a temp PNG.
 * Use `convertFileSrc(path)` to display in <img>.
 */
export async function captureFullscreen(): Promise<string> {
  return invoke<string>("capture_fullscreen");
}

/**
 * Capture a selected region.
 * Coordinates must be in PHYSICAL pixels (multiply by window.devicePixelRatio).
 * Returns absolute path to temp PNG.
 */
export async function captureRegion(args: CaptureRegionArgs): Promise<string> {
  return invoke<string>("capture_region", { args });
}

/**
 * List all capturable windows with their metadata.
 */
export async function listWindows(): Promise<WindowInfo[]> {
  return invoke<WindowInfo[]>("list_windows");
}

/**
 * Capture a specific window by ID.
 * Returns absolute path to temp PNG.
 */
export async function captureWindow(windowId: number): Promise<string> {
  return invoke<string>("capture_window", { windowId });
}

/**
 * macOS only: check Screen Recording permission.
 * Returns true if granted.
 */
export async function checkScreenPermission(): Promise<boolean> {
  return invoke<boolean>("check_screen_permission");
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
