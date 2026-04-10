import { Rect, Image as KonvaImage, Layer } from "react-konva";
import { useCanvasStore } from "../../stores/canvas.store";
import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import type { Filter } from "konva/lib/Node";

/**
 * Renders the canvas background: solid color, gradient, or image.
 * Supports blur effect via Konva filters.
 */
export default function BackgroundLayer() {
  const { canvasWidth, canvasHeight, background } = useCanvasStore();
  const rectRef = useRef<Konva.Rect>(null);
  const imgRef = useRef<Konva.Image>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Load background image if type is "image"
  useEffect(() => {
    if (background.type === "image" && background.imageSrc) {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = background.imageSrc;
      img.onload = () => setBgImage(img);
      img.onerror = () => console.error("[Screenshots] Failed to load background image");
    } else {
      setBgImage(null);
    }
  }, [background.type, background.imageSrc]);

  // Apply blur and/or grain filter to gradient/solid rect
  useEffect(() => {
    const node = rectRef.current;
    if (!node) return;
    node.clearCache();
    const filters: Filter[] = [];
    if (background.blur > 0) {
      filters.push(Konva.Filters.Blur);
    }
    if (background.grain > 0) {
      filters.push(Konva.Filters.Noise);
    }
    if (filters.length > 0) {
      node.filters(filters);
      if (background.blur > 0) node.blurRadius(background.blur);
      if (background.grain > 0) node.noise(background.grain / 100);
      node.cache();
    } else {
      node.filters([]);
    }
  }, [background]);

  // Apply blur and/or grain filter to background image
  useEffect(() => {
    const node = imgRef.current;
    if (!node) return;
    node.clearCache();
    const filters: Filter[] = [];
    if (background.blur > 0) {
      filters.push(Konva.Filters.Blur);
    }
    if (background.grain > 0) {
      filters.push(Konva.Filters.Noise);
    }
    if (filters.length > 0) {
      node.filters(filters);
      if (background.blur > 0) node.blurRadius(background.blur);
      if (background.grain > 0) node.noise(background.grain / 100);
      node.cache();
    } else {
      node.filters([]);
    }
  }, [background.blur, background.grain, bgImage, canvasWidth, canvasHeight]);

  const gradientFill = () => {
    const angle = (background.gradientAngle * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const halfW = canvasWidth / 2;
    const halfH = canvasHeight / 2;

    if (background.type === "radial-gradient") {
      return {
        fillRadialGradientStartPoint: { x: halfW, y: halfH },
        fillRadialGradientEndPoint: { x: halfW, y: halfH },
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndRadius: Math.max(halfW, halfH),
        fillRadialGradientColorStops: [
          0,
          background.gradientColors[0],
          1,
          background.gradientColors[1],
        ] as number[],
      };
    }

    return {
      fillLinearGradientStartPoint: {
        x: halfW - cos * halfW,
        y: halfH - sin * halfH,
      },
      fillLinearGradientEndPoint: {
        x: halfW + cos * halfW,
        y: halfH + sin * halfH,
      },
      fillLinearGradientColorStops: [
        0,
        background.gradientColors[0],
        1,
        background.gradientColors[1],
      ] as number[],
    };
  };

  return (
    <Layer listening={false}>
      {background.type === "image" && bgImage ? (
        <KonvaImage
          ref={imgRef}
          image={bgImage}
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
        />
      ) : background.type === "solid" ? (
        <Rect
          ref={rectRef}
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
          fill={background.color}
        />
      ) : (
        <Rect
          ref={rectRef}
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
          {...gradientFill()}
        />
      )}
    </Layer>
  );
}
