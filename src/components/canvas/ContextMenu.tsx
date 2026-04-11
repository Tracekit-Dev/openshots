import { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "../../stores/canvas.store";

interface ContextMenuProps {
  x: number;
  y: number;
  elementId: string;
  onClose: () => void;
  onRemoveBackground?: (elementId: string) => void;
}

const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");
const modKey = isMac ? "Cmd" : "Ctrl";

interface MenuItem {
  label: string;
  shortcut: string;
  action: string;
}

const zOrderItems: MenuItem[] = [
  { label: "Bring to Front", shortcut: `${modKey}+Shift+]`, action: "front" },
  { label: "Bring Forward", shortcut: `${modKey}+]`, action: "forward" },
  { label: "Send Backward", shortcut: `${modKey}+[`, action: "backward" },
  { label: "Send to Back", shortcut: `${modKey}+Shift+[`, action: "back" },
];

export default function ContextMenu({ x, y, elementId, onClose, onRemoveBackground }: ContextMenuProps) {
  const isImage = useCanvasStore.getState().images.some((img) => img.id === elementId);
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Build flat list of all visible menu items
  const allItems: MenuItem[] = [
    ...zOrderItems,
    ...(isImage && onRemoveBackground
      ? [{ label: "Remove Background", shortcut: "", action: "remove-bg" }]
      : []),
  ];

  // Focus the menu container on mount
  useEffect(() => {
    menuRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % allItems.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = allItems[focusedIndex];
        if (item) executeAction(item.action);
        return;
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose, focusedIndex, allItems.length]);

  const executeAction = (action: string) => {
    if (action === "remove-bg" && onRemoveBackground) {
      onRemoveBackground(elementId);
      onClose();
    } else if (["front", "forward", "backward", "back"].includes(action)) {
      useCanvasStore.getState().reorderElement(elementId, action as "front" | "forward" | "backward" | "back");
      onClose();
    }
  };

  // Track the running index for the flat item list
  let itemIndex = 0;

  return (
    <div
      ref={menuRef}
      className="fixed z-50"
      style={{ left: x, top: y, outline: "none" }}
      tabIndex={-1}
    >
      <div className="bg-zinc-900 border border-zinc-700/60 rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.5)] py-1 min-w-[220px]">
        {zOrderItems.map((item, i) => {
          const currentIndex = itemIndex++;
          return (
            <div key={item.action}>
              {i === 2 && <div className="h-px bg-zinc-700/40 my-1" />}
              <button
                onClick={() => executeAction(item.action)}
                className={`w-full flex items-center justify-between px-3 py-2 text-[13px] text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700 transition-colors duration-150 ${
                  focusedIndex === currentIndex ? "bg-zinc-800" : ""
                }`}
              >
                <span>{item.label}</span>
                <span className="text-zinc-500 text-[11px] ml-4">{item.shortcut}</span>
              </button>
            </div>
          );
        })}
        {isImage && onRemoveBackground && (
          <>
            <div className="h-px bg-zinc-700/40 my-1" />
            <button
              onClick={() => executeAction("remove-bg")}
              className={`w-full flex items-center justify-between px-3 py-2 text-[13px] text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700 transition-colors duration-150 ${
                focusedIndex === itemIndex ? "bg-zinc-800" : ""
              }`}
            >
              <span>Remove Background</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
