import { useCallback, useEffect, useRef, useState } from "react";
import { Stage } from "react-konva";
import Konva from "konva";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useCanvasStore, type CanvasImage } from "../../stores/canvas.store";
import { useToolStore } from "../../stores/tool.store";
import BackgroundLayer from "./BackgroundLayer";
import ScreenshotLayer from "./ScreenshotLayer";
import AnnotationLayer from "./AnnotationLayer";
import PrivacyLayer from "./PrivacyLayer";

/**
 * Root Konva Stage. Handles:
 * - DPR-aware sizing via ResizeObserver
 * - File drop to add images
 * - Click-to-deselect on empty area
 * - Annotation drawing on canvas click
 */
interface CanvasStageProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export default function CanvasStage({ stageRef }: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);
  const addImage = useCanvasStore((s) => s.addImage);
  const setSelectedId = useCanvasStore((s) => s.setSelectedId);
  const addAnnotation = useCanvasStore((s) => s.addAnnotation);
  const addPrivacyRegion = useCanvasStore((s) => s.addPrivacyRegion);
  const activeTool = useToolStore((s) => s.activeTool);
  const strokeColor = useToolStore((s) => s.strokeColor);
  const fillColor = useToolStore((s) => s.fillColor);
  const strokeWidth = useToolStore((s) => s.strokeWidth);
  const fontSize = useToolStore((s) => s.fontSize);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  // Fit canvas into container
  const scale = Math.min(
    containerSize.width / canvasWidth,
    containerSize.height / canvasHeight,
    1,
  );

  // ResizeObserver for responsive container
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

  // File drop handler
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (!files) return;

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.src = url;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
        });

        const maxDim = Math.min(canvasWidth, canvasHeight) * 0.6;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const newImage: CanvasImage = {
          id: crypto.randomUUID(),
          src: url,
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
        };
        addImage(newImage);
      }
    };

    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("drop", handleDrop);
    return () => {
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("drop", handleDrop);
    };
  }, [addImage, canvasWidth, canvasHeight]);

  // Handle stage click for annotation creation or deselection
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      // If clicked on empty canvas area
      if (e.target === e.target.getStage()) {
        if (activeTool === "select") {
          setSelectedId(null);
          return;
        }

        const pos = e.target.getStage()?.getPointerPosition();
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
              fill: fillColor,
              stroke: strokeColor,
              strokeWidth,
              cornerRadius: 0,
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
              fill: fillColor,
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
              points: [0, 0, 120, 0],
              rotation: 0,
              stroke: strokeColor,
              strokeWidth,
              curvature: 0,
            });
            setActiveTool("select");
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
              shadowEnabled: false,
              shadowColor: "rgba(0,0,0,0.5)",
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
              emoji: "👍",
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
            });
            setActiveTool("select");
            break;
        }
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
      setActiveTool,
    ],
  );

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center overflow-hidden bg-neutral-900"
    >
      <div
        style={{
          width: canvasWidth * scale,
          height: canvasHeight * scale,
          boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px rgba(0,0,0,0.5)",
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
        >
          <BackgroundLayer />
          <ScreenshotLayer />
          <PrivacyLayer />
          <AnnotationLayer />
        </Stage>
      </div>
    </div>
  );
}

/** Add a screenshot from a file path (from capture) to the canvas */
export function addScreenshotToCanvas(filePath: string) {
  const src = convertFileSrc(filePath);
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  img.onload = () => {
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
      src,
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
