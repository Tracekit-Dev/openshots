import { useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore, type SelfTimerDelay } from "../stores/app.store";
import {
  captureFullscreen,
  captureAllMonitors,
  captureWindow,
  checkScreenPermission,
} from "../ipc/capture";

export function useCaptureFlow() {
  const setCaptureState = useAppStore((s) => s.setCaptureState);
  const setLastCapturePath = useAppStore((s) => s.setLastCapturePath);
  const setRegionScreenshotPath = useAppStore(
    (s) => s.setRegionScreenshotPath,
  );
  const setCountdownRemaining = useAppStore((s) => s.setCountdownRemaining);
  const setCountdownMode = useAppStore((s) => s.setCountdownMode);

  /** Execute the actual capture after countdown (or immediately if no timer). */
  const executeCapture = useCallback(
    async (mode: "fullscreen" | "region" | "window") => {
      setCaptureState("capturing");
      try {
        const ok = await checkScreenPermission();
        if (!ok) {
          setCaptureState("idle");
          return;
        }

        if (mode === "fullscreen") {
          const path = await captureFullscreen();
          console.log("[Screenshots] Fullscreen capture path:", path);
          setLastCapturePath(path);
          setCaptureState("captured");
        } else if (mode === "region") {
          const path = await captureAllMonitors();
          setRegionScreenshotPath(path);
          setCaptureState("selecting-region");
        } else if (mode === "window") {
          setCaptureState("selecting-window");
        }
      } catch (err) {
        console.error(`[Screenshots] ${mode} capture failed:`, err);
        setCaptureState("idle");
      }
    },
    [setCaptureState, setLastCapturePath, setRegionScreenshotPath],
  );

  /** Start countdown or capture immediately depending on selfTimerDelay. */
  const startCaptureWithTimer = useCallback(
    (mode: "fullscreen" | "region" | "window") => {
      const delay = useAppStore.getState().selfTimerDelay;
      if (delay > 0) {
        setCountdownRemaining(delay);
        setCountdownMode(mode);
        setCaptureState("countdown");
      } else {
        void executeCapture(mode);
      }
    },
    [executeCapture, setCaptureState, setCountdownRemaining, setCountdownMode],
  );

  const handleFullscreen = useCallback(async () => {
    startCaptureWithTimer("fullscreen");
  }, [startCaptureWithTimer]);

  const handleRegionStart = useCallback(async () => {
    startCaptureWithTimer("region");
  }, [startCaptureWithTimer]);

  const handleRegionCancel = useCallback(() => {
    setRegionScreenshotPath(null);
    setCaptureState("idle");
  }, [setCaptureState, setRegionScreenshotPath]);

  const handleWindowStart = useCallback(() => {
    startCaptureWithTimer("window");
  }, [startCaptureWithTimer]);

  const handleWindowSelect = useCallback(
    async (windowId: number) => {
      setCaptureState("capturing");
      try {
        const ok = await checkScreenPermission();
        if (!ok) {
          setCaptureState("idle");
          return;
        }
        const path = await captureWindow(windowId);
        setLastCapturePath(path);
        setCaptureState("captured");
      } catch (err) {
        console.error("Window capture failed:", err);
        setCaptureState("idle");
      }
    },
    [setCaptureState, setLastCapturePath],
  );

  /** Called by CountdownOverlay when countdown reaches 0. */
  const handleTimerComplete = useCallback(() => {
    const mode = useAppStore.getState().countdownMode;
    setCountdownMode(null);
    setCountdownRemaining(0);
    if (mode) {
      void executeCapture(mode);
    } else {
      setCaptureState("idle");
    }
  }, [executeCapture, setCaptureState, setCountdownMode, setCountdownRemaining]);

  // Listen for capture events from tray menu and global shortcuts
  useEffect(() => {
    const unlisteners = [
      listen("capture:screen", () => void handleFullscreen()),
      listen("capture:region", () => void handleRegionStart()),
      listen("capture:window", () => handleWindowStart()),
    ];

    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, [handleFullscreen, handleRegionStart, handleWindowStart]);

  // Listen for self-timer changes from tray menu
  useEffect(() => {
    const unlisten = listen<number>("capture:set-timer", (event) => {
      useAppStore.getState().setSelfTimerDelay(event.payload as SelfTimerDelay);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return {
    handleFullscreen,
    handleRegionStart,
    handleRegionCancel,
    handleWindowStart,
    handleWindowSelect,
    handleTimerComplete,
  };
}
