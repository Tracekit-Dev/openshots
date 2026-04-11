import { useState } from "react";
import { Layer } from "react-konva";
import { useCanvasStore } from "../../stores/canvas.store";
import { WINDOW_CHROME_FRAMES, DEVICE_MOCKUP_FRAMES } from "../composition/frames";
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
          // Contain-fit: scale image to fit within padded area
          const fitScale = Math.min(availW / img.width, availH / img.height);
          const displayW = Math.round(img.width * fitScale);
          const displayH = Math.round(img.height * fitScale);

          // Calculate extra height from window chrome frames
          const frameType = img.frame?.type;
          let chromeHeight = 0;
          if (frameType === "macos" || frameType === "windows") {
            chromeHeight = WINDOW_CHROME_FRAMES[frameType].titleBarHeight;
          }

          // Calculate device mockup insets
          let deviceInsets: { top: number; right: number; bottom: number; left: number } | null = null;
          if (frameType === "iphone" || frameType === "ipad" || frameType === "macbook") {
            const mockupConfig = DEVICE_MOCKUP_FRAMES[frameType];
            const totalW = displayW / (1 - mockupConfig.screenInset.left - mockupConfig.screenInset.right);
            const totalH = displayH / (1 - mockupConfig.screenInset.top - mockupConfig.screenInset.bottom);
            deviceInsets = {
              top: Math.round(totalH * mockupConfig.screenInset.top),
              right: Math.round(totalW * mockupConfig.screenInset.right),
              bottom: Math.round(totalH * mockupConfig.screenInset.bottom),
              left: Math.round(totalW * mockupConfig.screenInset.left),
            };
          }

          return (
            <ScreenshotNode
              key={img.id}
              data={img}
              displayWidth={displayW}
              displayHeight={displayH}
              chromeHeight={chromeHeight}
              deviceInsets={deviceInsets}
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
