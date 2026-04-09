import { Layer } from "react-konva";
import { useCanvasStore } from "../../stores/canvas.store";
import ScreenshotNode from "./nodes/ScreenshotNode";

/**
 * Renders all screenshot images on the canvas.
 * Computes effective position/size based on padding.
 */
export default function ScreenshotLayer() {
  const images = useCanvasStore((s) => s.images);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const padding = useCanvasStore((s) => s.padding);
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);

  // Available area after padding
  const availW = Math.max(canvasWidth - padding * 2, 100);
  const availH = Math.max(canvasHeight - padding * 2, 100);

  return (
    <Layer>
      {images.map((img) => {
        // Scale image to fit within padded area while preserving aspect ratio
        const scale = Math.min(availW / img.width, availH / img.height, 1);
        const displayW = Math.round(img.width * scale);
        const displayH = Math.round(img.height * scale);

        return (
          <ScreenshotNode
            key={img.id}
            data={{
              ...img,
              width: displayW,
              height: displayH,
              x: canvasWidth / 2,
              y: canvasHeight / 2,
            }}
            isSelected={selectedId === img.id}
          />
        );
      })}
    </Layer>
  );
}
