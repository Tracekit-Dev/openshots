import { useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useAppStore } from "../stores/app.store";
import {
  captureFullscreen,
  captureRegion,
  captureWindow,
  checkScreenPermission,
  type CaptureRegionArgs,
} from "../ipc/capture";

/**
 * Orchestrates the capture flow: listen for tray/hotkey events,
 * call the appropriate IPC command, and update state with the result.
 */
export function useCaptureFlow() {
  const setCaptureState = useAppStore((s) => s.setCaptureState);
  const setLastCapturePath = useAppStore((s) => s.setLastCapturePath);

  const handleFullscreen = useCallback(async () => {
    setCaptureState("capturing");
    try {
      const ok = await checkScreenPermission();
      if (!ok) {
        setCaptureState("idle");
        return;
      }
      const path = await captureFullscreen();
      setLastCapturePath(path);
      setCaptureState("captured");
    } catch (err) {
      console.error("Fullscreen capture failed:", err);
      setCaptureState("idle");
    }
  }, [setCaptureState, setLastCapturePath]);

  const handleRegionStart = useCallback(() => {
    setCaptureState("selecting-region");
  }, [setCaptureState]);

  const handleRegionComplete = useCallback(
    async (args: CaptureRegionArgs) => {
      setCaptureState("capturing");
      try {
        const path = await captureRegion(args);
        setLastCapturePath(path);
        setCaptureState("captured");
      } catch (err) {
        console.error("Region capture failed:", err);
        setCaptureState("idle");
      }
    },
    [setCaptureState, setLastCapturePath],
  );

  const handleRegionCancel = useCallback(() => {
    setCaptureState("idle");
  }, [setCaptureState]);

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
      listen("capture:region", () => handleRegionStart()),
      listen("capture:window", () => handleWindowStart()),
    ];

    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, [handleFullscreen, handleRegionStart, handleWindowStart]);

  return {
    handleFullscreen,
    handleRegionStart,
    handleRegionComplete,
    handleRegionCancel,
    handleWindowStart,
    handleWindowSelect,
  };
}
