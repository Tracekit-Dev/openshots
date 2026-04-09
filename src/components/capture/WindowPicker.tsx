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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <h2 className="text-[14px] font-medium text-zinc-200">
            Select a window to capture
          </h2>
          <button
            onClick={onCancel}
            className="text-zinc-500 hover:text-zinc-300 text-[13px] transition-colors"
          >
            Esc
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="px-5 py-8 text-center text-zinc-500 text-[13px]">
              Loading windows...
            </div>
          )}

          {error && (
            <div className="px-5 py-8 text-center text-red-400 text-[13px]">
              {error}
            </div>
          )}

          {!loading && !error && windows.length === 0 && (
            <div className="px-5 py-8 text-center text-zinc-500 text-[13px]">
              No capturable windows found
            </div>
          )}

          {windows.map((w) => (
            <button
              key={w.id}
              onClick={() => onSelect(w.id)}
              className="w-full px-5 py-3 flex items-center gap-3 hover:bg-zinc-800/60 transition-colors text-left border-b border-zinc-800/40 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-zinc-200 truncate">
                  {w.title}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">
                  {w.app_name}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
