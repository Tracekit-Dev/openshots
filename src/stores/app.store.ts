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
  | "captured"
  | "countdown";

export type SelfTimerDelay = 0 | 3 | 5 | 10;

interface AppState {
  isWayland: boolean;
  setWayland: (value: boolean) => void;

  hotkeys: HotkeyConfig;
  setHotkeys: (config: HotkeyConfig) => void;

  captureState: CaptureState;
  setCaptureState: (state: CaptureState) => void;

  lastCapturePath: string | null;
  setLastCapturePath: (path: string | null) => void;

  regionScreenshotPath: string | null;
  setRegionScreenshotPath: (path: string | null) => void;

  selfTimerDelay: SelfTimerDelay;
  setSelfTimerDelay: (delay: SelfTimerDelay) => void;

  retinaDownscale: boolean;
  setRetinaDownscale: (enabled: boolean) => void;

  crosshairEnabled: boolean;
  setCrosshairEnabled: (enabled: boolean) => void;

  countdownRemaining: number;
  setCountdownRemaining: (seconds: number) => void;

  /** Which capture mode triggered the countdown */
  countdownMode: "fullscreen" | "region" | "window" | null;
  setCountdownMode: (mode: "fullscreen" | "region" | "window" | null) => void;
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

      regionScreenshotPath: null,
      setRegionScreenshotPath: (path) => set({ regionScreenshotPath: path }),

      selfTimerDelay: 0,
      setSelfTimerDelay: (delay) => set({ selfTimerDelay: delay }),

      retinaDownscale: false,
      setRetinaDownscale: (enabled) => set({ retinaDownscale: enabled }),

      crosshairEnabled: true,
      setCrosshairEnabled: (enabled) => set({ crosshairEnabled: enabled }),

      countdownRemaining: 0,
      setCountdownRemaining: (seconds) => set({ countdownRemaining: seconds }),

      countdownMode: null,
      setCountdownMode: (mode) => set({ countdownMode: mode }),
    }),
    {
      name: "app-store",
      partialize: (state) => ({
        hotkeys: state.hotkeys,
        selfTimerDelay: state.selfTimerDelay,
        retinaDownscale: state.retinaDownscale,
        crosshairEnabled: state.crosshairEnabled,
      }),
    },
  ),
);
