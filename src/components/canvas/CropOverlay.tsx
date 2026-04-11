import { useRef } from "react";
import { Layer, Rect } from "react-konva";
import Konva from "konva";
import type { CanvasImage } from "../../stores/canvas.store";

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropOverlayProps {
  image: CanvasImage;
  canvasWidth: number;
  canvasHeight: number;
  cropRect: CropRect;
  setCropRect: (rect: CropRect) => void;
  aspectRatio: number | null;
}

const HANDLE_SIZE = 12;
const MASK_FILL = "rgba(0,0,0,0.5)";
const HANDLE_FILL = "#ffffff";
const BORDER_STROKE = "rgba(255,255,255,0.8)";

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
  if (!ratio) return { width: w, height: h };
  if (w / h > ratio) return { width: h * ratio, height: h };
  return { width: w, height: w / ratio };
}

function clampCropToImage(
  crop: CropRect,
  imgLeft: number,
  imgTop: number,
  imgW: number,
  imgH: number,
): CropRect {
  const x = Math.max(imgLeft, Math.min(crop.x, imgLeft + imgW - 10));
  const y = Math.max(imgTop, Math.min(crop.y, imgTop + imgH - 10));
  const width = Math.max(10, Math.min(crop.width, imgLeft + imgW - x));
  const height = Math.max(10, Math.min(crop.height, imgTop + imgH - y));
  return { x, y, width, height };
}

export default function CropOverlay({
  image,
  canvasWidth,
  canvasHeight,
  cropRect,
  setCropRect,
  aspectRatio,
}: CropOverlayProps) {
  const isDragging = useRef(false);

  const bw = image.insetBorder.enabled ? image.insetBorder.width : 0;
  const imgW = image.width + bw * 2;
  const imgH = image.height + bw * 2;
  const imgLeft = image.x - imgW / 2;
  const imgTop = image.y - imgH / 2;

  const { x: cx, y: cy, width: cw, height: ch } = cropRect;

  // Handle positions
  function getHandlePos(pos: HandlePosition): { hx: number; hy: number } {
    switch (pos) {
      case "top-left":
        return { hx: cx, hy: cy };
      case "top-center":
        return { hx: cx + cw / 2, hy: cy };
      case "top-right":
        return { hx: cx + cw, hy: cy };
      case "middle-left":
        return { hx: cx, hy: cy + ch / 2 };
      case "middle-right":
        return { hx: cx + cw, hy: cy + ch / 2 };
      case "bottom-left":
        return { hx: cx, hy: cy + ch };
      case "bottom-center":
        return { hx: cx + cw / 2, hy: cy + ch };
      case "bottom-right":
        return { hx: cx + cw, hy: cy + ch };
    }
  }

  function handleHandleDrag(
    pos: HandlePosition,
    e: Konva.KonvaEventObject<DragEvent>,
  ) {
    const node = e.target;
    const nx = node.x() + HANDLE_SIZE / 2;
    const ny = node.y() + HANDLE_SIZE / 2;

    let newRect = { ...cropRect };

    switch (pos) {
      case "top-left": {
        const w = cx + cw - nx;
        const h = cy + ch - ny;
        const { width, height } = constrainToRatio(w, h, aspectRatio);
        newRect = {
          x: cx + cw - width,
          y: cy + ch - height,
          width,
          height,
        };
        break;
      }
      case "top-right": {
        const w = nx - cx;
        const h = cy + ch - ny;
        const { width, height } = constrainToRatio(w, h, aspectRatio);
        newRect = { x: cx, y: cy + ch - height, width, height };
        break;
      }
      case "bottom-left": {
        const w = cx + cw - nx;
        const h = ny - cy;
        const { width, height } = constrainToRatio(w, h, aspectRatio);
        newRect = { x: cx + cw - width, y: cy, width, height };
        break;
      }
      case "bottom-right": {
        const w = nx - cx;
        const h = ny - cy;
        const { width, height } = constrainToRatio(w, h, aspectRatio);
        newRect = { x: cx, y: cy, width, height };
        break;
      }
      case "top-center": {
        const h = cy + ch - ny;
        if (aspectRatio) {
          const width = h * aspectRatio;
          newRect = {
            x: cx + (cw - width) / 2,
            y: cy + ch - h,
            width,
            height: h,
          };
        } else {
          newRect = { ...cropRect, y: ny, height: h };
        }
        break;
      }
      case "bottom-center": {
        const h = ny - cy;
        if (aspectRatio) {
          const width = h * aspectRatio;
          newRect = { x: cx + (cw - width) / 2, y: cy, width, height: h };
        } else {
          newRect = { ...cropRect, height: h };
        }
        break;
      }
      case "middle-left": {
        const w = cx + cw - nx;
        if (aspectRatio) {
          const height = w / aspectRatio;
          newRect = {
            x: cx + cw - w,
            y: cy + (ch - height) / 2,
            width: w,
            height,
          };
        } else {
          newRect = { ...cropRect, x: nx, width: w };
        }
        break;
      }
      case "middle-right": {
        const w = nx - cx;
        if (aspectRatio) {
          const height = w / aspectRatio;
          newRect = { x: cx, y: cy + (ch - height) / 2, width: w, height };
        } else {
          newRect = { ...cropRect, width: w };
        }
        break;
      }
    }

    // Ensure minimum size
    if (newRect.width < 10) newRect.width = 10;
    if (newRect.height < 10) newRect.height = 10;

    const clamped = clampCropToImage(newRect, imgLeft, imgTop, imgW, imgH);
    setCropRect(clamped);
  }

  // Crop box drag (reposition)
  function handleCropBoxDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    isDragging.current = true;
    const node = e.target;
    let nx = node.x();
    let ny = node.y();
    // Clamp within image bounds
    nx = Math.max(imgLeft, Math.min(nx, imgLeft + imgW - cw));
    ny = Math.max(imgTop, Math.min(ny, imgTop + imgH - ch));
    node.x(nx);
    node.y(ny);
    setCropRect({ x: nx, y: ny, width: cw, height: ch });
  }

  function handleCropBoxDragEnd() {
    isDragging.current = false;
  }

  const handles: HandlePosition[] = [
    "top-left",
    "top-center",
    "top-right",
    "middle-left",
    "middle-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ];

  return (
    <Layer>
      {/* Mask: 4 dark rects around the crop box */}
      {/* Top */}
      <Rect x={0} y={0} width={canvasWidth} height={cy} fill={MASK_FILL} listening={false} />
      {/* Bottom */}
      <Rect
        x={0}
        y={cy + ch}
        width={canvasWidth}
        height={canvasHeight - (cy + ch)}
        fill={MASK_FILL}
        listening={false}
      />
      {/* Left */}
      <Rect x={0} y={cy} width={cx} height={ch} fill={MASK_FILL} listening={false} />
      {/* Right */}
      <Rect
        x={cx + cw}
        y={cy}
        width={canvasWidth - (cx + cw)}
        height={ch}
        fill={MASK_FILL}
        listening={false}
      />

      {/* Crop box border */}
      <Rect
        x={cx}
        y={cy}
        width={cw}
        height={ch}
        stroke={BORDER_STROKE}
        strokeWidth={1}
        draggable
        onDragMove={handleCropBoxDragMove}
        onDragEnd={handleCropBoxDragEnd}
      />

      {/* 8 handles */}
      {handles.map((pos) => {
        const { hx, hy } = getHandlePos(pos);
        return (
          <Rect
            key={pos}
            x={hx - HANDLE_SIZE / 2}
            y={hy - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill={HANDLE_FILL}
            draggable
            onDragMove={(e) => handleHandleDrag(pos, e)}
            onDragEnd={(e) => {
              // Reset handle position — we control via cropRect state
              const { hx: resetX, hy: resetY } = getHandlePos(pos);
              e.target.x(resetX - HANDLE_SIZE / 2);
              e.target.y(resetY - HANDLE_SIZE / 2);
            }}
          />
        );
      })}
    </Layer>
  );
}
