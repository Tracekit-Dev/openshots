import { Layer, Rect } from "react-konva";
import { useCanvasStore } from "../../stores/canvas.store";
import Konva from "konva";
import { useRef, useEffect } from "react";

/**
 * Renders privacy blur/pixelate regions as overlay rectangles.
 * Uses Konva Filters for live preview. Final export uses Rust-side processing.
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
  region: { id: string; type: "blur" | "pixelate"; x: number; y: number; width: number; height: number; intensity: number };
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<typeof region>) => void;
}) {
  const rectRef = useRef<Konva.Rect>(null);

  useEffect(() => {
    const node = rectRef.current;
    if (!node) return;
    if (region.type === "blur") {
      node.filters([Konva.Filters.Blur]);
      node.blurRadius(region.intensity);
    } else {
      node.filters([Konva.Filters.Pixelate]);
      node.pixelSize(Math.max(2, region.intensity));
    }
    node.cache();
  }, [region.type, region.intensity, region.width, region.height]);

  return (
    <Rect
      ref={rectRef}
      x={region.x}
      y={region.y}
      width={region.width}
      height={region.height}
      fill={`rgba(128, 128, 128, 0.3)`}
      stroke={isSelected ? "#6366f1" : "rgba(255,255,255,0.2)"}
      strokeWidth={isSelected ? 2 : 1}
      dash={[4, 4]}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onUpdate({ x: e.target.x(), y: e.target.y() })}
    />
  );
}
