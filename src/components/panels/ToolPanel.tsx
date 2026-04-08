import { useToolStore, type ToolMode } from "../../stores/tool.store";

const TOOLS: { mode: ToolMode; label: string; shortcut: string }[] = [
  { mode: "select", label: "Select", shortcut: "V" },
  { mode: "arrow", label: "Arrow", shortcut: "A" },
  { mode: "rectangle", label: "Rect", shortcut: "R" },
  { mode: "ellipse", label: "Ellipse", shortcut: "E" },
  { mode: "text", label: "Text", shortcut: "T" },
  { mode: "emoji", label: "Emoji", shortcut: "M" },
  { mode: "blur", label: "Blur", shortcut: "B" },
  { mode: "pixelate", label: "Pixel", shortcut: "P" },
];

export default function ToolPanel() {
  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
        Tools
      </h3>
      <div className="grid grid-cols-2 gap-1">
        {TOOLS.map(({ mode, label, shortcut }) => (
          <button
            key={mode}
            onClick={() => setActiveTool(mode)}
            className={`px-2 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors ${
              activeTool === mode
                ? "bg-indigo-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-750"
            }`}
          >
            <span>{label}</span>
            <span className="text-[10px] opacity-50">{shortcut}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
