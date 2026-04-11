import { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "../../stores/canvas.store";
import { usePresetStore, type CanvasPreset } from "../../stores/preset.store";
import { ASPECT_RATIOS, canvasSize } from "../../lib/aspectRatios";
import { open } from "@tauri-apps/plugin-dialog";
import { readImageFile, listSystemWallpapers, convertHeicThumbnail, convertHeicToDataUrl } from "../../ipc/capture";
import { ChevronDown, ChevronRight } from "lucide-react";

// macOS-style vibrant gradients
const GRADIENT_PRESETS: [string, string][] = [
  ["#c471ed", "#f7797d"],
  ["#667eea", "#f093fb"],
  ["#a855f7", "#ec4899"],
  ["#f472b6", "#fb923c"],
  ["#6366f1", "#06b6d4"],
  ["#3b82f6", "#8b5cf6"],
  ["#0ea5e9", "#a78bfa"],
  ["#14b8a6", "#3b82f6"],
  ["#f97316", "#ef4444"],
  ["#f59e0b", "#ec4899"],
  ["#fb923c", "#f472b6"],
  ["#e11d48", "#7c3aed"],
  ["#0f172a", "#1e293b"],
  ["#1a1a2e", "#16213e"],
  ["#18181b", "#3f3f46"],
  ["#1e1b4b", "#312e81"],
];

const SOLID_PRESETS = [
  "#0f172a", "#18181b", "#1c1917", "#27272a",
  "#3b82f6", "#8b5cf6", "#ec4899", "#10b981",
  "#f97316", "#ef4444", "#eab308", "#06b6d4",
  "#ffffff", "#f5f5f4", "#e7e5e4", "#a8a29e",
];

type BgType = "solid" | "linear-gradient" | "radial-gradient" | "image";

interface BackgroundPopoverProps {
  position: { x: number; y: number };
  onClose: () => void;
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 w-full text-left text-[11px] font-medium text-zinc-400 tracking-wide hover:text-zinc-200 transition-colors"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
      </button>
      {open && <div className="mt-2 space-y-3">{children}</div>}
    </div>
  );
}

export default function BackgroundPopover({ position, onClose }: BackgroundPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const background = useCanvasStore((s) => s.background);
  const setBackground = useCanvasStore((s) => s.setBackground);
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);
  const setCanvasSize = useCanvasStore((s) => s.setCanvasSize);
  const padding = useCanvasStore((s) => s.padding);
  const setPadding = useCanvasStore((s) => s.setPadding);

  const presets = usePresetStore((s) => s.presets);
  const addPreset = usePresetStore((s) => s.addPreset);
  const removePreset = usePresetStore((s) => s.removePreset);

  const [wallpapers, setWallpapers] = useState<{ name: string; path: string; thumb?: string }[]>([]);
  const [loadingWp, setLoadingWp] = useState<string | null>(null);
  const [widthInput, setWidthInput] = useState(String(canvasWidth));
  const [heightInput, setHeightInput] = useState(String(canvasHeight));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Sync dimension inputs with store
  useEffect(() => { setWidthInput(String(canvasWidth)); }, [canvasWidth]);
  useEffect(() => { setHeightInput(String(canvasHeight)); }, [canvasHeight]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Clamp position to viewport
  const popW = 288; // w-72
  const popH = 500; // approximate max height
  const x = Math.min(position.x, window.innerWidth - popW - 16);
  const y = Math.min(position.y, window.innerHeight - popH - 16);

  const handleDimensionChange = (newW: string, newH: string) => {
    setWidthInput(newW);
    setHeightInput(newH);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const w = Math.min(Math.max(Number(newW) || 100, 100), 4000);
      const h = Math.min(Math.max(Number(newH) || 100, 100), 4000);
      setCanvasSize(w, h);
    }, 300);
  };

  // Load wallpapers when image tab selected
  useEffect(() => {
    if (background.type === "image" && wallpapers.length === 0) {
      listSystemWallpapers()
        .then(async (wp) => {
          const items = wp.map(([name, path]: [string, string]) => ({ name, path }));
          setWallpapers(items);
          for (let i = 0; i < items.length; i += 4) {
            const batch = items.slice(i, i + 4);
            const results = await Promise.allSettled(
              batch.map(async (item) => {
                const thumb = await convertHeicThumbnail(item.path);
                return { path: item.path, thumb };
              }),
            );
            setWallpapers((prev) =>
              prev.map((wp) => {
                const match = results.find(
                  (r) => r.status === "fulfilled" && r.value.path === wp.path,
                );
                if (match && match.status === "fulfilled") {
                  return { ...wp, thumb: match.value.thumb };
                }
                return wp;
              }),
            );
          }
        })
        .catch(() => {});
    }
  }, [background.type, wallpapers.length]);

  const handleSelectWallpaper = async (path: string) => {
    setLoadingWp(path);
    try {
      const dataUrl = await convertHeicToDataUrl(path);
      setBackground({ type: "image", imageSrc: dataUrl });
    } catch (err) {
      console.error("Failed to load wallpaper:", err);
    } finally {
      setLoadingWp(null);
    }
  };

  const handleUploadBg = async () => {
    try {
      const filePath = await open({
        multiple: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
      });
      if (filePath) {
        const dataUrl = await readImageFile(filePath as string);
        setBackground({ type: "image", imageSrc: dataUrl });
      }
    } catch (err) {
      console.error("Background upload failed:", err);
    }
  };

  const types: { value: BgType; label: string }[] = [
    { value: "solid", label: "Solid" },
    { value: "linear-gradient", label: "Linear" },
    { value: "radial-gradient", label: "Radial" },
    { value: "image", label: "Custom" },
  ];

  const isGradient = background.type === "linear-gradient" || background.type === "radial-gradient";
  const currentRatio = canvasWidth / canvasHeight;

  // Preset save handler
  const handleSavePreset = () => {
    const state = useCanvasStore.getState();
    const name = `Preset ${presets.length + 1}`;
    const firstImage = state.images[0];
    const preset: CanvasPreset = {
      id: crypto.randomUUID(),
      name,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      padding: state.padding,
      background: { ...state.background },
      cornerRadius: firstImage?.cornerRadius ?? 12,
      shadowEnabled: firstImage?.shadow.enabled ?? true,
      shadowBlur: firstImage?.shadow.blur ?? 20,
      shadowOffsetY: firstImage?.shadow.offsetY ?? 10,
      insetBorderEnabled: firstImage?.insetBorder.enabled ?? false,
      insetBorderWidth: firstImage?.insetBorder.width ?? 8,
    };
    addPreset(preset);
  };

  const handleApplyPreset = (preset: CanvasPreset) => {
    const store = useCanvasStore.getState();
    store.setCanvasSize(preset.canvasWidth, preset.canvasHeight);
    store.setPadding(preset.padding);
    store.setBackground(preset.background);
    store.images.forEach((img) => {
      store.updateImage(img.id, {
        cornerRadius: preset.cornerRadius,
        shadow: {
          enabled: preset.shadowEnabled,
          color: "rgba(0,0,0,0.3)",
          blur: preset.shadowBlur,
          offsetX: 0,
          offsetY: preset.shadowOffsetY,
        },
        insetBorder: {
          enabled: preset.insetBorderEnabled,
          color: img.insetBorder.color,
          width: preset.insetBorderWidth,
        },
      });
    });
  };

  return (
    <div
      ref={popoverRef}
      className={`fixed z-50 w-72 max-h-[80vh] overflow-y-auto bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl p-4 space-y-4 transition-all duration-150 ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      style={{ left: Math.max(8, x), top: Math.max(8, y) }}
    >
      {/* Section 1: Background */}
      <Section title="Background" defaultOpen>
        {/* Type selector */}
        <div className="flex gap-1 flex-wrap">
          {types.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setBackground({ type: value })}
              className={`px-2 py-1 text-[12px] rounded-md transition-colors duration-150 ${
                background.type === value
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Image background */}
        {background.type === "image" && (
          <div className="space-y-3">
            <button
              onClick={() => void handleUploadBg()}
              className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150"
            >
              {background.imageSrc ? "Change image" : "Upload image"}
            </button>
            {background.imageSrc && (
              <div
                className="h-16 rounded-md border border-zinc-700/50 bg-cover bg-center"
                style={{ backgroundImage: `url(${background.imageSrc})` }}
              />
            )}
            {wallpapers.length > 0 && (
              <div>
                <p className="text-[11px] text-zinc-500 mb-2">System Wallpapers</p>
                <div className="grid grid-cols-3 gap-1 max-h-36 overflow-y-auto pr-0.5">
                  {wallpapers.map((wp) => (
                    <button
                      key={wp.path}
                      onClick={() => void handleSelectWallpaper(wp.path)}
                      disabled={loadingWp !== null}
                      className={`relative h-10 rounded-md border transition-colors duration-150 overflow-hidden ${
                        loadingWp === wp.path
                          ? "border-zinc-400 opacity-70"
                          : "border-zinc-700/40 hover:border-zinc-400"
                      }`}
                      title={wp.name}
                    >
                      {wp.thumb ? (
                        <img src={wp.thumb} alt={wp.name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-zinc-800/60 flex items-center justify-center">
                          <span className="text-[8px] text-zinc-500 px-0.5 text-center leading-tight">
                            {wp.name.replace(/ (Light|Dark)$/, "")}
                          </span>
                        </div>
                      )}
                      {loadingWp === wp.path && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-[10px] text-white animate-pulse">Loading</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gradient presets */}
        {isGradient && (
          <div className="grid grid-cols-4 gap-1">
            {GRADIENT_PRESETS.map(([c1, c2], i) => (
              <button
                key={i}
                onClick={() => setBackground({ gradientColors: [c1, c2] })}
                className="h-7 rounded-md border border-zinc-700/50 hover:border-zinc-500 transition-colors duration-150"
                style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
              />
            ))}
          </div>
        )}

        {/* Solid color presets */}
        {background.type === "solid" && (
          <div className="grid grid-cols-4 gap-1">
            {SOLID_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => setBackground({ color })}
                className="h-7 rounded-md border border-zinc-700/50 hover:border-zinc-500 transition-colors duration-150"
                style={{ background: color }}
              />
            ))}
          </div>
        )}

        {/* Custom color input */}
        {background.type !== "image" && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-zinc-500">Color</label>
            <input
              type="color"
              value={background.type === "solid" ? background.color : background.gradientColors[0]}
              onChange={(e) =>
                background.type === "solid"
                  ? setBackground({ color: e.target.value })
                  : setBackground({ gradientColors: [e.target.value, background.gradientColors[1]] })
              }
              className="w-7 h-5 rounded cursor-pointer bg-transparent border-0"
            />
            {isGradient && (
              <input
                type="color"
                value={background.gradientColors[1]}
                onChange={(e) =>
                  setBackground({ gradientColors: [background.gradientColors[0], e.target.value] })
                }
                className="w-7 h-5 rounded cursor-pointer bg-transparent border-0"
              />
            )}
          </div>
        )}

        {/* Gradient angle */}
        {isGradient && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-zinc-500 w-12">Angle</label>
            <input
              type="range"
              min={0}
              max={360}
              value={background.gradientAngle}
              onChange={(e) => setBackground({ gradientAngle: Number(e.target.value) })}
              className="flex-1 accent-zinc-400"
            />
            <span className="text-[11px] text-zinc-500 w-7 text-right">{background.gradientAngle}</span>
          </div>
        )}

        {/* Blur */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-zinc-500 w-12">Blur</label>
          <input
            type="range"
            min={0}
            max={40}
            value={background.blur}
            onChange={(e) => setBackground({ blur: Number(e.target.value) })}
            className="flex-1 accent-zinc-400"
          />
          <span className="text-[11px] text-zinc-500 w-7 text-right">{background.blur}</span>
        </div>

        {/* Grain */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-zinc-500 w-12">Grain</label>
          <input
            type="range"
            min={0}
            max={100}
            value={background.grain}
            onChange={(e) => setBackground({ grain: Number(e.target.value) })}
            className="flex-1 accent-zinc-400"
          />
          <span className="text-[11px] text-zinc-500 w-7 text-right">{background.grain}</span>
        </div>
      </Section>

      {/* Section 2: Canvas Size */}
      <Section title="Canvas Size" defaultOpen>
        {/* Aspect ratio buttons */}
        <div className="grid grid-cols-3 gap-1">
          {ASPECT_RATIOS.map((preset) => {
            const size = canvasSize(preset);
            const isActive = Math.abs(currentRatio - preset.ratio) < 0.01;
            return (
              <button
                key={preset.label}
                onClick={() => setCanvasSize(size.width, size.height)}
                className={`px-2 py-1.5 text-[12px] rounded-md transition-colors duration-150 ${
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

        {/* W/H inputs */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500 w-6 shrink-0">W</span>
          <input
            type="number"
            min={100}
            max={4000}
            value={widthInput}
            onChange={(e) => handleDimensionChange(e.target.value, heightInput)}
            className="w-full px-2 py-1 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 border border-zinc-700/50 focus:outline-none focus:border-zinc-500"
          />
          <span className="text-[11px] text-zinc-500 w-6 shrink-0">H</span>
          <input
            type="number"
            min={100}
            max={4000}
            value={heightInput}
            onChange={(e) => handleDimensionChange(widthInput, e.target.value)}
            className="w-full px-2 py-1 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 border border-zinc-700/50 focus:outline-none focus:border-zinc-500"
          />
        </div>

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
          <span className="text-[11px] text-zinc-500 w-7 text-right">{padding}</span>
        </div>
      </Section>

      {/* Section 3: Presets */}
      <Section title="Presets" defaultOpen={false}>
        <button
          onClick={handleSavePreset}
          className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150"
        >
          Save Current as Preset
        </button>

        {presets.length === 0 && (
          <p className="text-[11px] text-zinc-500">No saved presets</p>
        )}

        <div className="space-y-1">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center gap-2 px-2 py-2 rounded-md bg-zinc-800/40 group"
            >
              <div
                className="w-5 h-4 rounded-sm shrink-0 border border-zinc-700/50"
                style={{
                  background:
                    preset.background.type === "solid"
                      ? preset.background.color
                      : `linear-gradient(${preset.background.gradientAngle}deg, ${preset.background.gradientColors[0]}, ${preset.background.gradientColors[1]})`,
                }}
              />
              <button
                onClick={() => handleApplyPreset(preset)}
                className="flex-1 text-left text-[13px] text-zinc-400 hover:text-zinc-100 truncate transition-colors duration-150"
              >
                {preset.name}
              </button>
              <button
                onClick={() => removePreset(preset.id)}
                className="text-zinc-600 hover:text-red-400 text-[13px] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              >
                x
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
