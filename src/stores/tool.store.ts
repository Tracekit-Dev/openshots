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
  | "crop"
  | "callout";

// Professional annotation color palette (desaturated, CleanShot X style)
export const COLOR_PRESETS = [
  "#E03E3E", // Red (default)
  "#D97706", // Orange
  "#CA8A04", // Yellow
  "#16A34A", // Green
  "#0D9488", // Teal
  "#2563EB", // Blue
  "#DB2777", // Pink
  "#525252", // Gray
  "#FFFFFF", // White
  "#1A1A1A", // Black
];

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

  // Emoji
  selectedEmoji: string;
  setSelectedEmoji: (emoji: string) => void;
}

export const useToolStore = create<ToolState>()((set) => ({
  activeTool: "select",
  setActiveTool: (tool) => set({ activeTool: tool }),

  strokeColor: "#E03E3E",
  setStrokeColor: (color) => set({ strokeColor: color }),
  fillColor: "transparent",
  setFillColor: (color) => set({ fillColor: color }),
  strokeWidth: 4,
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  fontSize: 48,
  setFontSize: (size) => set({ fontSize: size }),

  selectedEmoji: "\u{1F44D}",
  setSelectedEmoji: (emoji) => set({ selectedEmoji: emoji }),
}));
