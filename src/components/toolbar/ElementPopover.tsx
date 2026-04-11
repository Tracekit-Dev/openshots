import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Konva from "konva";
import { useCanvasStore } from "../../stores/canvas.store";
import { useToolStore, COLOR_PRESETS } from "../../stores/tool.store";
import { useSelectionBounds } from "../../hooks/useSelectionBounds";
import { extractDominantColor } from "../../lib/colorAnalysis";
import { computeFanLayout } from "../../lib/fanLayout";

interface ElementPopoverProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export default function ElementPopover({ stageRef }: ElementPopoverProps) {
  const selectedId = useCanvasStore((s) => s.selectedId);
  const images = useCanvasStore((s) => s.images);
  const annotations = useCanvasStore((s) => s.annotations);
  const privacyRegions = useCanvasStore((s) => s.privacyRegions);
  const updateImage = useCanvasStore((s) => s.updateImage);
  const updateAnnotation = useCanvasStore((s) => s.updateAnnotation);
  const updatePrivacyRegion = useCanvasStore((s) => s.updatePrivacyRegion);
  const padding = useCanvasStore((s) => s.padding);
  const setPadding = useCanvasStore((s) => s.setPadding);
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);
  const setStrokeWidth = useToolStore((s) => s.setStrokeWidth);
  const setStrokeColor = useToolStore((s) => s.setStrokeColor);

  const bounds = useSelectionBounds(stageRef, selectedId);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [popoverSize, setPopoverSize] = useState({ width: 0, height: 0 });
  // flipped state removed — use isBelow directly

  const selected = images.find((img) => img.id === selectedId);
  const selectedAnnotation = annotations.find((a) => a.id === selectedId);
  const selectedPrivacy = privacyRegions.find((r) => r.id === selectedId);

  // Animate in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Measure popover dimensions after render
  useLayoutEffect(() => {
    const el = popoverRef.current;
    if (el) {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setPopoverSize((prev) =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h }
      );
    }
  }, [bounds, selected, selectedAnnotation, selectedPrivacy]);

  // Dismiss on outside click
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Don't interfere -- CanvasStage handles deselection
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // Dismiss on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        useCanvasStore.getState().setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (!bounds || (!selected && !selectedAnnotation && !selectedPrivacy)) {
    return null;
  }

  // Position: centered above selection, 12px gap
  const GAP = 12;
  const EDGE_PAD = 8;
  const pw = popoverSize.width || 288;
  const ph = popoverSize.height || 200;

  let top = bounds.y - ph - GAP;
  let isBelow = false;
  if (top < EDGE_PAD) {
    top = bounds.y + bounds.height + GAP;
    isBelow = true;
  }
  // Clamp to viewport bottom
  if (top + ph > window.innerHeight - EDGE_PAD) {
    top = window.innerHeight - EDGE_PAD - ph;
  }

  let left = bounds.x + bounds.width / 2 - pw / 2;
  left = Math.max(EDGE_PAD, Math.min(left, window.innerWidth - pw - EDGE_PAD));

  // Use isBelow directly instead of tracking in state

  // Caret horizontal position relative to popover
  const caretLeft = Math.max(
    12,
    Math.min(bounds.x + bounds.width / 2 - left, pw - 12),
  );

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
    <div
      ref={popoverRef}
      className={`fixed z-50 w-72 max-h-[70vh] overflow-y-auto bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl p-3 space-y-3 transition-[opacity,transform] duration-150 ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      style={{
        top,
        left,
        transformOrigin: isBelow ? "top center" : "bottom center",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Caret arrow */}
      <div
        className="absolute w-0 h-0"
        style={{
          left: caretLeft - 6,
          ...(isBelow
            ? {
                top: -6,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderBottom: "6px solid rgb(63 63 70 / 0.6)",
              }
            : {
                bottom: -6,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "6px solid rgb(63 63 70 / 0.6)",
              }),
        }}
      />

      {/* Image controls */}
      {selected && <ImageControls
        selected={selected}
        updateImage={updateImage}
        padding={padding}
        setPadding={setPadding}
        images={images}
        onFanLayout={handleFanLayout}
        onAutoInsetBorder={handleAutoInsetBorder}
      />}

      {/* Annotation controls */}
      {selectedAnnotation && <AnnotationControls
        annotation={selectedAnnotation}
        updateAnnotation={updateAnnotation}
        setStrokeColor={setStrokeColor}
        setStrokeWidth={setStrokeWidth}
      />}

      {/* Privacy region controls */}
      {selectedPrivacy && <PrivacyControls
        region={selectedPrivacy}
        updatePrivacyRegion={updatePrivacyRegion}
      />}
    </div>
  );
}

// --------------- Image Controls ---------------

function ImageControls({
  selected,
  updateImage,
  padding,
  setPadding,
  images,
  onFanLayout,
  onAutoInsetBorder,
}: {
  selected: ReturnType<typeof useCanvasStore.getState>["images"][0];
  updateImage: ReturnType<typeof useCanvasStore.getState>["updateImage"];
  padding: number;
  setPadding: (v: number) => void;
  images: ReturnType<typeof useCanvasStore.getState>["images"];
  onFanLayout: () => void;
  onAutoInsetBorder: () => void;
}) {
  return (
    <>
      <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
        Image Properties
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
            onClick={onAutoInsetBorder}
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

      {/* Fan layout */}
      {images.length > 1 && (
        <button
          onClick={onFanLayout}
          className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
        >
          Auto Fan Layout
        </button>
      )}
    </>
  );
}

// --------------- Annotation Controls ---------------

function AnnotationControls({
  annotation,
  updateAnnotation,
  setStrokeColor,
  setStrokeWidth,
}: {
  annotation: ReturnType<typeof useCanvasStore.getState>["annotations"][0];
  updateAnnotation: ReturnType<typeof useCanvasStore.getState>["updateAnnotation"];
  setStrokeColor: (c: string) => void;
  setStrokeWidth: (w: number) => void;
}) {
  return (
    <>
      <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
        Annotation
      </h3>

      {/* Color row */}
      <div className="space-y-2">
        <label className="text-[11px] text-zinc-500">Color</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {COLOR_PRESETS.map((color) => {
            const currentColor =
              annotation.type === "text" || annotation.type === "callout"
                ? (annotation as { fill: string }).fill
                : (annotation as { stroke: string }).stroke;
            return (
              <button
                key={color}
                onClick={() => {
                  setStrokeColor(color);
                  switch (annotation.type) {
                    case "arrow":
                      updateAnnotation(annotation.id, { stroke: color, fill: color });
                      break;
                    case "rectangle":
                      updateAnnotation(annotation.id, {
                        stroke: color,
                        fill: `${color}14`,
                      });
                      break;
                    case "ellipse":
                      updateAnnotation(annotation.id, {
                        stroke: color,
                        fill: `${color}14`,
                      });
                      break;
                    case "text":
                      updateAnnotation(annotation.id, { fill: color });
                      break;
                    case "callout":
                      updateAnnotation(annotation.id, { fill: color });
                      break;
                  }
                }}
                className={`w-6 h-6 rounded-md border transition-[transform,border-color] duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none ${
                  currentColor === color
                    ? "border-white scale-110"
                    : "border-zinc-700 hover:border-zinc-500"
                }`}
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
      </div>

      {/* Fill Color -- shapes and arrows */}
      {(annotation.type === "rectangle" || annotation.type === "ellipse" || annotation.type === "arrow") && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-zinc-500">Fill</label>
            <button
              onClick={() => {
                const current = (annotation as { fill?: string }).fill ?? (annotation as { stroke: string }).stroke;
                updateAnnotation(annotation.id, {
                  fill: current === "transparent" ? `${(annotation as { stroke: string }).stroke}40` : "transparent",
                });
              }}
              className={`px-2 py-0.5 text-[11px] rounded-md transition-colors duration-150 ${
                (annotation as { fill?: string }).fill === "transparent"
                  ? "bg-zinc-800/60 text-zinc-500"
                  : "bg-zinc-700/60 text-zinc-300"
              }`}
            >
              {(annotation as { fill?: string }).fill === "transparent" ? "None" : "On"}
            </button>
          </div>
          {(annotation as { fill?: string }).fill !== "transparent" && (
            <div className="flex flex-wrap gap-1">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={`fill-${color}`}
                  onClick={() => updateAnnotation(annotation.id, { fill: color })}
                  className={`w-6 h-6 rounded-md border transition-[transform,border-color] duration-150 ${
                    (annotation as { fill?: string }).fill === color
                      ? "border-white scale-110"
                      : "border-zinc-700 hover:border-zinc-500"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              {/* Semi-transparent versions */}
              {["20", "40", "60", "80"].map((alpha) => {
                const baseColor = (annotation as { stroke: string }).stroke;
                const fillVal = `${baseColor}${alpha}`;
                return (
                  <button
                    key={`fill-alpha-${alpha}`}
                    onClick={() => updateAnnotation(annotation.id, { fill: fillVal })}
                    className={`w-6 h-6 rounded-md border transition-[transform,border-color] duration-150 text-[9px] text-zinc-400 ${
                      (annotation as { fill?: string }).fill === fillVal
                        ? "border-white scale-110"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                    style={{ backgroundColor: fillVal }}
                  >
                    {Number(alpha) / 100 * 100}%
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stroke Width presets */}
      {(annotation.type === "arrow" ||
        annotation.type === "rectangle" ||
        annotation.type === "ellipse") && (
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-zinc-500 w-12">Stroke</label>
          <div className="flex gap-1">
            {[1, 2, 4, 8].map((w) => (
              <button
                key={w}
                onClick={() => {
                  updateAnnotation(annotation.id, { strokeWidth: w });
                  setStrokeWidth(w);
                }}
                className={`px-3 py-1 text-[12px] rounded-md transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none ${
                  (annotation as { strokeWidth: number }).strokeWidth === w
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
      {(annotation.type === "arrow" ||
        annotation.type === "rectangle" ||
        annotation.type === "ellipse") && (
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-zinc-500 w-12">Dash</label>
          <div className="flex gap-1">
            {(
              [
                { label: "Solid", value: undefined },
                { label: "Dashed", value: [10, 5] },
                { label: "Dotted", value: [2, 6] },
              ] as const
            ).map((preset) => {
              const currentDash = (annotation as { dash?: number[] }).dash;
              const isActive =
                preset.value === undefined
                  ? !currentDash || currentDash.length === 0
                  : JSON.stringify(currentDash) ===
                    JSON.stringify(preset.value);
              return (
                <button
                  key={preset.label}
                  onClick={() =>
                    updateAnnotation(annotation.id, {
                      dash: preset.value as number[] | undefined,
                    })
                  }
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
      {annotation.type === "text" && (
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-zinc-500 w-12">Size</label>
          <input
            type="range"
            min={10}
            max={120}
            step={2}
            value={(annotation as { fontSize: number }).fontSize}
            onChange={(e) =>
              updateAnnotation(annotation.id, {
                fontSize: Number(e.target.value),
              })
            }
            className="flex-1 accent-zinc-400"
          />
          <span className="text-[11px] text-zinc-500 w-7 text-right">
            {(annotation as { fontSize: number }).fontSize}
          </span>
        </div>
      )}
    </>
  );
}

// --------------- Privacy Controls ---------------

function PrivacyControls({
  region,
  updatePrivacyRegion,
}: {
  region: ReturnType<typeof useCanvasStore.getState>["privacyRegions"][0];
  updatePrivacyRegion: ReturnType<typeof useCanvasStore.getState>["updatePrivacyRegion"];
}) {
  return (
    <>
      <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
        {region.type === "blur" ? "Blur" : "Pixelate"} Region
      </h3>

      <div className="flex items-center gap-2">
        <label className="text-[11px] text-zinc-500 w-12">Intensity</label>
        <input
          type="range"
          min={1}
          max={region.type === "blur" ? 40 : 32}
          value={region.intensity}
          onChange={(e) =>
            updatePrivacyRegion(region.id, {
              intensity: Number(e.target.value),
            })
          }
          className="flex-1 accent-zinc-400"
        />
        <span className="text-[11px] text-zinc-500 w-7 text-right">
          {region.intensity}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[11px] text-zinc-500 w-12">Opacity</label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round((region.opacity ?? 1) * 100)}
          onChange={(e) =>
            updatePrivacyRegion(region.id, {
              opacity: Number(e.target.value) / 100,
            })
          }
          className="flex-1 accent-zinc-400"
        />
        <span className="text-[11px] text-zinc-500 w-7 text-right">
          {Math.round((region.opacity ?? 1) * 100)}%
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[11px] text-zinc-500 w-12">Color</label>
        <input
          type="color"
          value={
            region.fill ||
            (region.type === "blur" ? "#d4d4d4" : "#a3a3a3")
          }
          onChange={(e) =>
            updatePrivacyRegion(region.id, {
              fill: e.target.value,
            })
          }
          className="w-8 h-8 rounded-md border border-zinc-700 bg-transparent cursor-pointer"
        />
        <span className="text-[11px] text-zinc-500">
          {region.fill || "default"}
        </span>
      </div>
    </>
  );
}
