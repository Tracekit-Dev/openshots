import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import Konva from "konva";
import { useAppStore } from "./stores/app.store";
import { useCanvasStore } from "./stores/canvas.store";
import { useCaptureFlow } from "./hooks/useCaptureFlow";
import RegionOverlay from "./components/capture/RegionOverlay";
import WindowPicker from "./components/capture/WindowPicker";
import WaylandBanner from "./components/shell/WaylandBanner";
import SettingsPage from "./components/shell/SettingsPage";
import CanvasStage, { addScreenshotToCanvas } from "./components/canvas/CanvasStage";
import BackgroundPanel from "./components/panels/BackgroundPanel";
import StylePanel from "./components/panels/StylePanel";
import ToolPanel from "./components/panels/ToolPanel";
import AspectRatioPanel from "./components/panels/AspectRatioPanel";
import ExportPanel from "./components/panels/ExportPanel";
import PresetPanel from "./components/panels/PresetPanel";
import ShortcutsModal from "./components/shell/ShortcutsModal";
import { useHotkeys } from "./hooks/useHotkeys";

type View = "main" | "settings";

export default function App() {
  const setWayland = useAppStore((s) => s.setWayland);
  const captureState = useAppStore((s) => s.captureState);
  const lastCapturePath = useAppStore((s) => s.lastCapturePath);
  const setCaptureState = useAppStore((s) => s.setCaptureState);
  const [view, setView] = useState<View>("main");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);

  useHotkeys();

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

  // When a capture completes, add it to the canvas
  useEffect(() => {
    if (captureState === "captured" && lastCapturePath) {
      addScreenshotToCanvas(lastCapturePath);
      setCaptureState("idle");
    }
  }, [captureState, lastCapturePath, setCaptureState]);

  // Undo/redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useCanvasStore.temporal.getState().undo();
      }
      if (mod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        useCanvasStore.temporal.getState().redo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const { selectedId } = useCanvasStore.getState();
        if (selectedId) {
          e.preventDefault();
          useCanvasStore.getState().removeSelected();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <WaylandBanner />

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-800">
        <button
          onClick={() => void handleFullscreen()}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
        >
          Full Screen
        </button>
        <button
          onClick={() => setCaptureState("selecting-region")}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
        >
          Region
        </button>
        <button
          onClick={() => setCaptureState("selecting-window")}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
        >
          Window
        </button>

        <div className="flex-1" />

        {captureState === "capturing" && (
          <span className="text-xs text-neutral-500 animate-pulse">
            Capturing...
          </span>
        )}

        <button
          onClick={() => setShowShortcuts(true)}
          className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Shortcuts
        </button>
        <button
          onClick={() => setView("settings")}
          className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Settings
        </button>
      </div>

      {/* Main content: sidebar + canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-56 border-r border-neutral-800 overflow-y-auto p-3 space-y-6 shrink-0">
          <ToolPanel />
          <AspectRatioPanel />
        </aside>

        {/* Canvas */}
        <CanvasStage stageRef={stageRef} />

        {/* Right sidebar */}
        <aside className="w-56 border-l border-neutral-800 overflow-y-auto p-3 space-y-6 shrink-0">
          <BackgroundPanel />
          <StylePanel />
          <PresetPanel />
          <ExportPanel stageRef={stageRef} />
        </aside>
      </div>

      {/* Window picker modal */}
      {captureState === "selecting-window" && (
        <WindowPicker
          onSelect={handleWindowSelect}
          onCancel={() => setCaptureState("idle")}
        />
      )}

      {/* Shortcuts modal */}
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}
