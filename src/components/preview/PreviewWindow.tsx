import { useEffect, useRef, useState, useCallback } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

const AUTO_DISMISS_MS = 5000;

export default function PreviewWindow() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    void invoke("dismiss_preview");
  }, []);

  const startAutoDismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
  }, [dismiss]);

  const stopAutoDismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Listen for preview:show event from Rust
  useEffect(() => {
    const unlisten = listen<string>("preview:show", (event) => {
      setImageUrl(event.payload);
      startAutoDismiss();
    });
    return () => {
      unlisten.then((fn) => fn());
      stopAutoDismiss();
    };
  }, [startAutoDismiss, stopAutoDismiss]);

  const handleMouseEnter = () => {
    setHovered(true);
    stopAutoDismiss();
  };

  const handleMouseLeave = () => {
    setHovered(false);
    startAutoDismiss();
  };

  const handleEdit = () => {
    if (imageUrl) {
      // Emit event to main window to open the image in editor
      void emit("preview:edit", imageUrl);
      dismiss();
    }
  };

  const handleSave = async () => {
    if (!imageUrl) return;
    try {
      // Try to get default save settings from store
      const { load } = await import("@tauri-apps/plugin-store");
      const store = await load("settings.json", { autoSave: true, defaults: {} });
      const saveDir = await store.get<string>("defaultSaveDir");
      const saveFormat = await store.get<string>("defaultSaveFormat") ?? "png";

      if (saveDir) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const filename = `openshots-${timestamp}.${saveFormat}`;
        const savePath = `${saveDir}/${filename}`;

        await invoke("save_data_url_image", {
          dataUrl: imageUrl,
          outputPath: savePath,
        });
      }
    } catch (err) {
      console.error("[Preview] Save failed:", err);
    }
    dismiss();
  };

  if (!imageUrl) {
    return (
      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
        <span className="text-zinc-600 text-[11px]">Waiting...</span>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full bg-zinc-900 rounded-lg overflow-hidden relative cursor-default"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail */}
      <img
        src={imageUrl}
        alt="Capture preview"
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* Dismiss button - always visible */}
      <button
        onClick={dismiss}
        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white flex items-center justify-center text-[11px] leading-none transition-colors"
        aria-label="Dismiss"
      >
        x
      </button>

      {/* Action buttons - visible on hover */}
      {hovered && (
        <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <button
            onClick={handleEdit}
            className="flex-1 py-1.5 text-[11px] font-medium rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => void handleSave()}
            className="flex-1 py-1.5 text-[11px] font-medium rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
