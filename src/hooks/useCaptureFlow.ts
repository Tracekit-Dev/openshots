import { useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../stores/app.store";
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

  const handleFullscreen = useCallback(async () => {
    setCaptureState("capturing");
    try {
      const ok = await checkScreenPermission();
      console.log("[Screenshots] Screen permission:", ok);
      if (!ok) {
        setCaptureState("idle");
        return;
      }
      // Rust hides the window, captures, then shows it again
      const path = await captureFullscreen();
      console.log("[Screenshots] Fullscreen capture path:", path);
      setLastCapturePath(path);
      setCaptureState("captured");
    } catch (err) {
      console.error("[Screenshots] Fullscreen capture failed:", err);
      setCaptureState("idle");
    }
  }, [setCaptureState, setLastCapturePath]);

  const handleRegionStart = useCallback(async () => {
    setCaptureState("capturing");
    try {
      const ok = await checkScreenPermission();
      if (!ok) {
        setCaptureState("idle");
        return;
      }
      // Capture all monitors for region selection across displays
      const path = await captureAllMonitors();
      setRegionScreenshotPath(path);
      setCaptureState("selecting-region");
    } catch (err) {
      console.error("Region capture failed:", err);
      setCaptureState("idle");
    }
  }, [setCaptureState, setRegionScreenshotPath]);

  const handleRegionCancel = useCallback(() => {
    setRegionScreenshotPath(null);
    setCaptureState("idle");
  }, [setCaptureState, setRegionScreenshotPath]);

  const handleWindowStart = useCallback(() => {
    setCaptureState("selecting-window");
  }, [setCaptureState]);

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

  return {
    handleFullscreen,
    handleRegionStart,
    handleRegionCancel,
    handleWindowStart,
    handleWindowSelect,
  };
}
