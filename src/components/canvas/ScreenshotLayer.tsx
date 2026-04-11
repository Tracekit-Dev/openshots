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
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);
  const [guides, setGuides] = useState<Guide[]>([]);

  return (
    <>
      <Layer>
        {images.map((img) => {
          return (
            <ScreenshotNode
              key={img.id}
              data={img}
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
