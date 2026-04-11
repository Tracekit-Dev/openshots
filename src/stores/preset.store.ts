import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CanvasBackground } from "./canvas.store";

export interface CanvasPreset {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  padding: number;
  background: CanvasBackground;
  cornerRadius: number;
  shadowEnabled: boolean;
  shadowBlur: number;
  shadowOffsetY: number;
  insetBorderEnabled: boolean;
  insetBorderWidth: number;
}

interface PresetState {
  presets: CanvasPreset[];
  addPreset: (preset: CanvasPreset) => void;
  removePreset: (id: string) => void;
  importPresets: (presets: CanvasPreset[]) => void;
}

export const usePresetStore = create<PresetState>()(
  persist(
    (set) => ({
      presets: [],
      addPreset: (preset) =>
        set((s) => ({ presets: [...s.presets, preset] })),
      removePreset: (id) =>
        set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
      importPresets: (incoming) =>
        set((s) => ({
          presets: [
            ...s.presets,
            ...incoming.map((p) => ({ ...p, id: crypto.randomUUID() })),
          ],
        })),
    }),
    { name: "preset-store" },
  ),
);
