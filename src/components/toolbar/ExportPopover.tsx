import { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "../../stores/canvas.store";
import { exportCanvas, type ExportFormat } from "../../ipc/export";
import { saveProject } from "../../lib/project-file";
import { shareFile } from "../../ipc/share";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";
import { Image } from "@tauri-apps/api/image";
import Konva from "konva";

interface ExportPopoverProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export default function ExportPopover({ stageRef, anchorEl, onClose }: ExportPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(90);
  const [scale, setScale] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, anchorEl]);

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleExport = async () => {
    const stage = stageRef.current;
    if (!stage) return;

    setExporting(true);
    try {
      const currentZoomScale = stage.scaleX();
      const exportPixelRatio = scale / currentZoomScale;

      const dataUrl = stage.toDataURL({
        pixelRatio: exportPixelRatio,
        mimeType: format === "png" ? "image/png" : "image/jpeg",
        quality: quality / 100,
      });

      const img = new window.Image();
      img.src = dataUrl;
      await new Promise<void>((resolve) => { img.onload = () => resolve(); });

      const outW = canvasWidth * scale;
      const outH = canvasHeight * scale;
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, outW, outH);
      const imageData = ctx.getImageData(0, 0, outW, outH);

      const result = await exportCanvas(
        new Uint8Array(imageData.data.buffer),
        outW,
        outH,
        { format, quality, scale: 1 },
      );

      if (result) setLastExport(result);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    const stage = stageRef.current;
    if (!stage) return;

    try {
      const currentScale = stage.scaleX();
      const pixelRatio = scale / currentScale;
      const dataUrl = stage.toDataURL({ pixelRatio, mimeType: "image/png" });
      const resp = await fetch(dataUrl);
      const buffer = await resp.arrayBuffer();
      const tauriImage = await Image.fromBytes(new Uint8Array(buffer));
      await writeImage(tauriImage);
      setLastExport("Copied to clipboard!");
      setTimeout(() => setLastExport(null), 2000);
    } catch (err) {
      console.error("Copy to clipboard failed:", err);
    }
  };

  return (
    <div
      ref={popoverRef}
      className={`absolute top-full right-0 mt-2 z-50 w-64 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl p-4 space-y-3 transition-all duration-150 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
      }`}
    >
      {/* Format */}
      <div className="flex gap-1">
        {(["png", "jpeg", "webp"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`px-2 py-1 text-[12px] rounded-md uppercase transition-colors duration-150 ${
              format === f
                ? "bg-zinc-100 text-zinc-900"
                : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Quality */}
      {format !== "png" && (
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-zinc-500 w-12">Quality</label>
          <input
            type="range"
            min={10}
            max={100}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="flex-1 accent-zinc-400"
          />
          <span className="text-[11px] text-zinc-500 w-7 text-right">{quality}%</span>
        </div>
      )}

      {/* Scale */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-zinc-500 w-12">Scale</label>
        <div className="flex gap-1">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className={`px-2 py-1 text-[12px] rounded-md transition-colors duration-150 ${
                scale === s
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-zinc-500">
        Output: {canvasWidth * scale} x {canvasHeight * scale}
      </p>

      {/* Export button */}
      <button
        onClick={() => void handleExport()}
        disabled={exporting}
        className="w-full px-3 py-2 text-[13px] font-medium rounded-md bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-40 transition-colors duration-150"
      >
        {exporting ? "Exporting..." : "Export"}
      </button>

      <button
        onClick={() => void handleCopyToClipboard()}
        className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150"
      >
        Copy to Clipboard
      </button>

      <div className="border-t border-zinc-800/60" />

      <button
        onClick={async () => {
          try {
            const path = await saveProject();
            if (path) {
              setLastExport(`Saved: ${path}`);
              setTimeout(() => setLastExport(null), 3000);
            }
          } catch (err) {
            console.error("Save project failed:", err);
          }
        }}
        className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150"
      >
        Save as Project
      </button>

      <button
        onClick={async () => {
          if (!lastExport || lastExport.startsWith("Copied") || lastExport.startsWith("Saved")) return;
          try {
            await shareFile(lastExport);
          } catch (err) {
            console.error("Share failed:", err);
          }
        }}
        disabled={!lastExport || lastExport.startsWith("Copied") || lastExport.startsWith("Saved")}
        className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Share Last Export
      </button>

      {lastExport && (
        <p className="text-[11px] text-green-400/80 truncate">{lastExport}</p>
      )}
    </div>
  );
}
