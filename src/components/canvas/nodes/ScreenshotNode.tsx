import { useEffect, useRef, useState } from "react";
import { Group, Image as KonvaImage, Rect, Transformer } from "react-konva";
import Konva from "konva";
import type { CanvasImage } from "../../../stores/canvas.store";
import { useCanvasStore } from "../../../stores/canvas.store";
import { useToolStore } from "../../../stores/tool.store";
import { WINDOW_CHROME_FRAMES, DEVICE_MOCKUP_FRAMES } from "../../composition/frames";
import { WindowChrome } from "../../composition/WindowChrome";
import { DeviceMockup } from "../../composition/DeviceMockup";
import type { Guide } from "../GuidesLayer";

const SNAP_THRESHOLD = 8; // per D-10

function getLineGuideStops(
  allImages: CanvasImage[],
  skipId: string,
  canvasWidth: number,
  canvasHeight: number,
): { v: number[]; h: number[] } {
  const v: number[] = [0, canvasWidth / 2, canvasWidth];
  const h: number[] = [0, canvasHeight / 2, canvasHeight];
  for (const img of allImages) {
    if (img.id === skipId) continue;
    // offset model: x,y is center, so edges are x +/- width/2
    const left = img.x - img.width / 2;
    const right = img.x + img.width / 2;
    const top = img.y - img.height / 2;
    const bottom = img.y + img.height / 2;
    v.push(left, img.x, right);
    h.push(top, img.y, bottom);
  }
  return { v, h };
}

interface ScreenshotNodeProps {
  data: CanvasImage;
  displayWidth: number;
  displayHeight: number;
  chromeHeight: number;
  deviceInsets: { top: number; right: number; bottom: number; left: number } | null;
  isSelected: boolean;
  allImages: CanvasImage[];
  canvasWidth: number;
  canvasHeight: number;
  setGuides: (guides: Guide[]) => void;
}

export default function ScreenshotNode({
  data,
  displayWidth,
  displayHeight,
  chromeHeight,
  deviceInsets,
  isSelected,
  allImages,
  canvasWidth,
  canvasHeight,
  setGuides,
}: ScreenshotNodeProps) {
  const updateImage = useCanvasStore((s) => s.updateImage);
  const setSelectedId = useCanvasStore((s) => s.setSelectedId);
  const activeTool = useToolStore((s) => s.activeTool);
  const isCropActive = activeTool === "crop";
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.src = data.src;
    image.onload = () => setImg(image);
  }, [data.src]);

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  if (!img) return null;

  const frameCategory = data.frame?.type;
  const frameVariant = data.frame?.variant;
  const frameTheme = data.frame?.theme ?? "dark";
  const hasChrome = frameCategory === "window-chrome";
  const hasDevice = frameCategory === "device-mockup";

  const bw = data.insetBorder.enabled ? data.insetBorder.width : 0;

  // Calculate total dimensions including frame
  let totalW: number;
  let totalH: number;

  if (hasDevice && deviceInsets) {
    totalW = displayWidth + deviceInsets.left + deviceInsets.right;
    totalH = displayHeight + deviceInsets.top + deviceInsets.bottom;
  } else if (hasChrome) {
    totalW = displayWidth + bw * 2;
    totalH = displayHeight + bw * 2 + chromeHeight;
  } else {
    totalW = displayWidth + bw * 2;
    totalH = displayHeight + bw * 2;
  }

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;

    // Node edges in canvas space (offset model: x,y is center)
    const nodeLeft = node.x() - totalW / 2;
    const nodeRight = node.x() + totalW / 2;
    const nodeTop = node.y() - totalH / 2;
    const nodeBottom = node.y() + totalH / 2;
    const nodeCenterX = node.x();
    const nodeCenterY = node.y();

    const stops = getLineGuideStops(allImages, data.id, canvasWidth, canvasHeight);
    const newGuides: Guide[] = [];
    let snapX: number | null = null;
    let snapY: number | null = null;

    // Check vertical (x-axis) snaps: left edge, center, right edge
    const nodeVEdges = [
      { pos: nodeLeft },
      { pos: nodeCenterX },
      { pos: nodeRight },
    ];
    for (const edge of nodeVEdges) {
      for (const stop of stops.v) {
        if (Math.abs(edge.pos - stop) < SNAP_THRESHOLD) {
          snapX = stop - edge.pos + node.x();
          newGuides.push({ lineGuide: stop, orientation: "V" });
          break;
        }
      }
      if (snapX !== null) break;
    }

    // Check horizontal (y-axis) snaps: top edge, center, bottom edge
    const nodeHEdges = [
      { pos: nodeTop },
      { pos: nodeCenterY },
      { pos: nodeBottom },
    ];
    for (const edge of nodeHEdges) {
      for (const stop of stops.h) {
        if (Math.abs(edge.pos - stop) < SNAP_THRESHOLD) {
          snapY = stop - edge.pos + node.y();
          newGuides.push({ lineGuide: stop, orientation: "H" });
          break;
        }
      }
      if (snapY !== null) break;
    }

    // Apply snap position
    if (snapX !== null || snapY !== null) {
      node.position({
        x: snapX ?? node.x(),
        y: snapY ?? node.y(),
      });
    }

    setGuides(newGuides);
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    setGuides([]);
    updateImage(data.id, { x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = () => {
    const node = groupRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    updateImage(data.id, {
      x: node.x(),
      y: node.y(),
      width: Math.round(displayWidth * scaleX),
      height: Math.round(displayHeight * scaleY),
      rotation: node.rotation(),
    });
  };

  // Effective corner radius: disabled when device frame is active
  const effectiveCornerRadius = hasDevice ? 0 : data.cornerRadius;

  // Render the image content (shared between framed and unframed)
  const renderImageContent = (offsetX: number, offsetY: number) => (
    <>
      {/* Inset border -- larger rounded rect behind the image */}
      {data.insetBorder.enabled && !hasDevice && !hasChrome && (
        <Rect
          x={offsetX}
          y={offsetY}
          width={displayWidth + bw * 2}
          height={displayHeight + bw * 2}
          cornerRadius={effectiveCornerRadius + bw}
          fill={data.insetBorder.color}
          listening={false}
        />
      )}

      {/* Clipped image */}
      <Group
        x={offsetX + (hasDevice || hasChrome ? 0 : bw)}
        y={offsetY + (hasDevice || hasChrome ? 0 : bw)}
        clipFunc={
          effectiveCornerRadius > 0
            ? (ctx) => {
                const r = effectiveCornerRadius;
                const w = displayWidth;
                const h = displayHeight;
                ctx.beginPath();
                ctx.moveTo(r, 0);
                ctx.lineTo(w - r, 0);
                ctx.arcTo(w, 0, w, r, r);
                ctx.lineTo(w, h - r);
                ctx.arcTo(w, h, w - r, h, r);
                ctx.lineTo(r, h);
                ctx.arcTo(0, h, 0, h - r, r);
                ctx.lineTo(0, r);
                ctx.arcTo(0, 0, r, 0, r);
                ctx.closePath();
              }
            : undefined
        }
      >
        <KonvaImage
          image={img}
          x={0}
          y={0}
          width={displayWidth}
          height={displayHeight}
          scaleX={data.flipX ? -1 : 1}
          scaleY={data.flipY ? -1 : 1}
          offsetX={data.flipX ? displayWidth : 0}
          offsetY={data.flipY ? displayHeight : 0}
        />
      </Group>
    </>
  );

  return (
    <>
      {/* Shadow -- rendered as a separate group OUTSIDE the main group
          so it isn't clipped or affected by the image group structure */}
      {data.shadow.enabled && (
        <Rect
          x={data.x - totalW / 2}
          y={data.y - totalH / 2}
          width={totalW}
          height={totalH}
          cornerRadius={hasChrome ? WINDOW_CHROME_FRAMES[frameVariant as "macos" | "windows"].borderRadius : hasDevice ? DEVICE_MOCKUP_FRAMES[frameVariant as "iphone" | "ipad" | "macbook"].bezelRadius : effectiveCornerRadius}
          fill="#000"
          opacity={0}
          shadowEnabled
          shadowColor={data.shadow.color}
          shadowBlur={data.shadow.blur}
          shadowOffsetX={data.shadow.offsetX}
          shadowOffsetY={data.shadow.offsetY}
          shadowOpacity={1}
          listening={false}
        />
      )}

      <Group
        ref={groupRef}
        x={data.x}
        y={data.y}
        width={totalW}
        height={totalH}
        rotation={data.rotation}
        offsetX={totalW / 2}
        offsetY={totalH / 2}
        draggable={!isCropActive}
        listening={!isCropActive}
        onClick={() => !isCropActive && setSelectedId(data.id)}
        onTap={() => !isCropActive && setSelectedId(data.id)}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      >
        {/* Window Chrome Frame (macOS / Windows) */}
        {hasChrome && (
          <>
            <WindowChrome
              config={WINDOW_CHROME_FRAMES[frameVariant as "macos" | "windows"]}
              theme={frameTheme}
              width={displayWidth}
              height={displayHeight}
            />
            {renderImageContent(0, chromeHeight)}
          </>
        )}

        {/* Device Mockup Frame (iPhone / iPad / MacBook) */}
        {hasDevice && deviceInsets && (
          <DeviceMockup
            config={DEVICE_MOCKUP_FRAMES[frameVariant as "iphone" | "ipad" | "macbook"]}
            width={displayWidth}
            height={displayHeight}
          >
            {renderImageContent(deviceInsets.left, deviceInsets.top)}
          </DeviceMockup>
        )}

        {/* No frame -- standard rendering */}
        {!hasChrome && !hasDevice && renderImageContent(0, 0)}
      </Group>

      {isSelected && !isCropActive && (
        <Transformer
          ref={trRef}
          rotateEnabled
          keepRatio
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
          ]}
          boundBoxFunc={(_oldBox, newBox) => {
            if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
              return _oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}
