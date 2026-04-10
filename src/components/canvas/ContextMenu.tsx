import { useEffect, useRef } from "react";
import { useCanvasStore } from "../../stores/canvas.store";

interface ContextMenuProps {
  x: number;
  y: number;
  elementId: string;
  onClose: () => void;
}

const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");
const modKey = isMac ? "Cmd" : "Ctrl";

interface MenuItem {
  label: string;
  shortcut: string;
  direction: "front" | "forward" | "backward" | "back";
}

const items: MenuItem[] = [
  { label: "Bring to Front", shortcut: `${modKey}+Shift+]`, direction: "front" },
  { label: "Bring Forward", shortcut: `${modKey}+]`, direction: "forward" },
  { label: "Send Backward", shortcut: `${modKey}+[`, direction: "backward" },
  { label: "Send to Back", shortcut: `${modKey}+Shift+[`, direction: "back" },
];

export default function ContextMenu({ x, y, elementId, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const handleAction = (direction: "front" | "forward" | "backward" | "back") => {
    useCanvasStore.getState().reorderElement(elementId, direction);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50"
      style={{ left: x, top: y }}
    >
      <div className="bg-zinc-900 border border-zinc-700/60 rounded-lg shadow-xl py-1 min-w-[200px]">
        {items.map((item, i) => (
          <div key={item.direction}>
            {i === 2 && <div className="h-px bg-zinc-700/40 my-1" />}
            <button
              onClick={() => handleAction(item.direction)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[13px] text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <span>{item.label}</span>
              <span className="text-zinc-500 text-[11px] ml-4">{item.shortcut}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
