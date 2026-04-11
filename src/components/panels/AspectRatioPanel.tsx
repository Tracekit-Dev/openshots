import { useCanvasStore } from "../../stores/canvas.store";
import { ASPECT_RATIOS, canvasSize } from "../../lib/aspectRatios";

export default function AspectRatioPanel() {
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);
  const setCanvasSize = useCanvasStore((s) => s.setCanvasSize);

  const currentRatio = canvasWidth / canvasHeight;

  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
        Canvas Size
      </h3>
      <div className="grid grid-cols-3 gap-1">
        {ASPECT_RATIOS.map((preset) => {
          const size = canvasSize(preset);
          const isActive = Math.abs(currentRatio - preset.ratio) < 0.01;
          return (
            <button
              key={preset.label}
              onClick={() => setCanvasSize(size.width, size.height)}
              className={`px-2 py-2 text-[13px] rounded-md transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none ${
                isActive
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-zinc-500">
        {canvasWidth} × {canvasHeight}
      </p>
    </div>
  );
}
