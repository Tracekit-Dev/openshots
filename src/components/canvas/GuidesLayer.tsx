import { Layer, Line } from "react-konva";

export interface Guide {
  lineGuide: number; // position of the line (x or y coordinate)
  orientation: "V" | "H"; // vertical or horizontal
}

interface GuidesLayerProps {
  guides: Guide[];
  canvasWidth: number;
  canvasHeight: number;
}

export default function GuidesLayer({
  guides,
  canvasWidth,
  canvasHeight,
}: GuidesLayerProps) {
  return (
    <Layer listening={false}>
      {guides.map((guide, i) => {
        if (guide.orientation === "V") {
          return (
            <Line
              key={`v-${i}`}
              points={[guide.lineGuide, 0, guide.lineGuide, canvasHeight]}
              stroke="#ef4444"
              strokeWidth={1}
              listening={false}
            />
          );
        }
        return (
          <Line
            key={`h-${i}`}
            points={[0, guide.lineGuide, canvasWidth, guide.lineGuide]}
            stroke="#ef4444"
            strokeWidth={1}
            listening={false}
          />
        );
      })}
    </Layer>
  );
}
