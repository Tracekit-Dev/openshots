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
      <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
        Tools
      </h3>
      <div className="grid grid-cols-2 gap-1">
        {TOOLS.map(({ mode, label, shortcut }) => (
          <button
            key={mode}
            onClick={() => setActiveTool(mode)}
            className={`px-2 py-1.5 text-[13px] rounded-md flex items-center justify-between transition-colors ${
              activeTool === mode
                ? "bg-zinc-100 text-zinc-900"
                : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
            }`}
          >
            <span>{label}</span>
            <span className="text-[10px] opacity-40">{shortcut}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
