import { SHORTCUT_REGISTRY } from "../../hooks/useHotkeys";

interface ShortcutsModalProps {
  onClose: () => void;
}

/**
 * Modal showing all available keyboard shortcuts.
 * Driven by SHORTCUT_REGISTRY — single source of truth.
 */
export default function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  const categories = [...new Set(SHORTCUT_REGISTRY.map((s) => s.category))];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h2 className="text-sm font-medium text-neutral-200">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 text-sm"
          >
            Esc
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-96 overflow-y-auto">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
                {cat}
              </h3>
              <div className="space-y-1">
                {SHORTCUT_REGISTRY.filter((s) => s.category === cat).map(
                  (shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm text-neutral-300">
                        {shortcut.description}
                      </span>
                      <kbd className="px-2 py-0.5 text-xs font-mono bg-neutral-800 border border-neutral-700 rounded text-neutral-400">
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
