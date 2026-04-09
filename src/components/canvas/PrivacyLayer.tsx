import { Layer, Rect, Transformer } from "react-konva";
import { useCanvasStore, type PrivacyRegion } from "../../stores/canvas.store";
import Konva from "konva";
import { useRef, useEffect } from "react";

/**
 * Renders privacy blur/pixelate regions as simple overlay rectangles.
 * Blur = frosted white overlay. Pixelate = darker overlay.
 * Actual processing happens at export time.
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
  const rectRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && rectRef.current) {
      trRef.current.nodes([rectRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleTransformEnd = () => {
    const node = rectRef.current;
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

  const opacity = region.opacity ?? 1;

  return (
    <>
      <Rect
        ref={rectRef}
        x={region.x}
        y={region.y}
        width={region.width}
        height={region.height}
        fill={region.fill || (region.type === "blur" ? "#d4d4d4" : "#a3a3a3")}
        opacity={opacity}
        cornerRadius={2}
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
          borderEnabled={false}
          borderStroke="transparent"
          borderStrokeWidth={0}
          anchorStroke="rgba(255,255,255,0.5)"
          anchorFill="rgba(30,30,30,0.9)"
          anchorSize={8}
          anchorCornerRadius={2}
          ignoreStroke
          padding={0}
          enabledAnchors={[
            "top-left", "top-right", "bottom-left", "bottom-right",
            "middle-left", "middle-right", "top-center", "bottom-center",
          ]}
        />
      )}
    </>
  );
}
