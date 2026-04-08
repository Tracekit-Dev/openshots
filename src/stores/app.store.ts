import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface HotkeyConfig {
  captureRegion: string;
  captureFullscreen: string;
  captureWindow: string;
}

export const DEFAULT_HOTKEYS: HotkeyConfig = {
  captureRegion: "CommandOrControl+Shift+3",
  captureFullscreen: "CommandOrControl+Shift+4",
  captureWindow: "CommandOrControl+Shift+5",
};

export type CaptureState =
  | "idle"
  | "selecting-region"
  | "selecting-window"
  | "capturing"
  | "captured";

interface AppState {
  isWayland: boolean;
  setWayland: (value: boolean) => void;

  hotkeys: HotkeyConfig;
  setHotkeys: (config: HotkeyConfig) => void;

  captureState: CaptureState;
  setCaptureState: (state: CaptureState) => void;

  lastCapturePath: string | null;
  setLastCapturePath: (path: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isWayland: false,
      setWayland: (value) => set({ isWayland: value }),

      hotkeys: DEFAULT_HOTKEYS,
      setHotkeys: (config) => set({ hotkeys: config }),

      captureState: "idle",
      setCaptureState: (state) => set({ captureState: state }),

      lastCapturePath: null,
      setLastCapturePath: (path) => set({ lastCapturePath: path }),
    }),
    {
      name: "app-store",
      partialize: (state) => ({ hotkeys: state.hotkeys }),
    },
  ),
);
