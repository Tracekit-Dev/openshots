import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";
import { Image } from "@tauri-apps/api/image";
import Konva from "konva";

interface DragBarProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export default function DragBar({ stageRef }: DragBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;

    try {
      const currentScale = stage.scaleX();
      const pixelRatio = 2 / currentScale;
      const dataUrl = stage.toDataURL({ pixelRatio, mimeType: "image/png" });
      const resp = await fetch(dataUrl);
      const buffer = await resp.arrayBuffer();
      const tauriImage = await Image.fromBytes(new Uint8Array(buffer));
      await writeImage(tauriImage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[QuickCopy] Failed:", err);
    }
  }, [stageRef]);

  return (
    <button
      onClick={() => void handleCopy()}
      className="fixed bottom-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-zinc-800/90 border border-zinc-700/60 rounded-lg backdrop-blur-sm px-4 py-2 select-none hover:bg-zinc-700/90 transition-colors cursor-pointer"
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-400" />
      ) : (
        <Copy className="w-4 h-4 text-zinc-500" />
      )}
      <span className="text-[13px] text-zinc-400">
        {copied ? "Copied!" : "Quick Copy"}
      </span>
    </button>
  );
}
