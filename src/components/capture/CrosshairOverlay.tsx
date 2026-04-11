import { useCallback, useState } from "react";

/**
 * Renders thin crosshair lines (horizontal + vertical) following the cursor,
 * plus a coordinate label. Used during region selection for pixel-precise alignment.
 */
export default function CrosshairOverlay() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setPos({ x: e.clientX, y: e.clientY });
    if (!visible) setVisible(true);
  }, [visible]);

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-auto cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setVisible(false)}
    >
      {visible && (
        <>
          {/* Horizontal line */}
          <div
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{
              top: pos.y,
              background: "rgba(255,255,255,0.5)",
              filter: "drop-shadow(0 0 1px rgba(0,0,0,0.8))",
            }}
          />
          {/* Vertical line */}
          <div
            className="absolute top-0 bottom-0 w-px pointer-events-none"
            style={{
              left: pos.x,
              background: "rgba(255,255,255,0.5)",
              filter: "drop-shadow(0 0 1px rgba(0,0,0,0.8))",
            }}
          />
          {/* Coordinate label */}
          <div
            className="absolute pointer-events-none px-2 py-0.5 rounded-full bg-black/70 text-white/80 text-[11px] font-mono whitespace-nowrap"
            style={{
              left: pos.x + 14,
              top: pos.y + 14,
            }}
          >
            x: {pos.x}, y: {pos.y}
          </div>
        </>
      )}
    </div>
  );
}
