import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { useCanvasStore } from "../../stores/canvas.store";
import {
  usePresetStore,
  type CanvasPreset,
} from "../../stores/preset.store";

function isValidPresetEntry(entry: unknown): entry is Partial<CanvasPreset> {
  if (typeof entry !== "object" || entry === null) return false;
  const obj = entry as Record<string, unknown>;
  if (typeof obj.name !== "string") return false;
  if (typeof obj.canvasWidth !== "number") return false;
  if (typeof obj.canvasHeight !== "number") return false;
  if (typeof obj.background !== "object" || obj.background === null)
    return false;
  return true;
}

function fillDefaults(partial: Partial<CanvasPreset>): CanvasPreset {
  return {
    id: crypto.randomUUID(),
    name: partial.name ?? "Imported Preset",
    canvasWidth: partial.canvasWidth ?? 1280,
    canvasHeight: partial.canvasHeight ?? 960,
    padding: partial.padding ?? 64,
    background: partial.background ?? {
      type: "solid" as const,
      color: "#1e1e2e",
      gradientColors: ["#1e1e2e", "#1e1e2e"] as [string, string],
      gradientAngle: 135,
      imageSrc: null,
      blur: 0,
      grain: 0,
    },
    cornerRadius: partial.cornerRadius ?? 12,
    shadowEnabled: partial.shadowEnabled ?? true,
    shadowBlur: partial.shadowBlur ?? 20,
    shadowOffsetY: partial.shadowOffsetY ?? 10,
    insetBorderEnabled: partial.insetBorderEnabled ?? false,
    insetBorderWidth: partial.insetBorderWidth ?? 8,
  };
}

export default function PresetPanel() {
  const presets = usePresetStore((s) => s.presets);
  const addPreset = usePresetStore((s) => s.addPreset);
  const removePreset = usePresetStore((s) => s.removePreset);
  const importPresets = usePresetStore((s) => s.importPresets);

  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (!importError) return;
    const timer = setTimeout(() => setImportError(null), 3000);
    return () => clearTimeout(timer);
  }, [importError]);

  const handleSave = () => {
    const state = useCanvasStore.getState();
    const name = `Preset ${presets.length + 1}`;
    const firstImage = state.images[0];

    const preset: CanvasPreset = {
      id: crypto.randomUUID(),
      name,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      padding: state.padding,
      background: { ...state.background },
      cornerRadius: firstImage?.cornerRadius ?? 12,
      shadowEnabled: firstImage?.shadow.enabled ?? true,
      shadowBlur: firstImage?.shadow.blur ?? 20,
      shadowOffsetY: firstImage?.shadow.offsetY ?? 10,
      insetBorderEnabled: firstImage?.insetBorder.enabled ?? false,
      insetBorderWidth: firstImage?.insetBorder.width ?? 8,
    };

    addPreset(preset);
  };

  const handleApply = (preset: CanvasPreset) => {
    const store = useCanvasStore.getState();
    store.setCanvasSize(preset.canvasWidth, preset.canvasHeight);
    store.setPadding(preset.padding);
    store.setBackground(preset.background);

    store.images.forEach((img) => {
      store.updateImage(img.id, {
        cornerRadius: preset.cornerRadius,
        shadow: {
          enabled: preset.shadowEnabled,
          color: "rgba(0,0,0,0.3)",
          blur: preset.shadowBlur,
          offsetX: 0,
          offsetY: preset.shadowOffsetY,
        },
        insetBorder: {
          enabled: preset.insetBorderEnabled,
          color: img.insetBorder.color,
          width: preset.insetBorderWidth,
        },
      });
    });
  };

  const handleExport = async () => {
    const currentPresets = usePresetStore.getState().presets;
    if (currentPresets.length === 0) return;

    const exportObj = {
      version: 1,
      app: "openshots",
      presets: currentPresets,
    };

    const path = await save({
      defaultPath: "openshots-presets.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!path) return;

    try {
      await invoke<string>("save_text_file", {
        path,
        contents: JSON.stringify(exportObj, null, 2),
      });
    } catch (err) {
      console.error("[OpenShots] Failed to export presets:", err);
    }
  };

  const handleImport = async () => {
    const filePath = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!filePath) return;

    try {
      const contents = await invoke<string>("read_text_file", {
        path: filePath as string,
      });

      let data: unknown;
      try {
        data = JSON.parse(contents);
      } catch {
        setImportError("Invalid JSON file");
        return;
      }

      if (typeof data !== "object" || data === null) {
        setImportError("Invalid preset file format");
        return;
      }

      const obj = data as Record<string, unknown>;
      if (!Array.isArray(obj.presets)) {
        setImportError("No presets array found in file");
        return;
      }

      const validPresets: CanvasPreset[] = [];
      for (const entry of obj.presets) {
        if (isValidPresetEntry(entry)) {
          validPresets.push(fillDefaults(entry));
        }
      }

      if (validPresets.length === 0) {
        setImportError("No valid presets found in file");
        return;
      }

      importPresets(validPresets);
      setImportError(null);
    } catch (err) {
      console.error("[OpenShots] Failed to import presets:", err);
      setImportError("Failed to read file");
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
        Presets
      </h3>

      <button
        onClick={handleSave}
        className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
      >
        Save Current as Preset
      </button>

      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 px-3 py-2 text-[13px] rounded-md bg-zinc-800/40 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-300 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
        >
          Export
        </button>
        <button
          onClick={handleImport}
          className="flex-1 px-3 py-2 text-[13px] rounded-md bg-zinc-800/40 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-300 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
        >
          Import
        </button>
      </div>

      {importError && (
        <p className="text-[11px] text-red-400">{importError}</p>
      )}

      {presets.length === 0 && (
        <p className="text-[11px] text-zinc-500">No saved presets</p>
      )}

      <div className="space-y-1">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="flex items-center gap-2 px-2 py-2 rounded-md bg-zinc-800/40 group"
          >
            <div
              className="w-5 h-4 rounded-sm shrink-0 border border-zinc-700/50"
              style={{
                background:
                  preset.background.type === "solid"
                    ? preset.background.color
                    : `linear-gradient(${preset.background.gradientAngle}deg, ${preset.background.gradientColors[0]}, ${preset.background.gradientColors[1]})`,
              }}
            />

            <button
              onClick={() => handleApply(preset)}
              className="flex-1 text-left text-[13px] text-zinc-400 hover:text-zinc-100 truncate transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
            >
              {preset.name}
            </button>

            <button
              onClick={() => removePreset(preset.id)}
              className="text-zinc-600 hover:text-red-400 text-[13px] opacity-0 group-hover:opacity-100 transition-opacity duration-150 focus-visible:ring-1 focus-visible:ring-red-500 outline-none"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
