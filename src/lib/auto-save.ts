import { appDataDir, join } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { serializeProject, useProjectStore } from "./project-file";
import { addRecentProject } from "./recent-projects";

let autoSaveInterval: ReturnType<typeof setInterval> | null = null;
let projectDir: string | null = null;

/** Ensure the projects directory exists. Returns the path. */
async function ensureProjectDir(): Promise<string> {
  if (projectDir) return projectDir;
  const appData = await appDataDir();
  projectDir = await join(appData, "projects");
  return projectDir;
}

/** Generate a project filename from current timestamp. */
function generateProjectName(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `openshots-${ts}.openshots`;
}

/**
 * Create a new auto-save project file. Called when first image is added.
 * Skips if user already has a named project open.
 */
export async function createAutoSaveProject(): Promise<void> {
  const { currentProjectPath } = useProjectStore.getState();
  // Don't auto-create if user already has a named project open
  if (currentProjectPath) return;

  try {
    const dir = await ensureProjectDir();
    const filename = generateProjectName();
    const filePath = await join(dir, filename);

    const project = serializeProject();
    project.updatedAt = new Date().toISOString();
    const json = JSON.stringify(project, null, 2);

    await invoke<string>("save_text_file", { path: filePath, contents: json });
    useProjectStore.getState().markClean(filePath);

    // Add to recent projects list
    await addRecentProject({
      path: filePath,
      name: filename,
      updatedAt: project.updatedAt,
    });
  } catch (err) {
    console.error("[AutoSave] Failed to create project:", err);
  }
}

/**
 * Auto-save the current project if dirty.
 * Saves to the current project path (auto-created or user-saved).
 */
async function autoSaveTick(): Promise<void> {
  const { isDirty, currentProjectPath } = useProjectStore.getState();
  if (!isDirty || !currentProjectPath) return;

  try {
    const project = serializeProject();
    project.updatedAt = new Date().toISOString();
    const json = JSON.stringify(project, null, 2);
    await invoke<string>("save_text_file", {
      path: currentProjectPath,
      contents: json,
    });
    useProjectStore.getState().markClean();

    // Update recent projects entry
    await addRecentProject({
      path: currentProjectPath,
      name: currentProjectPath.split(/[/\\]/).pop() || "Untitled",
      updatedAt: project.updatedAt,
    });
  } catch (err) {
    console.error("[AutoSave] Failed:", err);
  }
}

/** Start the 30-second auto-save interval. */
export function startAutoSave(): void {
  if (autoSaveInterval) return;
  autoSaveInterval = setInterval(() => {
    void autoSaveTick();
  }, 30_000);
}

/** Stop auto-save (e.g., on app quit). */
export function stopAutoSave(): void {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
}
