import { useEffect, useState } from "react";
import { useCanvasStore } from "../../stores/canvas.store";
import { open } from "@tauri-apps/plugin-dialog";
import { readImageFile, listSystemWallpapers, convertHeicThumbnail, convertHeicToDataUrl } from "../../ipc/capture";

// macOS-style vibrant gradients
const GRADIENT_PRESETS: [string, string][] = [
  // macOS Monterey / Ventura style
  ["#c471ed", "#f7797d"],
  ["#667eea", "#f093fb"],
  ["#a855f7", "#ec4899"],
  ["#f472b6", "#fb923c"],
  // Cool tones
  ["#6366f1", "#06b6d4"],
  ["#3b82f6", "#8b5cf6"],
  ["#0ea5e9", "#a78bfa"],
  ["#14b8a6", "#3b82f6"],
  // Warm tones
  ["#f97316", "#ef4444"],
  ["#f59e0b", "#ec4899"],
  ["#fb923c", "#f472b6"],
  ["#e11d48", "#7c3aed"],
  // Dark / subtle
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

export default function BackgroundPanel() {
  const background = useCanvasStore((s) => s.background);
  const setBackground = useCanvasStore((s) => s.setBackground);
  const [wallpapers, setWallpapers] = useState<{ name: string; path: string; thumb?: string }[]>([]);
  const [loadingWp, setLoadingWp] = useState<string | null>(null);

  // Load system wallpaper list and thumbnails when Image tab is selected
  useEffect(() => {
    if (background.type === "image" && wallpapers.length === 0) {
      listSystemWallpapers()
        .then(async (wp) => {
          // Set list immediately with names
          const items = wp.map(([name, path]) => ({ name, path }));
          setWallpapers(items);

          // Load thumbnails progressively in batches of 4
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
        filters: [
          { name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] },
        ],
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

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
        Background
      </h3>

      {/* Type selector */}
      <div className="flex gap-1 flex-wrap">
        {types.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setBackground({ type: value })}
            className={`px-2 py-1 text-[12px] rounded-md transition-colors ${
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
            className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors"
          >
            {background.imageSrc ? "Change image" : "Upload image"}
          </button>
          {background.imageSrc && (
            <div
              className="h-16 rounded-md border border-zinc-700/50 bg-cover bg-center"
              style={{ backgroundImage: `url(${background.imageSrc})` }}
            />
          )}

          {/* System wallpapers */}
          {wallpapers.length > 0 && (
            <div>
              <p className="text-[11px] text-zinc-500 mb-1.5">System Wallpapers</p>
              <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                {wallpapers.map((wp) => (
                  <button
                    key={wp.path}
                    onClick={() => void handleSelectWallpaper(wp.path)}
                    disabled={loadingWp !== null}
                    className={`relative h-12 rounded-md border transition-all overflow-hidden ${
                      loadingWp === wp.path
                        ? "border-zinc-400 opacity-70"
                        : "border-zinc-700/40 hover:border-zinc-400"
                    }`}
                    title={wp.name}
                  >
                    {wp.thumb ? (
                      <img
                        src={wp.thumb}
                        alt={wp.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
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
        <div className="grid grid-cols-4 gap-1.5">
          {GRADIENT_PRESETS.map(([c1, c2], i) => (
            <button
              key={i}
              onClick={() => setBackground({ gradientColors: [c1, c2] })}
              className="h-7 rounded-md border border-zinc-700/50 hover:border-zinc-500 transition-colors"
              style={{
                background: `linear-gradient(135deg, ${c1}, ${c2})`,
              }}
            />
          ))}
        </div>
      )}

      {/* Solid color presets */}
      {background.type === "solid" && (
        <div className="grid grid-cols-4 gap-1.5">
          {SOLID_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => setBackground({ color })}
              className="h-7 rounded-md border border-zinc-700/50 hover:border-zinc-500 transition-colors"
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
                : setBackground({
                    gradientColors: [e.target.value, background.gradientColors[1]],
                  })
            }
            className="w-7 h-5 rounded cursor-pointer bg-transparent border-0"
          />
          {isGradient && (
            <input
              type="color"
              value={background.gradientColors[1]}
              onChange={(e) =>
                setBackground({
                  gradientColors: [background.gradientColors[0], e.target.value],
                })
              }
              className="w-7 h-5 rounded cursor-pointer bg-transparent border-0"
            />
          )}
        </div>
      )}

      {/* Gradient angle */}
      {isGradient && (
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-zinc-500 w-10">Angle</label>
          <input
            type="range"
            min={0}
            max={360}
            value={background.gradientAngle}
            onChange={(e) => setBackground({ gradientAngle: Number(e.target.value) })}
            className="flex-1 accent-zinc-400"
          />
          <span className="text-[11px] text-zinc-500 w-7 text-right">
            {background.gradientAngle}°
          </span>
        </div>
      )}

      {/* Blur */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-zinc-500 w-10">Blur</label>
        <input
          type="range"
          min={0}
          max={40}
          value={background.blur}
          onChange={(e) => setBackground({ blur: Number(e.target.value) })}
          className="flex-1 accent-zinc-400"
        />
        <span className="text-[11px] text-zinc-500 w-7 text-right">
          {background.blur}
        </span>
      </div>

      {/* Grain */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-zinc-500 w-10">Grain</label>
        <input
          type="range"
          min={0}
          max={100}
          value={background.grain}
          onChange={(e) => setBackground({ grain: Number(e.target.value) })}
          className="flex-1 accent-zinc-400"
        />
        <span className="text-[11px] text-zinc-500 w-7 text-right">
          {background.grain}
        </span>
      </div>
    </div>
  );
}
