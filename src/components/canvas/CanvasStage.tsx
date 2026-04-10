import { useCallback, useEffect, useRef, useState } from "react";
import { Stage } from "react-konva";
import Konva from "konva";
import { useCanvasStore } from "../../stores/canvas.store";
import { useToolStore } from "../../stores/tool.store";
import BackgroundLayer from "./BackgroundLayer";
import ScreenshotLayer from "./ScreenshotLayer";
import AnnotationLayer from "./AnnotationLayer";
import PrivacyLayer from "./PrivacyLayer";

interface CanvasStageProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export default function CanvasStage({ stageRef }: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  // Arrow drag-to-draw state
  const [drawingArrowId, setDrawingArrowId] = useState<string | null>(null);

  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);
  const setSelectedId = useCanvasStore((s) => s.setSelectedId);
  const addAnnotation = useCanvasStore((s) => s.addAnnotation);
  const updateAnnotation = useCanvasStore((s) => s.updateAnnotation);
  const addPrivacyRegion = useCanvasStore((s) => s.addPrivacyRegion);
  const activeTool = useToolStore((s) => s.activeTool);
  const strokeColor = useToolStore((s) => s.strokeColor);
  const fillColor = useToolStore((s) => s.fillColor);
  const strokeWidth = useToolStore((s) => s.strokeWidth);
  const fontSize = useToolStore((s) => s.fontSize);
  const selectedEmoji = useToolStore((s) => s.selectedEmoji);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  // Undo/redo
  const undo = useCallback(() => useCanvasStore.temporal.getState().undo(), []);
  const redo = useCallback(() => useCanvasStore.temporal.getState().redo(), []);

  // Base scale fits canvas to container, zoom multiplies it
  const baseScale = Math.min(
    containerSize.width / canvasWidth,
    containerSize.height / canvasHeight,
    1,
  );
  const scale = baseScale * zoom;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Scroll wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((z) => Math.min(Math.max(z * delta, 0.25), 4));
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Cmd+0 to reset zoom, Cmd+Z/Cmd+Shift+Z for undo/redo
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (mod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [undo, redo]);

  // Drag-and-drop is handled in App.tsx (always mounted)

  // Arrow drag-to-draw: mouse move
  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!drawingArrowId) return;
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;

      const annotations = useCanvasStore.getState().annotations;
      const arrow = annotations.find((a) => a.id === drawingArrowId);
      if (!arrow || arrow.type !== "arrow") return;

      const endX = pos.x / scale - arrow.x;
      const endY = pos.y / scale - arrow.y;
      updateAnnotation(drawingArrowId, {
        points: [0, 0, endX, endY],
      });
    },
    [drawingArrowId, scale, updateAnnotation],
  );

  // Arrow drag-to-draw: mouse up
  const handleStageMouseUp = useCallback(() => {
    if (drawingArrowId) {
      setSelectedId(drawingArrowId);
      setDrawingArrowId(null);
      setActiveTool("select");
    }
  }, [drawingArrowId, setSelectedId, setActiveTool]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      // For select tool, only deselect when clicking empty canvas
      if (activeTool === "select") {
        if (e.target === e.target.getStage()) {
          setSelectedId(null);
        }
        return;
      }

      // For drawing tools, allow placement anywhere on the canvas
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;
      const x = pos.x / scale;
      const y = pos.y / scale;
      const id = crypto.randomUUID();

      switch (activeTool) {
        case "rectangle":
          addAnnotation({
            id,
            type: "rectangle",
            x,
            y,
            width: 120,
            height: 80,
            rotation: 0,
            fill: `${strokeColor}14`,
            stroke: strokeColor,
            strokeWidth,
            cornerRadius: 8,
          });
          setActiveTool("select");
          break;
        case "ellipse":
          addAnnotation({
            id,
            type: "ellipse",
            x,
            y,
            radiusX: 60,
            radiusY: 40,
            rotation: 0,
            fill: `${strokeColor}14`,
            stroke: strokeColor,
            strokeWidth,
          });
          setActiveTool("select");
          break;
        case "arrow":
          addAnnotation({
            id,
            type: "arrow",
            x,
            y,
            points: [0, 0, 0, 0],
            rotation: 0,
            stroke: strokeColor,
            strokeWidth,
            curvature: 0,
          });
          setDrawingArrowId(id);
          break;
        case "text":
          addAnnotation({
            id,
            type: "text",
            x,
            y,
            text: "Text",
            fontSize,
            fontFamily: "Inter, system-ui, sans-serif",
            fill: strokeColor,
            rotation: 0,
            shadowEnabled: true,
            shadowColor: "rgba(255,255,255,0.8)",
            shadowBlur: 4,
          });
          setActiveTool("select");
          break;
        case "emoji":
          addAnnotation({
            id,
            type: "emoji",
            x,
            y,
            emoji: selectedEmoji,
            fontSize: 48,
            rotation: 0,
          });
          setActiveTool("select");
          break;
        case "blur":
        case "pixelate":
          addPrivacyRegion({
            id,
            type: activeTool,
            x: x - 50,
            y: y - 30,
            width: 100,
            height: 60,
            intensity: activeTool === "blur" ? 10 : 8,
            opacity: 0.7,
            fill: activeTool === "blur" ? "#d4d4d4" : "#a3a3a3",
          });
          setActiveTool("select");
          break;
      }
    },
    [
      activeTool,
      scale,
      setSelectedId,
      addAnnotation,
      addPrivacyRegion,
      strokeColor,
      fillColor,
      strokeWidth,
      fontSize,
      selectedEmoji,
      setActiveTool,
    ],
  );

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center overflow-hidden bg-zinc-900/50 relative"
    >
      <div
        style={{
          width: canvasWidth * scale,
          height: canvasHeight * scale,
          boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 20px 40px rgba(0,0,0,0.4)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Stage
          ref={stageRef}
          width={canvasWidth * scale}
          height={canvasHeight * scale}
          scaleX={scale}
          scaleY={scale}
          onClick={handleStageClick}
          onTap={handleStageClick}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
        >
          <BackgroundLayer />
          <ScreenshotLayer />
          <PrivacyLayer />
          <AnnotationLayer />
        </Stage>
      </div>

      {/* Zoom and undo controls */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-900/90 border border-zinc-800/60 rounded-lg px-1.5 py-1 backdrop-blur-sm">
        <button
          onClick={undo}
          className="px-1.5 py-0.5 text-[12px] text-zinc-400 hover:text-zinc-100 rounded transition-colors"
          title="Undo (Cmd+Z)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.69 3L3 13"/></svg>
        </button>
        <button
          onClick={redo}
          className="px-1.5 py-0.5 text-[12px] text-zinc-400 hover:text-zinc-100 rounded transition-colors"
          title="Redo (Cmd+Shift+Z)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.69 3L21 13"/></svg>
        </button>
        <div className="w-px h-4 bg-zinc-800/60 mx-0.5" />
        <button
          onClick={() => setZoom((z) => Math.max(z * 0.8, 0.25))}
          className="px-1.5 py-0.5 text-[12px] text-zinc-400 hover:text-zinc-100 rounded transition-colors"
        >
          -
        </button>
        <button
          onClick={() => setZoom(1)}
          className="px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800/60 transition-colors min-w-[3rem] text-center"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(z * 1.2, 4))}
          className="px-1.5 py-0.5 text-[12px] text-zinc-400 hover:text-zinc-100 rounded transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

/** Add a screenshot data URL to the canvas */
export function addScreenshotToCanvas(dataUrl: string) {
  console.log("[Screenshots] addScreenshotToCanvas, data URL length:", dataUrl.length);
  const img = new window.Image();
  img.src = dataUrl;
  img.onerror = (err) => {
    console.error("[Screenshots] Failed to load screenshot image:", err);
  };
  img.onload = () => {
    console.log("[Screenshots] Screenshot loaded:", img.naturalWidth, "x", img.naturalHeight);
    const { canvasWidth, canvasHeight, addImage } = useCanvasStore.getState();
    const maxDim = Math.min(canvasWidth, canvasHeight) * 0.6;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    addImage({
      id: crypto.randomUUID(),
      src: dataUrl,
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      width: w,
      height: h,
      rotation: 0,
      cornerRadius: 12,
      flipX: false,
      flipY: false,
      shadow: {
        enabled: true,
        color: "rgba(0,0,0,0.3)",
        blur: 20,
        offsetX: 0,
        offsetY: 10,
      },
      insetBorder: {
        enabled: false,
        color: "#ffffff",
        width: 8,
      },
    });
  };
}
