import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "../../stores/app.store";
import CrosshairOverlay from "./CrosshairOverlay";

interface RegionOverlayProps {
  screenshotSrc: string;
  onComplete: (blobUrl: string) => void;
  onCancel: () => void;
}

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * Fullscreen overlay showing a captured screenshot.
 * User draws a region on it, and the selected area is cropped client-side.
 */
export default function RegionOverlay({
  screenshotSrc,
  onComplete,
  onCancel,
}: RegionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load the screenshot image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = screenshotSrc;
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
  }, [screenshotSrc]);

  const draw = useCallback(
    (sel: SelectionRect | null) => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      canvas.width = vw * dpr;
      canvas.height = vh * dpr;
      ctx.scale(dpr, dpr);

      // Draw the screenshot scaled to fill the viewport
      ctx.drawImage(img, 0, 0, vw, vh);

      // Dark overlay on top
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, vw, vh);

      if (!sel) return;

      const x = Math.min(sel.startX, sel.endX);
      const y = Math.min(sel.startY, sel.endY);
      const w = Math.abs(sel.endX - sel.startX);
      const h = Math.abs(sel.endY - sel.startY);

      if (w === 0 || h === 0) return;

      // Clear selected area to show the screenshot underneath
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.drawImage(img, 0, 0, vw, vh);
      ctx.restore();

      // Border around selection
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      // Dimension label
      const scaleX = img.naturalWidth / vw;
      const scaleY = img.naturalHeight / vh;
      const realW = Math.round(w * scaleX);
      const realH = Math.round(h * scaleY);
      const label = `${realW} × ${realH}`;
      ctx.font = "12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      const metrics = ctx.measureText(label);
      const labelX = x + w / 2 - metrics.width / 2;
      const labelY = y > 28 ? y - 8 : y + h + 18;

      // Label background
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.beginPath();
      ctx.roundRect(
        labelX - 6,
        labelY - 13,
        metrics.width + 12,
        18,
        4,
      );
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillText(label, labelX, labelY);
    },
    [],
  );

  // Initial draw when image loads
  useEffect(() => {
    if (imageLoaded) draw(null);
  }, [imageLoaded, draw]);

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
    if (!selection || !imgRef.current) return;
    setIsDragging(false);

    const img = imgRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const x = Math.min(selection.startX, selection.endX);
    const y = Math.min(selection.startY, selection.endY);
    const w = Math.abs(selection.endX - selection.startX);
    const h = Math.abs(selection.endY - selection.startY);

    if (w < 4 || h < 4) {
      onCancel();
      return;
    }

    // Map viewport coordinates to image coordinates
    const scaleX = img.naturalWidth / vw;
    const scaleY = img.naturalHeight / vh;
    const cropX = Math.round(x * scaleX);
    const cropY = Math.round(y * scaleY);
    const cropW = Math.round(w * scaleX);
    const cropH = Math.round(h * scaleY);

    // Crop from the original image
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const ctx = cropCanvas.getContext("2d")!;
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    cropCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        onComplete(url);
      } else {
        onCancel();
      }
    }, "image/png");
  }, [selection, onComplete, onCancel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const crosshairEnabled = useAppStore((s) => s.crosshairEnabled);

  return (
    <>
      {crosshairEnabled && !isDragging && <CrosshairOverlay />}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-50 cursor-crosshair"
        style={{ width: "100vw", height: "100vh" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </>
  );
}
