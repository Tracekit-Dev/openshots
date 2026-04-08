import { useCanvasStore } from "../../stores/canvas.store";
import { extractDominantColor } from "../../lib/colorAnalysis";
import { computeFanLayout } from "../../lib/fanLayout";

export default function StylePanel() {
  const images = useCanvasStore((s) => s.images);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const updateImage = useCanvasStore((s) => s.updateImage);
  const padding = useCanvasStore((s) => s.padding);
  const setPadding = useCanvasStore((s) => s.setPadding);
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);

  const selected = images.find((img) => img.id === selectedId);

  const handleFanLayout = () => {
    const positions = computeFanLayout(images.length, canvasWidth, canvasHeight);
    const store = useCanvasStore.getState();
    images.forEach((img, i) => {
      if (positions[i]) {
        store.updateImage(img.id, {
          x: positions[i].x,
          y: positions[i].y,
          rotation: positions[i].rotation,
        });
      }
    });
  };

  const handleAutoInsetBorder = () => {
    if (!selected) return;
    const imgEl = new window.Image();
    imgEl.crossOrigin = "anonymous";
    imgEl.src = selected.src;
    imgEl.onload = () => {
      const color = extractDominantColor(imgEl);
      updateImage(selected.id, {
        insetBorder: { enabled: true, color, width: 8 },
      });
    };
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
        Style
      </h3>

      {/* Padding */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-neutral-500 w-16">Padding</label>
        <input
          type="range"
          min={0}
          max={200}
          value={padding}
          onChange={(e) => setPadding(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-xs text-neutral-500 w-8 text-right">
          {padding}
        </span>
      </div>

      {/* Fan layout */}
      {images.length > 1 && (
        <button
          onClick={handleFanLayout}
          className="w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
        >
          Auto Fan Layout
        </button>
      )}

      {/* Selected image controls */}
      {selected && (
        <>
          <div className="border-t border-neutral-800 pt-3 mt-3">
            <p className="text-xs text-neutral-400 mb-2">Selected Image</p>
          </div>

          {/* Corner radius */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-500 w-16">Corners</label>
            <input
              type="range"
              min={0}
              max={48}
              value={selected.cornerRadius}
              onChange={(e) =>
                updateImage(selected.id, {
                  cornerRadius: Number(e.target.value),
                })
              }
              className="flex-1"
            />
            <span className="text-xs text-neutral-500 w-8 text-right">
              {selected.cornerRadius}
            </span>
          </div>

          {/* Shadow toggle & controls */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.shadow.enabled}
                onChange={(e) =>
                  updateImage(selected.id, {
                    shadow: { ...selected.shadow, enabled: e.target.checked },
                  })
                }
                className="rounded"
              />
              <span className="text-xs text-neutral-300">Drop Shadow</span>
            </label>

            {selected.shadow.enabled && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-neutral-500 w-16">Blur</label>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={selected.shadow.blur}
                    onChange={(e) =>
                      updateImage(selected.id, {
                        shadow: { ...selected.shadow, blur: Number(e.target.value) },
                      })
                    }
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-neutral-500 w-16">Offset Y</label>
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={selected.shadow.offsetY}
                    onChange={(e) =>
                      updateImage(selected.id, {
                        shadow: { ...selected.shadow, offsetY: Number(e.target.value) },
                      })
                    }
                    className="flex-1"
                  />
                </div>
              </>
            )}
          </div>

          {/* Inset border */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.insetBorder.enabled}
                onChange={(e) =>
                  updateImage(selected.id, {
                    insetBorder: {
                      ...selected.insetBorder,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="rounded"
              />
              <span className="text-xs text-neutral-300">Inset Border</span>
            </label>

            {selected.insetBorder.enabled && (
              <button
                onClick={handleAutoInsetBorder}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                Auto-match color
              </button>
            )}
          </div>

          {/* Flip */}
          <div className="flex gap-2">
            <button
              onClick={() =>
                updateImage(selected.id, { flipX: !selected.flipX })
              }
              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
            >
              Flip H
            </button>
            <button
              onClick={() =>
                updateImage(selected.id, { flipY: !selected.flipY })
              }
              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
            >
              Flip V
            </button>
          </div>
        </>
      )}
    </div>
  );
}
