import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAppStore } from "./stores/app.store";
import { useCaptureFlow } from "./hooks/useCaptureFlow";
import RegionOverlay from "./components/capture/RegionOverlay";
import WindowPicker from "./components/capture/WindowPicker";
import WaylandBanner from "./components/shell/WaylandBanner";
import SettingsPage from "./components/shell/SettingsPage";

type View = "main" | "settings";

export default function App() {
  const setWayland = useAppStore((s) => s.setWayland);
  const captureState = useAppStore((s) => s.captureState);
  const lastCapturePath = useAppStore((s) => s.lastCapturePath);
  const [view, setView] = useState<View>("main");

  const {
    handleFullscreen,
    handleRegionComplete,
    handleRegionCancel,
    handleWindowSelect,
  } = useCaptureFlow();

  // Listen for platform flags from Rust
  useEffect(() => {
    const unlisten = listen<{ is_wayland: boolean }>(
      "platform:flags",
      (event) => {
        setWayland(event.payload.is_wayland);
      },
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setWayland]);

  // Listen for navigation events from tray
  useEffect(() => {
    const unlisten = listen<string>("navigate", (event) => {
      if (event.payload === "/settings") setView("settings");
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Region selection overlay
  if (captureState === "selecting-region") {
    return (
      <RegionOverlay
        onComplete={handleRegionComplete}
        onCancel={handleRegionCancel}
      />
    );
  }

  // Settings page
  if (view === "settings") {
    return <SettingsPage onBack={() => setView("main")} />;
  }

  const imageUrl = lastCapturePath ? convertFileSrc(lastCapturePath) : null;

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <WaylandBanner />

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-800">
        <button
          onClick={() => void handleFullscreen()}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
        >
          Full Screen
        </button>
        <button
          onClick={() =>
            useAppStore.getState().setCaptureState("selecting-region")
          }
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
        >
          Region
        </button>
        <button
          onClick={() =>
            useAppStore.getState().setCaptureState("selecting-window")
          }
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
        >
          Window
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setView("settings")}
          className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Settings
        </button>
      </div>

      {/* Canvas area */}
      <main className="flex-1 flex items-center justify-center overflow-hidden p-4">
        {captureState === "capturing" && (
          <p className="text-neutral-500 text-sm animate-pulse">
            Capturing...
          </p>
        )}

        {imageUrl && captureState === "captured" && (
          <img
            src={imageUrl}
            alt="Screenshot"
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
          />
        )}

        {captureState === "idle" && !imageUrl && (
          <div className="text-center">
            <p className="text-neutral-500 text-sm mb-2">
              No screenshot yet
            </p>
            <p className="text-neutral-600 text-xs">
              Use the toolbar, system tray, or hotkeys to capture
            </p>
          </div>
        )}
      </main>

      {/* Window picker modal */}
      {captureState === "selecting-window" && (
        <WindowPicker
          onSelect={handleWindowSelect}
          onCancel={() => useAppStore.getState().setCaptureState("idle")}
        />
      )}
    </div>
  );
}
