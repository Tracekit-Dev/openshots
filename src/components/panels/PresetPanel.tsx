import { useCanvasStore } from "../../stores/canvas.store";
import { usePresetStore, type CanvasPreset } from "../../stores/preset.store";

export default function PresetPanel() {
  const presets = usePresetStore((s) => s.presets);
  const addPreset = usePresetStore((s) => s.addPreset);
  const removePreset = usePresetStore((s) => s.removePreset);

  const handleSave = () => {
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

  const handleApply = (preset: CanvasPreset) => {
    const store = useCanvasStore.getState();
    store.setCanvasSize(preset.canvasWidth, preset.canvasHeight);
    store.setPadding(preset.padding);
    store.setBackground(preset.background);

    // Apply style to all images
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
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
        Presets
      </h3>

      <button
        onClick={handleSave}
        className="w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
      >
        Save Current as Preset
      </button>

      {presets.length === 0 && (
        <p className="text-[10px] text-neutral-600">No saved presets</p>
      )}

      <div className="space-y-1">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-neutral-800/50 group"
          >
            {/* Preset preview swatch */}
            <div
              className="w-6 h-4 rounded-sm shrink-0"
              style={{
                background:
                  preset.background.type === "solid"
                    ? preset.background.color
                    : `linear-gradient(${preset.background.gradientAngle}deg, ${preset.background.gradientColors[0]}, ${preset.background.gradientColors[1]})`,
              }}
            />

            <button
              onClick={() => handleApply(preset)}
              className="flex-1 text-left text-xs text-neutral-300 hover:text-white truncate"
            >
              {preset.name}
            </button>

            <button
              onClick={() => removePreset(preset.id)}
              className="text-neutral-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
