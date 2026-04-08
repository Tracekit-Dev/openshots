import { useCallback, useEffect, useRef, useState } from "react";
import type { CaptureRegionArgs } from "../../ipc/capture";

interface RegionOverlayProps {
  onComplete: (args: CaptureRegionArgs) => void;
  onCancel: () => void;
}

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * Fullscreen transparent overlay for rubber-band region selection.
 * All coordinates are multiplied by devicePixelRatio before being
 * sent to the Rust backend (which operates in physical pixels).
 */
export default function RegionOverlay({
  onComplete,
  onCancel,
}: RegionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const draw = useCallback(
    (sel: SelectionRect | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);

      // Dark overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      if (!sel) return;

      const x = Math.min(sel.startX, sel.endX);
      const y = Math.min(sel.startY, sel.endY);
      const w = Math.abs(sel.endX - sel.startX);
      const h = Math.abs(sel.endY - sel.startY);

      if (w === 0 || h === 0) return;

      // Clear selected area
      ctx.clearRect(x, y, w, h);

      // Border around selection
      ctx.strokeStyle = "rgba(99, 102, 241, 0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Dimension label
      const dprW = Math.round(w * dpr);
      const dprH = Math.round(h * dpr);
      const label = `${dprW} x ${dprH}`;
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(99, 102, 241, 0.9)";
      const metrics = ctx.measureText(label);
      const labelX = x + w / 2 - metrics.width / 2;
      const labelY = y > 24 ? y - 8 : y + h + 18;
      ctx.fillText(label, labelX, labelY);
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) {
        onCancel();
        return;
      }
      setIsDragging(true);
      setSelection({
        startX: e.clientX,
        startY: e.clientY,
        endX: e.clientX,
        endY: e.clientY,
      });
    },
    [onCancel],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !selection) return;
      const updated = { ...selection, endX: e.clientX, endY: e.clientY };
      setSelection(updated);
      draw(updated);
    },
    [isDragging, selection, draw],
  );

  const handleMouseUp = useCallback(() => {
    if (!selection) return;
    setIsDragging(false);

    const dpr = window.devicePixelRatio || 1;
    const x = Math.round(Math.min(selection.startX, selection.endX) * dpr);
    const y = Math.round(Math.min(selection.startY, selection.endY) * dpr);
    const w = Math.round(Math.abs(selection.endX - selection.startX) * dpr);
    const h = Math.round(Math.abs(selection.endY - selection.startY) * dpr);

    if (w < 4 || h < 4) {
      onCancel();
      return;
    }

    onComplete({ x, y, width: w, height: h });
  }, [selection, onComplete, onCancel]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  // Initial draw
  useEffect(() => {
    draw(null);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 cursor-crosshair"
      style={{ width: "100vw", height: "100vh" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  );
}
