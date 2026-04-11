import { useCanvasStore } from "../../stores/canvas.store";
import { useToolStore, COLOR_PRESETS } from "../../stores/tool.store";
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

  const annotations = useCanvasStore((s) => s.annotations);
  const updateAnnotation = useCanvasStore((s) => s.updateAnnotation);
  const setStrokeWidth = useToolStore((s) => s.setStrokeWidth);
  const setStrokeColor = useToolStore((s) => s.setStrokeColor);

  const selected = images.find((img) => img.id === selectedId);
  const selectedPrivacy = privacyRegions.find((r) => r.id === selectedId);
  const selectedAnnotation = annotations.find((a) => a.id === selectedId);

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
        <label className="text-[11px] text-zinc-500 w-12">Padding</label>
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
          className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
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
            <label className="text-[11px] text-zinc-500 w-12">Corners</label>
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
                className="rounded accent-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-500"
              />
              <span className="text-[13px] text-zinc-300">Drop Shadow</span>
            </label>

            {selected.shadow.enabled && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-zinc-500 w-12">Blur</label>
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
                  <label className="text-[11px] text-zinc-500 w-12">Offset Y</label>
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
                className="rounded accent-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-500"
              />
              <span className="text-[13px] text-zinc-300">Inset Border</span>
            </label>

            {selected.insetBorder.enabled && (
              <button
                onClick={handleAutoInsetBorder}
                className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
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
              className="flex-1 px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
            >
              Flip H
            </button>
            <button
              onClick={() =>
                updateImage(selected.id, { flipY: !selected.flipY })
              }
              className="flex-1 px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
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
            <label className="text-[11px] text-zinc-500 w-12">Intensity</label>
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
            <label className="text-[11px] text-zinc-500 w-12">Opacity</label>
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
            <label className="text-[11px] text-zinc-500 w-12">Color</label>
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

      {/* Annotation property controls */}
      {selectedAnnotation && (
        <>
          <div className="border-t border-zinc-800/60 pt-3 mt-3">
            <p className="text-[11px] font-medium text-zinc-500 tracking-wide mb-2">Annotation</p>
          </div>

          {/* Color row */}
          <div className="space-y-2">
            <label className="text-[11px] text-zinc-500">Color</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {COLOR_PRESETS.map((color) => {
                const currentColor = selectedAnnotation.type === "text" || selectedAnnotation.type === "callout"
                  ? (selectedAnnotation as { fill: string }).fill
                  : (selectedAnnotation as { stroke: string }).stroke;
                return (
                  <button
                    key={color}
                    onClick={() => {
                      setStrokeColor(color);
                      switch (selectedAnnotation.type) {
                        case "arrow":
                          updateAnnotation(selectedAnnotation.id, { stroke: color });
                          break;
                        case "rectangle":
                          updateAnnotation(selectedAnnotation.id, { stroke: color, fill: `${color}14` });
                          break;
                        case "ellipse":
                          updateAnnotation(selectedAnnotation.id, { stroke: color, fill: `${color}14` });
                          break;
                        case "text":
                          updateAnnotation(selectedAnnotation.id, { fill: color });
                          break;
                        case "callout":
                          updateAnnotation(selectedAnnotation.id, { fill: color });
                          break;
                      }
                    }}
                    className={`w-6 h-6 rounded-md border transition-[transform,border-color] duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none ${
                      currentColor === color ? "border-white scale-110" : "border-zinc-700 hover:border-zinc-500"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                );
              })}
            </div>
          </div>

          {/* Stroke Width presets */}
          {(selectedAnnotation.type === "arrow" || selectedAnnotation.type === "rectangle" || selectedAnnotation.type === "ellipse") && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-zinc-500 w-12">Stroke</label>
              <div className="flex gap-1">
                {[1, 2, 4, 8].map((w) => (
                  <button
                    key={w}
                    onClick={() => {
                      updateAnnotation(selectedAnnotation.id, { strokeWidth: w });
                      setStrokeWidth(w);
                    }}
                    className={`px-3 py-1 text-[12px] rounded-md transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none ${
                      (selectedAnnotation as { strokeWidth: number }).strokeWidth === w
                        ? "bg-zinc-100 text-zinc-900"
                        : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dash Pattern presets */}
          {(selectedAnnotation.type === "arrow" || selectedAnnotation.type === "rectangle" || selectedAnnotation.type === "ellipse") && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-zinc-500 w-12">Dash</label>
              <div className="flex gap-1">
                {([
                  { label: "Solid", value: undefined },
                  { label: "Dashed", value: [10, 5] },
                  { label: "Dotted", value: [2, 6] },
                ] as const).map((preset) => {
                  const currentDash = (selectedAnnotation as { dash?: number[] }).dash;
                  const isActive = preset.value === undefined
                    ? !currentDash || currentDash.length === 0
                    : JSON.stringify(currentDash) === JSON.stringify(preset.value);
                  return (
                    <button
                      key={preset.label}
                      onClick={() => updateAnnotation(selectedAnnotation.id, { dash: preset.value as number[] | undefined })}
                      className={`px-2 py-1 text-[12px] rounded-md transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none ${
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
            </div>
          )}

          {/* Font Size -- text annotations only */}
          {selectedAnnotation.type === "text" && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-zinc-500 w-12">Size</label>
              <input
                type="range"
                min={10}
                max={120}
                step={2}
                value={(selectedAnnotation as { fontSize: number }).fontSize}
                onChange={(e) => updateAnnotation(selectedAnnotation.id, { fontSize: Number(e.target.value) })}
                className="flex-1 accent-zinc-400"
              />
              <span className="text-[11px] text-zinc-500 w-7 text-right">
                {(selectedAnnotation as { fontSize: number }).fontSize}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
