import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { open, save, ask } from "@tauri-apps/plugin-dialog";
import {
  useCanvasStore,
  type CanvasBackground,
  type CanvasImage,
  type AnnotationShape,
  type PrivacyRegion,
} from "../stores/canvas.store";

// ---------------------------------------------------------------------------
// Schema version -- bump when the ProjectFile shape changes
// ---------------------------------------------------------------------------
export const OPENSHOTS_VERSION = 1;

// ---------------------------------------------------------------------------
// ProjectFile interface
// ---------------------------------------------------------------------------
export interface ProjectFile {
  version: number;
  createdAt: string;
  updatedAt: string;
  canvas: {
    width: number;
    height: number;
    padding: number;
    background: CanvasBackground;
  };
  images: CanvasImage[];
  annotations: AnnotationShape[];
  privacyRegions: PrivacyRegion[];
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Capture the current canvas state as a portable ProjectFile object.
 * Excludes transient UI state (selectedId, actions).
 */
export function serializeProject(): ProjectFile {
  const state = useCanvasStore.getState();
  return {
    version: OPENSHOTS_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    canvas: {
      width: state.canvasWidth,
      height: state.canvasHeight,
      padding: state.padding,
      background: state.background,
    },
    images: state.images,
    annotations: state.annotations,
    privacyRegions: state.privacyRegions,
  };
}

// ---------------------------------------------------------------------------
// Deserialization & validation
// ---------------------------------------------------------------------------

/**
 * Parse and validate a JSON string into a ProjectFile.
 * Throws descriptive errors for corrupt / incompatible files.
 */
export function deserializeProject(json: string): ProjectFile {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("Invalid project file: not valid JSON");
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid project file: expected a JSON object");
  }

  const obj = data as Record<string, unknown>;

  // Version
  if (typeof obj.version !== "number") {
    throw new Error("Invalid project file: missing or invalid version field");
  }

  // Canvas
  if (typeof obj.canvas !== "object" || obj.canvas === null) {
    throw new Error("Invalid project file: missing canvas object");
  }
  const canvas = obj.canvas as Record<string, unknown>;
  if (typeof canvas.width !== "number" || typeof canvas.height !== "number") {
    throw new Error("Invalid project file: missing canvas dimensions");
  }
  if (typeof canvas.padding !== "number") {
    throw new Error("Invalid project file: missing canvas padding");
  }
  if (typeof canvas.background !== "object" || canvas.background === null) {
    throw new Error("Invalid project file: missing canvas background");
  }

  // Arrays
  if (!Array.isArray(obj.images)) {
    throw new Error("Invalid project file: missing images array");
  }
  if (!Array.isArray(obj.annotations)) {
    throw new Error("Invalid project file: missing annotations array");
  }
  if (!Array.isArray(obj.privacyRegions)) {
    throw new Error("Invalid project file: missing privacyRegions array");
  }

  return obj as unknown as ProjectFile;
}

// ---------------------------------------------------------------------------
// Save to disk
// ---------------------------------------------------------------------------

/**
 * Serialize the current canvas and write it to a user-chosen .openshots file.
 * Returns the saved file path, or null if the user cancelled the dialog.
 */
export async function saveProject(): Promise<string | null> {
  const project = serializeProject();
  const json = JSON.stringify(project, null, 2);

  const path = await save({
    defaultPath: "Untitled.openshots",
    filters: [{ name: "OpenShots Project", extensions: ["openshots"] }],
  });

  if (!path) return null;

  await invoke<string>("save_text_file", { path, contents: json });

  // Update project meta after successful save
  useProjectStore.getState().markClean(path);

  return path;
}

// ---------------------------------------------------------------------------
// Dirty-state tracking store
// ---------------------------------------------------------------------------

interface ProjectMeta {
  currentProjectPath: string | null;
  isDirty: boolean;
  markClean: (path?: string) => void;
  markDirty: () => void;
}

export const useProjectStore = create<ProjectMeta>()((set) => ({
  currentProjectPath: null,
  isDirty: false,
  markClean: (path?: string) =>
    set((s) => ({
      isDirty: false,
      currentProjectPath: path ?? s.currentProjectPath,
    })),
  markDirty: () => set({ isDirty: true }),
}));

// Subscribe to canvas state changes to auto-set dirty flag.
// The temporal store's partialize already isolates the data fields we care about.
useCanvasStore.subscribe(() => {
  useProjectStore.getState().markDirty();
});

// ---------------------------------------------------------------------------
// Load project into canvas
// ---------------------------------------------------------------------------

/**
 * Apply a deserialized ProjectFile to the canvas store, replacing all state.
 * Resets undo history and updates project meta.
 */
export function loadProject(projectFile: ProjectFile, filePath: string): void {
  // Apply all canvas state atomically
  useCanvasStore.setState({
    canvasWidth: projectFile.canvas.width,
    canvasHeight: projectFile.canvas.height,
    padding: projectFile.canvas.padding,
    background: projectFile.canvas.background,
    images: projectFile.images,
    annotations: projectFile.annotations,
    privacyRegions: projectFile.privacyRegions,
    selectedId: null,
  });

  // Reset undo history so loaded state becomes the new baseline
  useCanvasStore.temporal.getState().clear();

  // Update project meta
  useProjectStore.getState().markClean(filePath);
}

// ---------------------------------------------------------------------------
// Unsaved changes guard
// ---------------------------------------------------------------------------

/**
 * If there are unsaved changes, prompt the user to save first.
 * Returns true if it is safe to proceed (saved or discarded), false to abort.
 */
export async function confirmDiscardChanges(): Promise<boolean> {
  const { isDirty } = useProjectStore.getState();
  if (!isDirty) return true;

  const shouldSave = await ask(
    "You have unsaved changes. Do you want to save before continuing?",
    { title: "Unsaved Changes", kind: "warning" },
  );

  if (shouldSave) {
    await saveProject();
  }

  // Whether user chose save or discard, proceed. The ask() dialog only
  // returns true/false (Yes/No) — there is no cancel option, so we always proceed.
  return true;
}

// ---------------------------------------------------------------------------
// Open project from file dialog
// ---------------------------------------------------------------------------

/**
 * Show a native file dialog filtered to .openshots, read and load the project.
 * Prompts to save unsaved changes first.
 */
export async function openProject(): Promise<void> {
  const canProceed = await confirmDiscardChanges();
  if (!canProceed) return;

  const filePath = await open({
    multiple: false,
    filters: [{ name: "OpenShots Project", extensions: ["openshots"] }],
  });

  if (!filePath) return;

  try {
    const contents = await invoke<string>("read_text_file", {
      path: filePath as string,
    });
    const project = deserializeProject(contents);
    loadProject(project, filePath as string);
  } catch (err) {
    console.error("[OpenShots] Failed to open project:", err);
  }
}

// ---------------------------------------------------------------------------
// Open project from a known path (drag-drop, OS file association)
// ---------------------------------------------------------------------------

/**
 * Open a project file from a known file path (e.g. drag-and-drop).
 * Prompts to save unsaved changes first.
 */
export async function openProjectFromPath(filePath: string): Promise<void> {
  const canProceed = await confirmDiscardChanges();
  if (!canProceed) return;

  try {
    const contents = await invoke<string>("read_text_file", { path: filePath });
    const project = deserializeProject(contents);
    loadProject(project, filePath);
  } catch (err) {
    console.error("[OpenShots] Failed to open project from path:", err);
  }
}
