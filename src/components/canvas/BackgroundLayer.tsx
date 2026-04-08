import { Rect, Image as KonvaImage, Layer } from "react-konva";
import { useCanvasStore } from "../../stores/canvas.store";
import { useEffect, useRef, useState } from "react";
import Konva from "konva";

/**
 * Renders the canvas background: solid color, gradient, or image.
 * Supports blur and grain effects via Konva filters.
 */
export default function BackgroundLayer() {
  const { canvasWidth, canvasHeight, background } = useCanvasStore();
  const rectRef = useRef<Konva.Rect>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Load background image if type is "image"
  useEffect(() => {
    if (background.type === "image" && background.imageSrc) {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = background.imageSrc;
      img.onload = () => setBgImage(img);
    } else {
      setBgImage(null);
    }
  }, [background.type, background.imageSrc]);

  // Apply blur filter
  useEffect(() => {
    const node = rectRef.current;
    if (!node) return;
    if (background.blur > 0) {
      node.filters([Konva.Filters.Blur]);
      node.blurRadius(background.blur);
    } else {
      node.filters([]);
    }
    node.cache();
  }, [background.blur, canvasWidth, canvasHeight]);

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
