import { invoke } from "@tauri-apps/api/core";

/**
 * Trigger OS-native file reveal / share for the given file.
 * On macOS: reveals file in Finder (user can share via toolbar/right-click).
 * On Windows: opens Explorer with file selected.
 * On Linux: opens file manager at file location.
 */
export async function shareFile(filePath: string): Promise<void> {
  return invoke("share_file", { filePath });
}
