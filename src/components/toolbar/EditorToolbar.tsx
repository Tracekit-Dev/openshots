import { useState, useRef, useEffect, useCallback } from "react";
import {
  MousePointer2,
  MoveUpRight,
  Square,
  Circle,
  Type,
  Smile,
  Droplets,
  Grid3X3,
  Crop,
  MessageCircle,
  MessageSquare,
  Lightbulb,
  Undo2,
  Redo2,
} from "lucide-react";
import Konva from "konva";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useToolStore, type ToolMode, COLOR_PRESETS } from "../../stores/tool.store";
import { useCanvasStore } from "../../stores/canvas.store";
import ToolbarTooltip from "./ToolbarTooltip";
import ExportPopover from "./ExportPopover";

const TOOLS: { mode: ToolMode; icon: React.ElementType; label: string; shortcut: string }[] = [
  { mode: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { mode: "arrow", icon: MoveUpRight, label: "Arrow", shortcut: "A" },
  { mode: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
  { mode: "ellipse", icon: Circle, label: "Ellipse", shortcut: "E" },
  { mode: "text", icon: Type, label: "Text", shortcut: "T" },
  { mode: "emoji", icon: Smile, label: "Emoji", shortcut: "M" },
  { mode: "blur", icon: Droplets, label: "Blur", shortcut: "B" },
  { mode: "pixelate", icon: Grid3X3, label: "Pixelate", shortcut: "P" },
  { mode: "crop", icon: Crop, label: "Crop", shortcut: "C" },
  { mode: "callout", icon: MessageCircle, label: "Callout", shortcut: "N" },
  { mode: "speech-bubble", icon: MessageSquare, label: "Speech Bubble", shortcut: "S" },
  { mode: "spotlight", icon: Lightbulb, label: "Spotlight", shortcut: "L" },
];

interface EditorToolbarProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export default function EditorToolbar({ stageRef }: EditorToolbarProps) {
  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const strokeColor = useToolStore((s) => s.strokeColor);
  const setStrokeColor = useToolStore((s) => s.setStrokeColor);
  const setSelectedEmoji = useToolStore((s) => s.setSelectedEmoji);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const annotations = useCanvasStore((s) => s.annotations);
  const updateAnnotation = useCanvasStore((s) => s.updateAnnotation);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);

  const undo = useCallback(() => useCanvasStore.temporal.getState().undo(), []);
  const redo = useCallback(() => useCanvasStore.temporal.getState().redo(), []);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmojiPicker]);

  // Listen for programmatic export popover open (from Cmd+E or menu)
  useEffect(() => {
    const handler = () => setShowExport(true);
    window.addEventListener("openExportPopover", handler);
    return () => window.removeEventListener("openExportPopover", handler);
  }, []);

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
    <div className="h-11 flex items-center gap-1 px-3 border-b border-zinc-800/60 bg-zinc-950 shrink-0">
      {/* Tool icons */}
      {TOOLS.map(({ mode, icon: Icon, label, shortcut }) => (
        <ToolbarTooltip key={mode} label={label} shortcut={shortcut}>
          <div className="relative">
            <button
              onClick={() => handleToolClick(mode)}
              className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors duration-150 ${
                activeTool === mode
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
              }`}
            >
              <Icon size={20} />
            </button>

            {/* Emoji picker anchored below emoji button */}
            {mode === "emoji" && showEmojiPicker && (
              <div ref={emojiRef} className="absolute top-full left-0 mt-2 z-50">
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
            )}
          </div>
        </ToolbarTooltip>
      ))}

      {/* Separator */}
      <div className="w-px h-5 bg-zinc-700/50 mx-1" />

      {/* Color picker dots */}
      <div className="flex items-center gap-0.5">
        {COLOR_PRESETS.map((color) => (
          <button
            key={color}
            onClick={() => handleColorClick(color)}
            className={`w-5 h-5 rounded-full transition-all duration-150 ${
              strokeColor === color
                ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-950"
                : "hover:scale-110"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-zinc-700/50 mx-1" />

      {/* Undo / Redo */}
      <ToolbarTooltip label="Undo" shortcut="Cmd+Z">
        <button
          onClick={undo}
          className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors duration-150"
        >
          <Undo2 size={20} />
        </button>
      </ToolbarTooltip>
      <ToolbarTooltip label="Redo" shortcut="Cmd+Shift+Z">
        <button
          onClick={redo}
          className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors duration-150"
        >
          <Redo2 size={20} />
        </button>
      </ToolbarTooltip>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Done button */}
      <div className="relative">
        <button
          ref={doneRef}
          data-done-trigger
          onClick={() => setShowExport(!showExport)}
          className="px-4 py-1.5 text-[13px] font-medium rounded-full bg-zinc-100 text-zinc-900 hover:bg-white transition-colors duration-150"
        >
          Done
        </button>

        {/* Export popover */}
        {showExport && (
          <ExportPopover
            stageRef={stageRef}
            anchorEl={doneRef.current}
            onClose={() => setShowExport(false)}
          />
        )}
      </div>
    </div>
  );
}
