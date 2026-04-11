import { useRef, useCallback, useEffect } from "react";
import { GripHorizontal } from "lucide-react";
import Konva from "konva";
import { saveTempExport } from "../../ipc/export";

interface DragBarProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export default function DragBar({ stageRef }: DragBarProps) {
  const tempFilePathRef = useRef<string | null>(null);
  const prepareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-render on mount and when canvas changes — debounced
  const prepare = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;

    try {
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
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

      tempFilePathRef.current = filePath;
      // ready
    } catch (err) {
      console.error("[DragBar] Prepare failed:", err);
      tempFilePathRef.current = null;
    }
  }, [stageRef]);

  // Prepare on hover so file is ready before drag starts
  const handleMouseEnter = useCallback(() => {
    if (prepareTimeoutRef.current) clearTimeout(prepareTimeoutRef.current);
    prepareTimeoutRef.current = setTimeout(() => void prepare(), 100);
  }, [prepare]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (prepareTimeoutRef.current) clearTimeout(prepareTimeoutRef.current);
    };
  }, []);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const filePath = tempFilePathRef.current;
      if (!filePath) {
        e.preventDefault();
        return;
      }

      e.dataTransfer.setData("text/uri-list", `file://${filePath}`);
      e.dataTransfer.setData("text/plain", `file://${filePath}`);
      e.dataTransfer.effectAllowed = "copy";
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    tempFilePathRef.current = null;
  }, []);

  return (
    <div
      draggable
      onMouseEnter={handleMouseEnter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-zinc-800/90 border border-zinc-700/60 rounded-lg backdrop-blur-sm px-4 py-2 select-none cursor-grab active:cursor-grabbing hover:bg-zinc-700/90 transition-colors"
    >
      <GripHorizontal className="w-4 h-4 text-zinc-500" />
      <span className="text-[13px] text-zinc-400">Drag me</span>
    </div>
  );
}
