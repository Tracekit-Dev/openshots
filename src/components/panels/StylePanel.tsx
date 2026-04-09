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
  const privacyRegions = useCanvasStore((s) => s.privacyRegions);
  const updatePrivacyRegion = useCanvasStore((s) => s.updatePrivacyRegion);

  const selected = images.find((img) => img.id === selectedId);
  const selectedPrivacy = privacyRegions.find((r) => r.id === selectedId);

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
    <div className="space-y-3">
      <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
        Style
      </h3>

      {/* Padding */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-zinc-500 w-14">Padding</label>
        <input
          type="range"
          min={0}
          max={200}
          value={padding}
          onChange={(e) => setPadding(Number(e.target.value))}
          className="flex-1 accent-zinc-400"
        />
        <span className="text-[11px] text-zinc-500 w-7 text-right">
          {padding}
        </span>
      </div>

      {/* Fan layout */}
      {images.length > 1 && (
        <button
          onClick={handleFanLayout}
          className="w-full px-3 py-1.5 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors"
        >
          Auto Fan Layout
        </button>
      )}

      {/* Selected image controls */}
      {selected && (
        <>
          <div className="border-t border-zinc-800/60 pt-3 mt-3">
            <p className="text-[11px] text-zinc-500 mb-2">Selected Image</p>
          </div>

          {/* Corner radius */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-zinc-500 w-14">Corners</label>
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
              className="flex-1 accent-zinc-400"
            />
            <span className="text-[11px] text-zinc-500 w-7 text-right">
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
                className="rounded accent-zinc-400"
              />
              <span className="text-[13px] text-zinc-300">Drop Shadow</span>
            </label>

            {selected.shadow.enabled && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-zinc-500 w-14">Blur</label>
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
                    className="flex-1 accent-zinc-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-zinc-500 w-14">Offset Y</label>
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
                    className="flex-1 accent-zinc-400"
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
                className="rounded accent-zinc-400"
              />
              <span className="text-[13px] text-zinc-300">Inset Border</span>
            </label>

            {selected.insetBorder.enabled && (
              <button
                onClick={handleAutoInsetBorder}
                className="w-full px-3 py-1.5 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors"
              >
                Auto-match color
              </button>
            )}
          </div>

          {/* Flip */}
          <div className="flex gap-1.5">
            <button
              onClick={() =>
                updateImage(selected.id, { flipX: !selected.flipX })
              }
              className="flex-1 px-3 py-1.5 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors"
            >
              Flip H
            </button>
            <button
              onClick={() =>
                updateImage(selected.id, { flipY: !selected.flipY })
              }
              className="flex-1 px-3 py-1.5 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors"
            >
              Flip V
            </button>
          </div>
        </>
      )}

      {/* Privacy region controls */}
      {selectedPrivacy && (
        <>
          <div className="border-t border-zinc-800/60 pt-3 mt-3">
            <p className="text-[11px] text-zinc-500 mb-2">
              {selectedPrivacy.type === "blur" ? "Blur" : "Pixelate"} Region
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-zinc-500 w-14">Intensity</label>
            <input
              type="range"
              min={1}
              max={selectedPrivacy.type === "blur" ? 40 : 32}
              value={selectedPrivacy.intensity}
              onChange={(e) =>
                updatePrivacyRegion(selectedPrivacy.id, {
                  intensity: Number(e.target.value),
                })
              }
              className="flex-1 accent-zinc-400"
            />
            <span className="text-[11px] text-zinc-500 w-7 text-right">
              {selectedPrivacy.intensity}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-zinc-500 w-14">Opacity</label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((selectedPrivacy.opacity ?? 1) * 100)}
              onChange={(e) =>
                updatePrivacyRegion(selectedPrivacy.id, {
                  opacity: Number(e.target.value) / 100,
                })
              }
              className="flex-1 accent-zinc-400"
            />
            <span className="text-[11px] text-zinc-500 w-7 text-right">
              {Math.round((selectedPrivacy.opacity ?? 1) * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-zinc-500 w-14">Color</label>
            <input
              type="color"
              value={selectedPrivacy.fill || (selectedPrivacy.type === "blur" ? "#d4d4d4" : "#a3a3a3")}
              onChange={(e) =>
                updatePrivacyRegion(selectedPrivacy.id, {
                  fill: e.target.value,
                })
              }
              className="w-8 h-8 rounded-md border border-zinc-700 bg-transparent cursor-pointer"
            />
            <span className="text-[11px] text-zinc-500">
              {selectedPrivacy.fill || "default"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
