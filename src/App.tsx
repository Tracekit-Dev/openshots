import { useEffect, useRef, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import Konva from "konva";
import { useAppStore } from "./stores/app.store";
import { useCanvasStore, type CanvasImage } from "./stores/canvas.store";
import { useCaptureFlow } from "./hooks/useCaptureFlow";
import { readImageFile } from "./ipc/capture";
import { openProjectFromPath } from "./lib/project-file";
import RegionOverlay from "./components/capture/RegionOverlay";
import WindowPicker from "./components/capture/WindowPicker";
import WaylandBanner from "./components/shell/WaylandBanner";
import SettingsPage from "./components/shell/SettingsPage";
import CanvasStage, { addScreenshotToCanvas } from "./components/canvas/CanvasStage";
import EditorToolbar from "./components/toolbar/EditorToolbar";
import BackgroundPopover from "./components/toolbar/BackgroundPopover";
import DragBar from "./components/toolbar/DragBar";
import ShortcutsModal from "./components/shell/ShortcutsModal";
import { useHotkeys } from "./hooks/useHotkeys";

type View = "main" | "settings";

function addImageFromUrl(url: string) {
  console.log("[Screenshots] Loading image from:", url);
  const img = new window.Image();
  img.src = url;
  img.onload = () => {
    console.log("[Screenshots] Image loaded:", img.naturalWidth, "x", img.naturalHeight);
    const store = useCanvasStore.getState();
    const { canvasWidth, canvasHeight, images, addImage, setCanvasSize } = store;

    // Auto-adapt canvas to match image aspect ratio when first image is added
    if (images.length === 0) {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      // Keep the larger canvas dimension, adjust the other to match image ratio
      let newW = canvasWidth;
      let newH = canvasHeight;
      if (imgRatio > 1) {
        // Landscape image: keep width, adjust height
        newH = Math.round(canvasWidth / imgRatio);
      } else {
        // Portrait/square: keep height, adjust width
        newW = Math.round(canvasHeight * imgRatio);
      }
      setCanvasSize(newW, newH);
    }

    const cw = useCanvasStore.getState().canvasWidth;
    const ch = useCanvasStore.getState().canvasHeight;
    const maxDim = Math.min(cw, ch) * 0.6;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const newImage: CanvasImage = {
      id: crypto.randomUUID(),
      src: url,
      x: cw / 2,
      y: ch / 2,
      width: w,
      height: h,
      rotation: 0,
      cornerRadius: 12,
      flipX: false,
      flipY: false,
      shadow: {
        enabled: true,
        color: "rgba(0,0,0,0.3)",
        blur: 20,
        offsetX: 0,
        offsetY: 10,
      },
      insetBorder: {
        enabled: false,
        color: "#ffffff",
        width: 8,
      },
    };
    addImage(newImage);
  };
  img.onerror = (err) => {
    console.error("[Screenshots] Image failed to load:", url, err);
  };
}

export default function App() {
  const setWayland = useAppStore((s) => s.setWayland);
  const captureState = useAppStore((s) => s.captureState);
  const lastCapturePath = useAppStore((s) => s.lastCapturePath);
  const setCaptureState = useAppStore((s) => s.setCaptureState);
  const regionScreenshotPath = useAppStore((s) => s.regionScreenshotPath);
  const setRegionScreenshotPath = useAppStore((s) => s.setRegionScreenshotPath);
  const images = useCanvasStore((s) => s.images);
  const [view, setView] = useState<View>("main");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [bgPopover, setBgPopover] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<Konva.Stage>(null);

  useHotkeys();

  const {
    handleFullscreen,
    handleRegionStart,
    handleRegionCancel,
    handleWindowSelect,
  } = useCaptureFlow();

  const handleRegionComplete = useCallback(
    (blobUrl: string) => {
      setRegionScreenshotPath(null);
      addImageFromUrl(blobUrl);
      setCaptureState("idle");
    },
    [setCaptureState, setRegionScreenshotPath],
  );

  const handleUpload = useCallback(async () => {
    try {
      const filePath = await open({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"],
          },
        ],
      });
      console.log("[Screenshots] Upload dialog result:", filePath);
      if (filePath) {
        const dataUrl = await readImageFile(filePath as string);
        console.log("[Screenshots] Upload data URL length:", dataUrl.length);
        addImageFromUrl(dataUrl);
      }
    } catch (err) {
      console.error("[Screenshots] Upload failed:", err);
    }
  }, []);

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

  // Tauri native file drop — use ref to prevent StrictMode double-registration
  const dropRegistered = useRef(false);
  useEffect(() => {
    if (dropRegistered.current) return;
    dropRegistered.current = true;
    let unlisten: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent(async (event) => {
        if (event.payload.type === "drop") {
          let projectOpened = false;
          for (const filePath of event.payload.paths) {
            const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
            // Handle .openshots project files — only open the first one
            if (ext === "openshots" && !projectOpened) {
              projectOpened = true;
              void openProjectFromPath(filePath);
              continue;
            }
            if (!["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) continue;
            try {
              const dataUrl = await readImageFile(filePath);
              addImageFromUrl(dataUrl);
            } catch (err) {
              console.error("[DragDrop] Failed:", err);
            }
          }
        }
      })
      .then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  // When a capture completes, add it to the canvas
  useEffect(() => {
    if (captureState === "captured" && lastCapturePath) {
      addScreenshotToCanvas(lastCapturePath);
      setCaptureState("idle");
    }
  }, [captureState, lastCapturePath, setCaptureState]);

  // Delete selected element (undo/redo is handled in CanvasStage)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
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

  // Menu bar events (File > Open, File > Save, File > Export)
  useEffect(() => {
    const listeners = [
      listen("menu:open-project", () => {
        import("./lib/project-file").then((m) => m.openProject());
      }),
      listen("menu:save-project", () => {
        import("./lib/project-file").then((m) => m.saveProject());
      }),
      listen("menu:export", () => {
        window.dispatchEvent(new Event("openExportPopover"));
      }),
    ];
    return () => { listeners.forEach((p) => p.then((fn) => fn())); };
  }, []);

  // Region selection overlay
  if (captureState === "selecting-region" && regionScreenshotPath) {
    return (
      <RegionOverlay
        screenshotSrc={regionScreenshotPath}
        onComplete={handleRegionComplete}
        onCancel={handleRegionCancel}
      />
    );
  }

  // Settings page
  if (view === "settings") {
    return <SettingsPage onBack={() => setView("main")} />;
  }

  const hasImages = images.length > 0;

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <WaylandBanner />

      {/* Capture bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-1">
          <button
            onClick={() => void handleFullscreen()}
            className="px-3 py-1.5 text-[13px] rounded-md bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
          >
            Full Screen
          </button>
          <button
            onClick={() => void handleRegionStart()}
            className="px-3 py-1.5 text-[13px] rounded-md bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
          >
            Region
          </button>
          <button
            onClick={() => setCaptureState("selecting-window")}
            className="px-3 py-1.5 text-[13px] rounded-md bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
          >
            Window
          </button>
        </div>

        <div className="w-px h-4 bg-zinc-800/60 mx-1" />

        <button
          onClick={() => void handleUpload()}
          className="px-3 py-1.5 text-[13px] rounded-md bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
        >
          Upload
        </button>

        <div className="flex-1" />

        {captureState === "capturing" && (
          <span className="text-[13px] text-zinc-500 animate-pulse">
            Capturing...
          </span>
        )}

        <button
          onClick={() => void openUrl("https://www.tracekit.dev")}
          className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors mr-1"
        >
          by TraceKit
        </button>

        <button
          onClick={() => setShowShortcuts(true)}
          className="px-2.5 py-1.5 text-[13px] text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-800/60 transition-colors"
        >
          ?
        </button>
        <button
          onClick={() => setView("settings")}
          className="px-2.5 py-1.5 text-[13px] text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-800/60 transition-colors"
        >
          Settings
        </button>
      </div>

      {/* Editor toolbar -- only visible when images exist */}
      {hasImages && <EditorToolbar stageRef={stageRef} />}

      {/* Canvas area -- full width, no sidebars */}
      <div className="flex-1 overflow-hidden relative">
        {hasImages ? (
          <CanvasStage
            stageRef={stageRef}
            onBackgroundClick={(pos) => setBgPopover(pos)}
          />
        ) : (
          <EmptyState
            onFullscreen={() => void handleFullscreen()}
            onRegion={() => void handleRegionStart()}
            onWindow={() => setCaptureState("selecting-window")}
            onUpload={() => void handleUpload()}
          />
        )}

        {/* Drag bar -- absolutely positioned at bottom of canvas area */}
        {hasImages && <DragBar stageRef={stageRef} />}
      </div>

      {/* Background popover */}
      {bgPopover && (
        <BackgroundPopover position={bgPopover} onClose={() => setBgPopover(null)} />
      )}

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

function EmptyState({
  onFullscreen,
  onRegion,
  onWindow,
  onUpload,
}: {
  onFullscreen: () => void;
  onRegion: () => void;
  onWindow: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-900/50 h-full">
      <div className="flex flex-col items-center gap-6 max-w-sm">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-400"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </div>

        <div className="text-center space-y-1.5">
          <h2 className="text-[15px] font-medium text-zinc-200">
            Capture or upload a screenshot
          </h2>
          <p className="text-[13px] text-zinc-500 leading-relaxed">
            Take a screenshot of your screen, a window, or upload an image to start editing.
          </p>
        </div>

        {/* Capture buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onFullscreen}
            className="px-4 py-2 text-[13px] font-medium rounded-lg bg-white text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            Full Screen
          </button>
          <button
            onClick={onRegion}
            className="px-4 py-2 text-[13px] font-medium rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Region
          </button>
          <button
            onClick={onWindow}
            className="px-4 py-2 text-[13px] font-medium rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Window
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-zinc-800/60" />
          <span className="text-[11px] text-zinc-600">or</span>
          <div className="flex-1 h-px bg-zinc-800/60" />
        </div>

        {/* Upload + drop */}
        <button
          onClick={onUpload}
          className="px-4 py-2 text-[13px] rounded-lg bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          Upload image
        </button>

        <p className="text-[11px] text-zinc-600">
          You can also drag and drop images onto the canvas
        </p>
      </div>
    </div>
  );
}
