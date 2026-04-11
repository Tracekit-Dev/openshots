import { useState, useRef, useCallback, type ReactNode } from "react";

interface ToolbarTooltipProps {
  children: ReactNode;
  label: string;
  shortcut?: string;
}

export default function ToolbarTooltip({ children, label, shortcut }: ToolbarTooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), 400);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && (
        <div className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 z-50 pointer-events-none">
          {/* Arrow */}
          <div className="absolute left-1/2 -top-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-zinc-800" />
          {/* Content */}
          <div className="relative bg-zinc-800 text-zinc-200 text-[11px] px-2 py-1 rounded-md shadow-lg whitespace-nowrap flex items-center gap-1.5">
            <span>{label}</span>
            {shortcut && <span className="text-zinc-400">{shortcut}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
