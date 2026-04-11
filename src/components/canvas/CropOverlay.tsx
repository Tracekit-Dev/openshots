import { Layer, Rect, Line } from "react-konva";
import Konva from "konva";

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  cropRect: CropRect;
  setCropRect: (rect: CropRect) => void;
  aspectRatio: number | null;
  /** Bounds the crop box can't exceed (the visible image area) */
  imageBounds: { x: number; y: number; width: number; height: number };
}

const HANDLE_SIZE = 10;
const MASK_FILL = "rgba(0,0,0,0.5)";
const HANDLE_FILL = "#ffffff";
const BORDER_STROKE = "rgba(255,255,255,0.9)";
const GUIDE_STROKE = "rgba(255,255,255,0.25)";

type DragTarget =
  | { type: "box" }
  | { type: "handle"; position: HandlePosition };

type HandlePosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

function constrainToRatio(
  w: number,
  h: number,
  ratio: number | null,
): { width: number; height: number } {
  if (!ratio) return { width: Math.max(10, w), height: Math.max(10, h) };
  const absW = Math.max(10, Math.abs(w));
  const absH = Math.max(10, Math.abs(h));
  if (absW / absH > ratio) return { width: absH * ratio, height: absH };
  return { width: absW, height: absW / ratio };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export default function CropOverlay({
  canvasWidth,
  canvasHeight,
  cropRect,
  setCropRect,
  aspectRatio,
  imageBounds,
}: CropOverlayProps) {
  const { x: cx, y: cy, width: cw, height: ch } = cropRect;
  const { x: bx, y: by, width: bw, height: bh } = imageBounds;

  // Rule of thirds guides
  const thirdW = cw / 3;
  const thirdH = ch / 3;

  function getHandleRect(pos: HandlePosition) {
    const hs = HANDLE_SIZE;
    switch (pos) {
      case "top-left":     return { x: cx - hs / 2, y: cy - hs / 2 };
      case "top-center":   return { x: cx + cw / 2 - hs / 2, y: cy - hs / 2 };
      case "top-right":    return { x: cx + cw - hs / 2, y: cy - hs / 2 };
      case "middle-left":  return { x: cx - hs / 2, y: cy + ch / 2 - hs / 2 };
      case "middle-right": return { x: cx + cw - hs / 2, y: cy + ch / 2 - hs / 2 };
      case "bottom-left":  return { x: cx - hs / 2, y: cy + ch - hs / 2 };
      case "bottom-center":return { x: cx + cw / 2 - hs / 2, y: cy + ch - hs / 2 };
      case "bottom-right": return { x: cx + cw - hs / 2, y: cy + ch - hs / 2 };
    }
  }

  function getCursor(pos: HandlePosition): string {
    switch (pos) {
      case "top-left":
      case "bottom-right":
        return "nwse-resize";
      case "top-right":
      case "bottom-left":
        return "nesw-resize";
      case "top-center":
      case "bottom-center":
        return "ns-resize";
      case "middle-left":
      case "middle-right":
        return "ew-resize";
    }
  }

  function handleDrag(
    target: DragTarget,
    startPointer: { x: number; y: number },
    startRect: CropRect,
    currentPointer: { x: number; y: number },
  ) {
    const dx = currentPointer.x - startPointer.x;
    const dy = currentPointer.y - startPointer.y;

    if (target.type === "box") {
      const newX = clamp(startRect.x + dx, bx, bx + bw - startRect.width);
      const newY = clamp(startRect.y + dy, by, by + bh - startRect.height);
      setCropRect({ x: newX, y: newY, width: startRect.width, height: startRect.height });
      return;
    }

    const pos = target.position;
    let newRect = { ...startRect };

    switch (pos) {
      case "top-left": {
        const w = startRect.width - dx;
        const h = startRect.height - dy;
        const { width, height } = constrainToRatio(w, h, aspectRatio);
        newRect = { x: startRect.x + startRect.width - width, y: startRect.y + startRect.height - height, width, height };
        break;
      }
      case "top-right": {
        const w = startRect.width + dx;
        const h = startRect.height - dy;
        const { width, height } = constrainToRatio(w, h, aspectRatio);
        newRect = { x: startRect.x, y: startRect.y + startRect.height - height, width, height };
        break;
      }
      case "bottom-left": {
        const w = startRect.width - dx;
        const h = startRect.height + dy;
        const { width, height } = constrainToRatio(w, h, aspectRatio);
        newRect = { x: startRect.x + startRect.width - width, y: startRect.y, width, height };
        break;
      }
      case "bottom-right": {
        const w = startRect.width + dx;
        const h = startRect.height + dy;
        const { width, height } = constrainToRatio(w, h, aspectRatio);
        newRect = { x: startRect.x, y: startRect.y, width, height };
        break;
      }
      case "top-center": {
        const h = startRect.height - dy;
        if (aspectRatio) {
          const { width, height } = constrainToRatio(startRect.width, h, aspectRatio);
          newRect = { x: startRect.x + (startRect.width - width) / 2, y: startRect.y + startRect.height - height, width, height };
        } else {
          newRect = { x: startRect.x, y: startRect.y + dy, width: startRect.width, height: Math.max(10, h) };
        }
        break;
      }
      case "bottom-center": {
        const h = startRect.height + dy;
        if (aspectRatio) {
          const { width, height } = constrainToRatio(startRect.width, h, aspectRatio);
          newRect = { x: startRect.x + (startRect.width - width) / 2, y: startRect.y, width, height };
        } else {
          newRect = { ...startRect, height: Math.max(10, h) };
        }
        break;
      }
      case "middle-left": {
        const w = startRect.width - dx;
        if (aspectRatio) {
          const { width, height } = constrainToRatio(w, startRect.height, aspectRatio);
          newRect = { x: startRect.x + startRect.width - width, y: startRect.y + (startRect.height - height) / 2, width, height };
        } else {
          newRect = { x: startRect.x + dx, y: startRect.y, width: Math.max(10, w), height: startRect.height };
        }
        break;
      }
      case "middle-right": {
        const w = startRect.width + dx;
        if (aspectRatio) {
          const { width, height } = constrainToRatio(w, startRect.height, aspectRatio);
          newRect = { x: startRect.x, y: startRect.y + (startRect.height - height) / 2, width, height };
        } else {
          newRect = { ...startRect, width: Math.max(10, w) };
        }
        break;
      }
    }

    // Clamp to image bounds
    newRect.x = clamp(newRect.x, bx, bx + bw - 10);
    newRect.y = clamp(newRect.y, by, by + bh - 10);
    newRect.width = Math.min(newRect.width, bx + bw - newRect.x);
    newRect.height = Math.min(newRect.height, by + bh - newRect.y);

    setCropRect(newRect);
  }

  // Use Stage-level mouse events for smooth dragging
  function startDrag(target: DragTarget, e: Konva.KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true;
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Account for stage scale
    const scale = stage.scaleX();
    const startPointer = { x: pointer.x / scale, y: pointer.y / scale };
    const startRect = { ...cropRect };

    const container = stage.container();
    if (target.type === "box") {
      container.style.cursor = "move";
    }

    const onMove = () => {
      const pos = stage.getPointerPosition();
      if (!pos) return;
      handleDrag(target, startPointer, startRect, { x: pos.x / scale, y: pos.y / scale });
    };

    const onUp = () => {
      container.style.cursor = "default";
      stage.off("mousemove touchmove", onMove);
      stage.off("mouseup touchend", onUp);
    };

    stage.on("mousemove touchmove", onMove);
    stage.on("mouseup touchend", onUp);
  }

  const handles: HandlePosition[] = [
    "top-left", "top-center", "top-right",
    "middle-left", "middle-right",
    "bottom-left", "bottom-center", "bottom-right",
  ];

  return (
    <Layer>
      {/* Mask: 4 dark rects around the crop box */}
      <Rect x={0} y={0} width={canvasWidth} height={cy} fill={MASK_FILL} listening={false} />
      <Rect x={0} y={cy + ch} width={canvasWidth} height={canvasHeight - (cy + ch)} fill={MASK_FILL} listening={false} />
      <Rect x={0} y={cy} width={cx} height={ch} fill={MASK_FILL} listening={false} />
      <Rect x={cx + cw} y={cy} width={canvasWidth - (cx + cw)} height={ch} fill={MASK_FILL} listening={false} />

      {/* Rule of thirds guides */}
      <Line points={[cx + thirdW, cy, cx + thirdW, cy + ch]} stroke={GUIDE_STROKE} strokeWidth={0.5} listening={false} />
      <Line points={[cx + thirdW * 2, cy, cx + thirdW * 2, cy + ch]} stroke={GUIDE_STROKE} strokeWidth={0.5} listening={false} />
      <Line points={[cx, cy + thirdH, cx + cw, cy + thirdH]} stroke={GUIDE_STROKE} strokeWidth={0.5} listening={false} />
      <Line points={[cx, cy + thirdH * 2, cx + cw, cy + thirdH * 2]} stroke={GUIDE_STROKE} strokeWidth={0.5} listening={false} />

      {/* Crop box — draggable area */}
      <Rect
        x={cx}
        y={cy}
        width={cw}
        height={ch}
        stroke={BORDER_STROKE}
        strokeWidth={1.5}
        fill="transparent"
        onMouseDown={(e) => startDrag({ type: "box" }, e)}
        onTouchStart={(e) => startDrag({ type: "box" }, e as unknown as Konva.KonvaEventObject<MouseEvent>)}
      />

      {/* 8 resize handles */}
      {handles.map((pos) => {
        const { x, y } = getHandleRect(pos);
        return (
          <Rect
            key={pos}
            x={x}
            y={y}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill={HANDLE_FILL}
            cornerRadius={2}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={0.5}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = getCursor(pos);
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = "default";
            }}
            onMouseDown={(e) => startDrag({ type: "handle", position: pos }, e)}
            onTouchStart={(e) => startDrag({ type: "handle", position: pos }, e as unknown as Konva.KonvaEventObject<MouseEvent>)}
          />
        );
      })}
    </Layer>
  );
}
