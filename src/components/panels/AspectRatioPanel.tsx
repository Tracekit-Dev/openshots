import { useCanvasStore } from "../../stores/canvas.store";
import { ASPECT_RATIOS, canvasSize } from "../../lib/aspectRatios";

export default function AspectRatioPanel() {
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);
  const setCanvasSize = useCanvasStore((s) => s.setCanvasSize);

  const currentRatio = canvasWidth / canvasHeight;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
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
              className={`px-2 py-1.5 text-xs rounded-lg transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-neutral-600">
        {canvasWidth} x {canvasHeight}
      </p>
    </div>
  );
}
