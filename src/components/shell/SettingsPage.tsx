import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, DEFAULT_HOTKEYS } from "../../stores/app.store";

/**
 * Hotkey configuration UI. Reads and writes per-mode shortcuts.
 * Calls update_hotkeys on the Rust backend to re-register shortcuts.
 */
export default function SettingsPage({ onBack }: { onBack: () => void }) {
  const hotkeys = useAppStore((s) => s.hotkeys);
  const setHotkeys = useAppStore((s) => s.setHotkeys);
  const isWayland = useAppStore((s) => s.isWayland);

  const [draft, setDraft] = useState(hotkeys);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await invoke("update_hotkeys", {
        config: {
          capture_region: draft.captureRegion,
          capture_fullscreen: draft.captureFullscreen,
          capture_window: draft.captureWindow,
        },
      });
      setHotkeys(draft);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(DEFAULT_HOTKEYS);
  };

  const updateField = (
    field: keyof typeof draft,
    value: string,
  ) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 text-neutral-100">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-800">
        <button
          onClick={onBack}
          className="text-neutral-500 hover:text-neutral-300 text-sm"
        >
          Back
        </button>
        <h1 className="text-sm font-medium">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 max-w-lg">
        <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
          Keyboard Shortcuts
        </h2>

        {isWayland && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-800/30 text-xs text-amber-300">
            Hotkeys are disabled on Wayland. Use the system tray instead.
          </div>
        )}

        <div className="space-y-4">
          <ShortcutField
            label="Capture Region"
            value={draft.captureRegion}
            onChange={(v) => updateField("captureRegion", v)}
            disabled={isWayland}
          />
          <ShortcutField
            label="Capture Full Screen"
            value={draft.captureFullscreen}
            onChange={(v) => updateField("captureFullscreen", v)}
            disabled={isWayland}
          />
          <ShortcutField
            label="Capture Window"
            value={draft.captureWindow}
            onChange={(v) => updateField("captureWindow", v)}
            disabled={isWayland}
          />
        </div>

        {error && (
          <div className="mt-4 px-3 py-2 rounded-lg bg-red-900/20 border border-red-800/30 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || isWayland}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleReset}
            disabled={isWayland}
            className="px-4 py-2 text-sm rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}

function ShortcutField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-neutral-300">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-56 px-3 py-1.5 text-sm rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 placeholder:text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-indigo-500"
        placeholder="e.g. CommandOrControl+Shift+3"
      />
    </div>
  );
}
