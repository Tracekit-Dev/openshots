import { useState, useRef, useEffect } from "react";
import { useToolStore, type ToolMode, COLOR_PRESETS } from "../../stores/tool.store";
import { useCanvasStore } from "../../stores/canvas.store";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

const TOOLS: { mode: ToolMode; label: string; shortcut: string }[] = [
  { mode: "select", label: "Select", shortcut: "V" },
  { mode: "arrow", label: "Arrow", shortcut: "A" },
  { mode: "rectangle", label: "Rect", shortcut: "R" },
  { mode: "ellipse", label: "Ellipse", shortcut: "E" },
  { mode: "text", label: "Text", shortcut: "T" },
  { mode: "emoji", label: "Emoji", shortcut: "M" },
  { mode: "blur", label: "Blur", shortcut: "B" },
  { mode: "pixelate", label: "Pixel", shortcut: "P" },
  { mode: "crop", label: "Crop", shortcut: "C" },
  { mode: "callout", label: "Callout", shortcut: "N" },
];

export default function ToolPanel() {
  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const strokeColor = useToolStore((s) => s.strokeColor);
  const setStrokeColor = useToolStore((s) => s.setStrokeColor);
  const setSelectedEmoji = useToolStore((s) => s.setSelectedEmoji);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const annotations = useCanvasStore((s) => s.annotations);
  const updateAnnotation = useCanvasStore((s) => s.updateAnnotation);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmojiPicker]);

  const handleToolClick = (mode: ToolMode) => {
    if (mode === "emoji") {
      setShowEmojiPicker(true);
    }
    setActiveTool(mode);
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    setSelectedEmoji(emoji.native);
    setShowEmojiPicker(false);
    setActiveTool("emoji");
  };

  const handleColorClick = (color: string) => {
    setStrokeColor(color);
    // Also update the currently selected annotation's color
    if (selectedId) {
      const ann = annotations.find((a) => a.id === selectedId);
      if (ann) {
        switch (ann.type) {
          case "arrow":
            updateAnnotation(ann.id, { stroke: color });
            break;
          case "rectangle":
            updateAnnotation(ann.id, { stroke: color, fill: `${color}14` });
            break;
          case "ellipse":
            updateAnnotation(ann.id, { stroke: color, fill: `${color}14` });
            break;
          case "text":
            updateAnnotation(ann.id, { fill: color });
            break;
          case "callout":
            updateAnnotation(ann.id, { fill: color });
            break;
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
          Tools
        </h3>
        <div className="grid grid-cols-2 gap-1">
          {TOOLS.map(({ mode, label, shortcut }) => (
            <button
              key={mode}
              onClick={() => handleToolClick(mode)}
              className={`px-2 py-2 text-[13px] rounded-md flex items-center justify-between transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none ${
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

        {/* Emoji picker popover */}
        {showEmojiPicker && (
          <div ref={pickerRef} className="relative z-50">
            <div className="absolute left-0 top-0">
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="dark"
                previewPosition="none"
                skinTonePosition="none"
                maxFrequentRows={2}
                perLine={7}
              />
            </div>
          </div>
        )}
      </div>

      {/* Color presets */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
          Color
        </h3>
        <div className="flex flex-wrap gap-1">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => handleColorClick(color)}
              className={`w-6 h-6 rounded-md border transition-[transform,border-color] duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none ${
                strokeColor === color
                  ? "border-white scale-110"
                  : "border-zinc-700 hover:border-zinc-500"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
