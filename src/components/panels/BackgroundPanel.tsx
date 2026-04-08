import { useCanvasStore } from "../../stores/canvas.store";

const GRADIENT_PRESETS: [string, string][] = [
  ["#6366f1", "#a855f7"],
  ["#ec4899", "#f97316"],
  ["#14b8a6", "#3b82f6"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#6366f1"],
  ["#8b5cf6", "#ec4899"],
  ["#06b6d4", "#a855f7"],
  ["#f43f5e", "#fb923c"],
];

const SOLID_PRESETS = [
  "#1e1b4b", "#0f172a", "#18181b", "#1c1917",
  "#6366f1", "#ec4899", "#f97316", "#10b981",
  "#ffffff", "#f5f5f4", "#e7e5e4", "#a8a29e",
];

export default function BackgroundPanel() {
  const background = useCanvasStore((s) => s.background);
  const setBackground = useCanvasStore((s) => s.setBackground);

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
        Background
      </h3>

      {/* Type selector */}
      <div className="flex gap-1">
        {(["solid", "linear-gradient", "radial-gradient"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setBackground({ type })}
            className={`px-2 py-1 text-xs rounded ${
              background.type === type
                ? "bg-indigo-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {type === "solid" ? "Solid" : type === "linear-gradient" ? "Linear" : "Radial"}
          </button>
        ))}
      </div>

      {/* Gradient presets */}
      {(background.type === "linear-gradient" || background.type === "radial-gradient") && (
        <div className="grid grid-cols-4 gap-2">
          {GRADIENT_PRESETS.map(([c1, c2], i) => (
            <button
              key={i}
              onClick={() => setBackground({ gradientColors: [c1, c2] })}
              className="h-8 rounded-md border border-neutral-700 hover:border-neutral-500 transition-colors"
              style={{
                background: `linear-gradient(135deg, ${c1}, ${c2})`,
              }}
            />
          ))}
        </div>
      )}

      {/* Solid color presets */}
      {background.type === "solid" && (
        <div className="grid grid-cols-4 gap-2">
          {SOLID_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => setBackground({ color })}
              className="h-8 rounded-md border border-neutral-700 hover:border-neutral-500 transition-colors"
              style={{ background: color }}
            />
          ))}
        </div>
      )}

      {/* Custom color input */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-neutral-500">Color</label>
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
          className="w-8 h-6 rounded cursor-pointer bg-transparent border-0"
        />
        {background.type !== "solid" && (
          <input
            type="color"
            value={background.gradientColors[1]}
            onChange={(e) =>
              setBackground({
                gradientColors: [background.gradientColors[0], e.target.value],
              })
            }
            className="w-8 h-6 rounded cursor-pointer bg-transparent border-0"
          />
        )}
      </div>

      {/* Gradient angle */}
      {background.type !== "solid" && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500 w-12">Angle</label>
          <input
            type="range"
            min={0}
            max={360}
            value={background.gradientAngle}
            onChange={(e) => setBackground({ gradientAngle: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="text-xs text-neutral-500 w-8 text-right">
            {background.gradientAngle}°
          </span>
        </div>
      )}

      {/* Blur */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-neutral-500 w-12">Blur</label>
        <input
          type="range"
          min={0}
          max={40}
          value={background.blur}
          onChange={(e) => setBackground({ blur: Number(e.target.value) })}
          className="flex-1"
        />
        <span className="text-xs text-neutral-500 w-8 text-right">
          {background.blur}
        </span>
      </div>

      {/* Grain */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-neutral-500 w-12">Grain</label>
        <input
          type="range"
          min={0}
          max={100}
          value={background.grain}
          onChange={(e) => setBackground({ grain: Number(e.target.value) })}
          className="flex-1"
        />
        <span className="text-xs text-neutral-500 w-8 text-right">
          {background.grain}
        </span>
      </div>
    </div>
  );
}
