import { SHORTCUT_REGISTRY } from "../../hooks/useHotkeys";

interface ShortcutsModalProps {
  onClose: () => void;
}

export default function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  const categories = [...new Set(SHORTCUT_REGISTRY.map((s) => s.category))];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <h2 className="text-[14px] font-medium text-zinc-200">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-[13px] transition-colors"
          >
            Esc
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-96 overflow-y-auto">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide mb-2">
                {cat}
              </h3>
              <div className="space-y-1">
                {SHORTCUT_REGISTRY.filter((s) => s.category === cat).map(
                  (shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-[13px] text-zinc-300">
                        {shortcut.description}
                      </span>
                      <kbd className="px-2 py-0.5 text-[11px] font-mono bg-zinc-800 border border-zinc-700/60 rounded text-zinc-400">
                        {shortcut.label}
                      </kbd>
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
