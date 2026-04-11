import { useState } from "react";
import { useCanvasStore } from "../../stores/canvas.store";
import { exportCanvas, type ExportFormat } from "../../ipc/export";
import { saveProject } from "../../lib/project-file";
import { shareFile } from "../../ipc/share";
import Konva from "konva";

interface ExportPanelProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export default function ExportPanel({ stageRef }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(90);
  const [scale, setScale] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);

  const handleExport = async () => {
    const stage = stageRef.current;
    if (!stage) return;

    setExporting(true);
    try {
      // Compensate for the zoom scale so export is always at logical canvas dimensions
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

      // Draw at the correct logical output dimensions
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
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setLastExport("Copied to clipboard!");
      setTimeout(() => setLastExport(null), 2000);
    } catch (err) {
      console.error("Copy to clipboard failed:", err);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
        Export
      </h3>

      {/* Format */}
      <div className="flex gap-1">
        {(["png", "jpeg", "webp"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`px-2 py-1 text-[12px] rounded-md uppercase transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none ${
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
          <span className="text-[11px] text-zinc-500 w-7 text-right">
            {quality}%
          </span>
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
              className={`px-2 py-1 text-[12px] rounded-md transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none ${
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
        Output: {canvasWidth * scale} × {canvasHeight * scale}
      </p>

      {/* Export buttons */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full px-3 py-2 text-[13px] font-medium rounded-md bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-40 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
      >
        {exporting ? "Exporting..." : "Save to File"}
      </button>

      <button
        onClick={handleCopyToClipboard}
        className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
      >
        Copy to Clipboard
      </button>

      {/* Divider */}
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
        className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
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
        className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Share Last Export
      </button>

      {lastExport && (
        <p className="text-[11px] text-green-400/80 truncate">{lastExport}</p>
      )}
    </div>
  );
}
