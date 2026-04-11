import { useEffect } from "react";
import { useToolStore } from "../stores/tool.store";
import { useCanvasStore } from "../stores/canvas.store";
import { saveProject } from "../lib/project-file";

export interface ShortcutEntry {
  key: string;
  label: string;
  description: string;
  category: "Tools" | "Canvas" | "Capture";
}

export const SHORTCUT_REGISTRY: ShortcutEntry[] = [
  { key: "v", label: "V", description: "Select tool", category: "Tools" },
  { key: "a", label: "A", description: "Arrow tool", category: "Tools" },
  { key: "r", label: "R", description: "Rectangle tool", category: "Tools" },
  { key: "e", label: "E", description: "Ellipse tool", category: "Tools" },
  { key: "t", label: "T", description: "Text tool", category: "Tools" },
  { key: "m", label: "M", description: "Emoji tool", category: "Tools" },
  { key: "b", label: "B", description: "Blur tool", category: "Tools" },
  { key: "p", label: "P", description: "Pixelate tool", category: "Tools" },
  { key: "Meta+z", label: "Cmd+Z", description: "Undo", category: "Canvas" },
  { key: "Meta+Shift+z", label: "Cmd+Shift+Z", description: "Redo", category: "Canvas" },
  { key: "Meta+s", label: "Cmd+S", description: "Save project", category: "Canvas" },
  { key: "Meta+o", label: "Cmd+O", description: "Open project", category: "Canvas" },
  { key: "Delete", label: "Delete", description: "Delete selected", category: "Canvas" },
  { key: "Escape", label: "Esc", description: "Deselect", category: "Canvas" },
];

/**
 * Registers all keyboard shortcuts from SHORTCUT_REGISTRY.
 * Single source of truth for both runtime binding and the shortcuts modal.
 */
export function useHotkeys() {
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;

      // Save project (Cmd+S)
      if (mod && e.key === "s") {
        e.preventDefault();
        void saveProject();
        return;
      }

      // Undo/Redo (handled in App.tsx but listed for completeness)
      if (mod && e.key === "z" && !e.shiftKey) return;
      if (mod && e.key === "z" && e.shiftKey) return;

      switch (e.key.toLowerCase()) {
        case "v":
          setActiveTool("select");
          break;
        case "a":
          setActiveTool("arrow");
          break;
        case "r":
          setActiveTool("rectangle");
          break;
        case "e":
          setActiveTool("ellipse");
          break;
        case "t":
          setActiveTool("text");
          break;
        case "m":
          setActiveTool("emoji");
          break;
        case "b":
          setActiveTool("blur");
          break;
        case "p":
          setActiveTool("pixelate");
          break;
        case "escape":
          useCanvasStore.getState().setSelectedId(null);
          setActiveTool("select");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveTool]);
}
