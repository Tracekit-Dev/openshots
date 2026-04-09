import { useEffect, useRef, useState } from "react";
import { Group, Image as KonvaImage, Rect, Transformer } from "react-konva";
import Konva from "konva";
import type { CanvasImage } from "../../../stores/canvas.store";
import { useCanvasStore } from "../../../stores/canvas.store";

interface ScreenshotNodeProps {
  data: CanvasImage;
  isSelected: boolean;
}

export default function ScreenshotNode({ data, isSelected }: ScreenshotNodeProps) {
  const updateImage = useCanvasStore((s) => s.updateImage);
  const setSelectedId = useCanvasStore((s) => s.setSelectedId);
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

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
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
      width: Math.round(data.width * scaleX),
      height: Math.round(data.height * scaleY),
      rotation: node.rotation(),
    });
  };

  const bw = data.insetBorder.enabled ? data.insetBorder.width : 0;

  return (
    <>
      <Group
        ref={groupRef}
        x={data.x}
        y={data.y}
        width={data.width + bw * 2}
        height={data.height + bw * 2}
        rotation={data.rotation}
        offsetX={(data.width + bw * 2) / 2}
        offsetY={(data.height + bw * 2) / 2}
        draggable
        onClick={() => setSelectedId(data.id)}
        onTap={() => setSelectedId(data.id)}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      >
        {/* Shadow rect — rendered outside clip so shadow is visible */}
        {data.shadow.enabled && (
          <Rect
            x={bw}
            y={bw}
            width={data.width}
            height={data.height}
            cornerRadius={data.cornerRadius}
            fill="transparent"
            shadowEnabled
            shadowColor={data.shadow.color}
            shadowBlur={data.shadow.blur}
            shadowOffsetX={data.shadow.offsetX}
            shadowOffsetY={data.shadow.offsetY}
            listening={false}
          />
        )}

        {/* Inset border — rendered as a larger rounded rect behind the image */}
        {data.insetBorder.enabled && (
          <Rect
            x={0}
            y={0}
            width={data.width + bw * 2}
            height={data.height + bw * 2}
            cornerRadius={data.cornerRadius + bw}
            fill={data.insetBorder.color}
            listening={false}
          />
        )}

        {/* Clipped image group */}
        <Group
          x={bw}
          y={bw}
          clipFunc={
            data.cornerRadius > 0
              ? (ctx) => {
                  const r = data.cornerRadius;
                  const w = data.width;
                  const h = data.height;
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
            width={data.width}
            height={data.height}
            scaleX={data.flipX ? -1 : 1}
            scaleY={data.flipY ? -1 : 1}
            offsetX={data.flipX ? data.width : 0}
            offsetY={data.flipY ? data.height : 0}
          />
        </Group>
      </Group>

      {isSelected && (
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
