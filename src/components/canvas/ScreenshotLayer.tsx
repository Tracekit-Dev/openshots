import { Layer } from "react-konva";
import { useCanvasStore } from "../../stores/canvas.store";
import ScreenshotNode from "./nodes/ScreenshotNode";

/**
 * Renders all screenshot images on the canvas.
 * Each image is a ScreenshotNode with transform, shadow, border support.
 */
export default function ScreenshotLayer() {
  const images = useCanvasStore((s) => s.images);
  const selectedId = useCanvasStore((s) => s.selectedId);

  return (
    <Layer>
      {images.map((img) => (
        <ScreenshotNode
          key={img.id}
          data={img}
          isSelected={selectedId === img.id}
        />
      ))}
    </Layer>
  );
}
