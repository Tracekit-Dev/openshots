import { useState } from "react";
import { Layer } from "react-konva";
import { useCanvasStore } from "../../stores/canvas.store";
import ScreenshotNode from "./nodes/ScreenshotNode";
import GuidesLayer, { type Guide } from "./GuidesLayer";

/**
 * Renders all screenshot images on the canvas.
 * At padding=0, image covers the canvas (may crop edges if aspect ratios differ).
 * As padding increases, image fits within the padded area (contain mode).
 */
export default function ScreenshotLayer() {
  const images = useCanvasStore((s) => s.images);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const padding = useCanvasStore((s) => s.padding);
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);
  const [guides, setGuides] = useState<Guide[]>([]);

  const availW = Math.max(canvasWidth - padding * 2, 100);
  const availH = Math.max(canvasHeight - padding * 2, 100);

  return (
    <>
      <Layer>
        {images.map((img) => {
          const scaleW = availW / img.width;
          const scaleH = availH / img.height;

          // Contain mode: fit image within available area, preserving aspect ratio.
          // Background fills any gaps when aspect ratios don't match.
          const scale = Math.min(scaleW, scaleH);

          const displayW = Math.round(img.width * scale);
          const displayH = Math.round(img.height * scale);

          return (
            <ScreenshotNode
              key={img.id}
              data={{ ...img, width: displayW, height: displayH }}
              isSelected={selectedId === img.id}
              allImages={images}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              setGuides={setGuides}
            />
          );
        })}
      </Layer>
      <GuidesLayer
        guides={guides}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />
    </>
  );
}
