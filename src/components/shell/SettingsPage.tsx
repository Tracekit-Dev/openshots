import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useAppStore, DEFAULT_HOTKEYS } from "../../stores/app.store";
import { APP_VERSION } from "../../lib/version";

export default function SettingsPage({ onBack }: { onBack: () => void }) {
  const hotkeys = useAppStore((s) => s.hotkeys);
  const setHotkeys = useAppStore((s) => s.setHotkeys);
  const isWayland = useAppStore((s) => s.isWayland);

  const [draft, setDraft] = useState(hotkeys);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await invoke("update_hotkeys", {
        config: {
          capture_region: draft.captureRegion,
          capture_fullscreen: draft.captureFullscreen,
          capture_window: draft.captureWindow,
        },
      });
      setHotkeys(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3.5 border-b border-zinc-800/60">
        <button
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-200 text-[13px] transition-colors"
        >
          Back
        </button>
        <div className="w-px h-4 bg-zinc-800/60" />
        <h1 className="text-[14px] font-medium">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center overflow-y-auto">
        <div className="w-full max-w-xl px-6 py-10">
          {/* Shortcuts section */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-800/40">
              <h2 className="text-[13px] font-medium text-zinc-300">
                Keyboard Shortcuts
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Global hotkeys for capturing screenshots from anywhere
              </p>
            </div>

            {isWayland && (
              <div className="mx-5 mt-4 px-3 py-2.5 rounded-lg bg-amber-950/20 border border-amber-900/30 text-[12px] text-amber-300/80">
                Hotkeys are disabled on Wayland. Use the system tray instead.
              </div>
            )}

            <div className="p-5 space-y-4">
              <ShortcutField
                label="Capture Region"
                hint="Select an area of the screen"
                value={draft.captureRegion}
                onChange={(v) => updateField("captureRegion", v)}
                disabled={isWayland}
              />
              <div className="h-px bg-zinc-800/40" />
              <ShortcutField
                label="Capture Full Screen"
                hint="Capture the entire display"
                value={draft.captureFullscreen}
                onChange={(v) => updateField("captureFullscreen", v)}
                disabled={isWayland}
              />
              <div className="h-px bg-zinc-800/40" />
              <ShortcutField
                label="Capture Window"
                hint="Capture a specific window"
                value={draft.captureWindow}
                onChange={(v) => updateField("captureWindow", v)}
                disabled={isWayland}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 px-4 py-2.5 rounded-lg bg-red-950/20 border border-red-900/30 text-[12px] text-red-300/80">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || isWayland}
              className="px-5 py-2 text-[13px] font-medium rounded-lg bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleReset}
              disabled={isWayland}
              className="px-5 py-2 text-[13px] rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Reset to defaults
            </button>
            {saved && (
              <span className="text-[12px] text-emerald-400">Saved</span>
            )}
          </div>

          {/* About */}
          <div className="mt-10 rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-800/40">
              <h2 className="text-[13px] font-medium text-zinc-300">About</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-400">Version</span>
                <span className="text-[13px] text-zinc-200">{APP_VERSION}</span>
              </div>
              <div className="h-px bg-zinc-800/40" />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-400">License</span>
                <span className="text-[13px] text-zinc-200">MIT</span>
              </div>
              <div className="h-px bg-zinc-800/40" />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-400">Built by</span>
                <button
                  onClick={() => void openUrl("https://www.tracekit.dev")}
                  className="text-[13px] text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                >
                  TraceKit
                </button>
              </div>
              <div className="h-px bg-zinc-800/40" />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-400">Community</span>
                <button
                  onClick={() => void openUrl("https://discord.gg/huSuJ94k")}
                  className="text-[13px] text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                >
                  Discord
                </button>
              </div>
              <div className="h-px bg-zinc-800/40" />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-zinc-400">Source</span>
                <button
                  onClick={() => void openUrl("https://github.com/Tracekit-Dev/openshots")}
                  className="text-[13px] text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                >
                  GitHub
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const isMac = navigator.userAgent.includes("Mac");

function formatShortcut(raw: string): string {
  if (!isMac) return raw;
  return raw
    .replace(/CommandOrControl/g, "⌘")
    .replace(/Command/g, "⌘")
    .replace(/Control/g, "⌃")
    .replace(/Shift/g, "⇧")
    .replace(/Alt/g, "⌥")
    .replace(/\+/g, "");
}

function ShortcutField({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <div className="text-[13px] text-zinc-200">{label}</div>
        <div className="text-[11px] text-zinc-500 mt-0.5">{hint}</div>
      </div>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          autoFocus
          disabled={disabled}
          className="w-40 px-3 py-2 text-[13px] rounded-lg bg-zinc-800 border border-zinc-600 text-zinc-200 placeholder:text-zinc-600 disabled:opacity-40 focus:outline-none transition-colors"
          placeholder="e.g. ⌘⇧3"
        />
      ) : (
        <button
          onClick={() => !disabled && setEditing(true)}
          disabled={disabled}
          className="px-4 py-2 text-[14px] font-mono tracking-wide rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-zinc-300 hover:bg-zinc-700/60 hover:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {formatShortcut(value)}
        </button>
      )}
    </div>
  );
}
