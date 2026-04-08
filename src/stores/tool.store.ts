import { create } from "zustand";

export type ToolMode =
  | "select"
  | "arrow"
  | "rectangle"
  | "ellipse"
  | "text"
  | "emoji"
  | "blur"
  | "pixelate"
  | "crop";

interface ToolState {
  activeTool: ToolMode;
  setActiveTool: (tool: ToolMode) => void;

  // Annotation drawing defaults
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  fillColor: string;
  setFillColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
}

export const useToolStore = create<ToolState>()((set) => ({
  activeTool: "select",
  setActiveTool: (tool) => set({ activeTool: tool }),

  strokeColor: "#ef4444",
  setStrokeColor: (color) => set({ strokeColor: color }),
  fillColor: "transparent",
  setFillColor: (color) => set({ fillColor: color }),
  strokeWidth: 3,
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  fontSize: 24,
  setFontSize: (size) => set({ fontSize: size }),
}));
