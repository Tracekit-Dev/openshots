import { Layer, Rect, Transformer } from "react-konva";
import { useCanvasStore, type PrivacyRegion } from "../../stores/canvas.store";
import Konva from "konva";
import { useRef, useEffect, useState } from "react";

/**
 * Renders privacy blur/pixelate regions.
 * Captures the underlying canvas content and applies filters to it.
 */
export default function PrivacyLayer() {
  const privacyRegions = useCanvasStore((s) => s.privacyRegions);
  const updatePrivacyRegion = useCanvasStore((s) => s.updatePrivacyRegion);
  const setSelectedId = useCanvasStore((s) => s.setSelectedId);
  const selectedId = useCanvasStore((s) => s.selectedId);

  return (
    <Layer>
      {privacyRegions.map((region) => (
        <PrivacyRect
          key={region.id}
          region={region}
          isSelected={selectedId === region.id}
          onSelect={() => setSelectedId(region.id)}
          onUpdate={(updates) => updatePrivacyRegion(region.id, updates)}
        />
      ))}
    </Layer>
  );
}

function PrivacyRect({
  region,
  isSelected,
  onSelect,
  onUpdate,
}: {
  region: PrivacyRegion;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<PrivacyRegion>) => void;
}) {
  const groupRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [processedImage, setProcessedImage] = useState<HTMLImageElement | null>(null);

  // Capture underlying content and apply blur/pixelate
  useEffect(() => {
    const stage = groupRef.current?.getStage();
    if (!stage) return;

    // Use requestAnimationFrame to wait for render
    const frameId = requestAnimationFrame(() => {
      try {
        // Get the stage canvas data for the region
        const pixelRatio = 1;
        const canvas = document.createElement("canvas");
        const w = Math.max(Math.round(region.width), 1);
        const h = Math.max(Math.round(region.height), 1);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Draw from stage's underlying canvas
        const stageCanvas = stage.toCanvas({
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height,
          pixelRatio,
        });

        ctx.drawImage(stageCanvas, 0, 0, w, h);

        const canvasToImage = (c: HTMLCanvasElement): Promise<HTMLImageElement> =>
          new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve(img);
            img.src = c.toDataURL();
          });

        if (region.type === "blur") {
          const blurCanvas = document.createElement("canvas");
          blurCanvas.width = w;
          blurCanvas.height = h;
          const blurCtx = blurCanvas.getContext("2d");
          if (blurCtx) {
            blurCtx.filter = `blur(${region.intensity}px)`;
            blurCtx.drawImage(canvas, 0, 0);
            canvasToImage(blurCanvas).then(setProcessedImage);
          }
        } else {
          const blockSize = Math.max(2, region.intensity);
          const smallW = Math.max(1, Math.ceil(w / blockSize));
          const smallH = Math.max(1, Math.ceil(h / blockSize));
          const smallCanvas = document.createElement("canvas");
          smallCanvas.width = smallW;
          smallCanvas.height = smallH;
          const smallCtx = smallCanvas.getContext("2d");
          if (smallCtx) {
            smallCtx.imageSmoothingEnabled = false;
            smallCtx.drawImage(canvas, 0, 0, smallW, smallH);
            const resultCanvas = document.createElement("canvas");
            resultCanvas.width = w;
            resultCanvas.height = h;
            const resultCtx = resultCanvas.getContext("2d");
            if (resultCtx) {
              resultCtx.imageSmoothingEnabled = false;
              resultCtx.drawImage(smallCanvas, 0, 0, w, h);
              canvasToImage(resultCanvas).then(setProcessedImage);
            }
          }
        }
      } catch {
        // Fallback: just show overlay
        setProcessedImage(null);
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [region.x, region.y, region.width, region.height, region.type, region.intensity]);

  // Attach transformer
  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleTransformEnd = () => {
    const node = groupRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onUpdate({
      x: node.x(),
      y: node.y(),
      width: Math.round(region.width * scaleX),
      height: Math.round(region.height * scaleY),
    });
  };

  return (
    <>
      <Rect
        ref={groupRef}
        x={region.x}
        y={region.y}
        width={region.width}
        height={region.height}
        fill={processedImage ? undefined : "rgba(128, 128, 128, 0.5)"}
        fillPatternImage={processedImage ?? undefined}
        stroke={isSelected ? "#6366f1" : "rgba(255,255,255,0.3)"}
        strokeWidth={isSelected ? 2 : 1}
        dash={[4, 4]}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          enabledAnchors={[
            "top-left", "top-right", "bottom-left", "bottom-right",
            "middle-left", "middle-right", "top-center", "bottom-center",
          ]}
        />
      )}
    </>
  );
}
