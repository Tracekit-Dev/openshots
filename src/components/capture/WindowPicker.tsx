import { useEffect, useState } from "react";
import { listWindows, type WindowInfo } from "../../ipc/capture";

interface WindowPickerProps {
  onSelect: (windowId: number) => void;
  onCancel: () => void;
}

export default function WindowPicker({ onSelect, onCancel }: WindowPickerProps) {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listWindows()
      .then((w) => {
        if (!cancelled) {
          setWindows(w);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  // Group windows by app
  const grouped = windows.reduce<Record<string, WindowInfo[]>>((acc, w) => {
    const app = w.app_name || "Other";
    if (!acc[app]) acc[app] = [];
    acc[app].push(w);
    return acc;
  }, {});

  const appNames = Object.keys(grouped).sort();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <h2 className="text-[14px] font-medium text-zinc-200">
            Select Window
          </h2>
          <button
            onClick={onCancel}
            className="px-2 py-0.5 text-zinc-500 hover:text-zinc-300 text-[12px] rounded bg-zinc-800/60 hover:bg-zinc-700/60 transition-colors"
          >
            Esc
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="px-5 py-10 text-center text-zinc-500 text-[13px]">
              <div className="animate-pulse">Scanning windows...</div>
            </div>
          )}

          {error && (
            <div className="px-5 py-8 text-center text-red-400 text-[13px]">
              {error}
            </div>
          )}

          {!loading && !error && windows.length === 0 && (
            <div className="px-5 py-10 text-center text-zinc-500 text-[13px]">
              No capturable windows found
            </div>
          )}

          {appNames.map((appName) => (
            <div key={appName}>
              {/* App group header */}
              <div className="px-4 py-2 bg-zinc-800/30 border-b border-zinc-800/40">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                  {appName}
                </span>
              </div>

              {/* Windows in this app */}
              {(grouped[appName] ?? []).map((w) => (
                <button
                  key={w.id}
                  onClick={() => onSelect(w.id)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-zinc-800/60 transition-colors text-left border-b border-zinc-800/20 last:border-0"
                >
                  {/* Window icon placeholder */}
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18" />
                      <circle cx="7" cy="6" r="0.5" fill="currentColor" />
                      <circle cx="10" cy="6" r="0.5" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-zinc-200 truncate">
                      {w.title}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600 shrink-0">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="px-4 py-2.5 border-t border-zinc-800/60 bg-zinc-900/80">
          <p className="text-[11px] text-zinc-600">
            {windows.length} window{windows.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </div>
    </div>
  );
}
