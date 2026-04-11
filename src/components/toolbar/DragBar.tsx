import { useRef, useState, useCallback } from "react";
import { GripHorizontal, Loader2 } from "lucide-react";
import Konva from "konva";
import { saveTempExport } from "../../ipc/export";

interface DragBarProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

type DragState = "idle" | "preparing" | "ready";

export default function DragBar({ stageRef }: DragBarProps) {
  const [dragState, setDragState] = useState<DragState>("idle");
  const tempFilePathRef = useRef<string | null>(null);

  const isDisabled = !stageRef.current || stageRef.current.children.length === 0;

  const renderCanvasToTempFile = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return null;

    const dataUrl = stage.toDataURL({ pixelRatio: 2 });

    // Strip data URL prefix and decode base64 to raw PNG bytes
    const base64 = dataUrl.split(",")[1] ?? "";
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // toDataURL returns encoded PNG — we need raw RGBA pixels for the Rust command
    // Decode the PNG via an offscreen canvas to get raw pixel data
    const img = new window.Image();
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
    img.src = dataUrl;
    await loaded;

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const filePath = await saveTempExport(
      new Uint8Array(imageData.data.buffer),
      canvas.width,
      canvas.height,
    );

    return filePath;
  }, [stageRef]);

  const handleMouseDown = useCallback(async () => {
    if (isDisabled) return;
    setDragState("preparing");
    try {
      const filePath = await renderCanvasToTempFile();
      tempFilePathRef.current = filePath;
      setDragState("ready");
    } catch (err) {
      console.error("[DragBar] Failed to prepare drag export:", err);
      setDragState("idle");
    }
  }, [isDisabled, renderCanvasToTempFile]);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const filePath = tempFilePathRef.current;
      if (!filePath) {
        e.preventDefault();
        return;
      }

      // Set file URI for OS-native file drag
      const fileUri = `file://${filePath}`;
      e.dataTransfer.setData("text/uri-list", fileUri);
      e.dataTransfer.setData("text/plain", fileUri);
      e.dataTransfer.effectAllowed = "copy";

      // Create a thumbnail drag image
      const stage = stageRef.current;
      if (stage) {
        try {
          const thumbWidth = 128;
          const stageW = stage.width();
          const stageH = stage.height();
          const thumbHeight = Math.round((stageH / stageW) * thumbWidth);

          const thumbCanvas = document.createElement("canvas");
          thumbCanvas.width = thumbWidth;
          thumbCanvas.height = thumbHeight;
          const thumbCtx = thumbCanvas.getContext("2d");
          if (thumbCtx) {
            const stageCanvas = stage.toCanvas({ pixelRatio: 1 });
            thumbCtx.drawImage(stageCanvas, 0, 0, thumbWidth, thumbHeight);
            e.dataTransfer.setDragImage(
              thumbCanvas,
              thumbWidth / 2,
              thumbHeight / 2,
            );
          }
        } catch {
          // Fallback: use default drag image
        }
      }
    },
    [stageRef],
  );

  const handleDragEnd = useCallback(() => {
    setDragState("idle");
    tempFilePathRef.current = null;
  }, []);

  return (
    <div
      draggable={dragState === "ready"}
      onMouseDown={() => void handleMouseDown()}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`fixed bottom-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-zinc-800/90 border border-zinc-700/60 rounded-lg backdrop-blur-sm px-4 py-2 select-none transition-all ${
        isDisabled
          ? "opacity-50 pointer-events-none"
          : dragState === "ready"
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-default"
      }`}
    >
      {dragState === "preparing" ? (
        <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
      ) : (
        <GripHorizontal className="w-4 h-4 text-zinc-500" />
      )}
      <span className="text-[13px] text-zinc-400">
        {dragState === "preparing" ? "Preparing..." : "Drag me"}
      </span>
    </div>
  );
}
