import type { ReactNode } from "react";
import { Group, Rect } from "react-konva";
import type { DeviceMockupConfig } from "./frames";

interface DeviceMockupProps {
  config: DeviceMockupConfig;
  width: number;  // screenshot content width
  height: number; // screenshot content height
  children?: ReactNode;
}

/**
 * Renders a device frame (iPhone, iPad, MacBook) around screenshot content.
 * Children (the image content) are positioned at the screen inset offsets.
 */
export function DeviceMockup({ config, width, height, children }: DeviceMockupProps) {
  const { screenInset, bezelRadius, frameColor, notch } = config;

  // Calculate total frame dimensions from content size and insets
  const totalW = width / (1 - screenInset.left - screenInset.right);
  const totalH = height / (1 - screenInset.top - screenInset.bottom);

  const insetLeft = Math.round(totalW * screenInset.left);
  const insetTop = Math.round(totalH * screenInset.top);

  // Notch dimensions (iPhone)
  const notchWidth = Math.round(totalW * 0.3);
  const notchHeight = Math.round(totalH * 0.03);

  // MacBook chin area
  const isMacbook = config.id === "macbook";
  const chinHeight = isMacbook ? Math.round(totalH * screenInset.bottom) : 0;
  const cameraSize = 4;

  return (
    <Group>
      {/* Device body */}
      <Rect
        x={0}
        y={0}
        width={totalW}
        height={totalH}
        fill={frameColor}
        cornerRadius={bezelRadius}
        listening={false}
      />

      {/* Screen area background (slightly lighter to show screen boundary) */}
      <Rect
        x={insetLeft}
        y={insetTop}
        width={width}
        height={height}
        fill="#000000"
        listening={false}
      />

      {/* iPhone notch */}
      {notch && (
        <Rect
          x={Math.round((totalW - notchWidth) / 2)}
          y={0}
          width={notchWidth}
          height={notchHeight}
          fill={frameColor}
          cornerRadius={[0, 0, 8, 8]}
          listening={false}
        />
      )}

      {/* MacBook chin with camera dot */}
      {isMacbook && (
        <>
          <Rect
            x={0}
            y={totalH - chinHeight}
            width={totalW}
            height={chinHeight}
            fill={frameColor}
            cornerRadius={[0, 0, bezelRadius, bezelRadius]}
            listening={false}
          />
          {/* Camera dot at top center */}
          <Rect
            x={Math.round((totalW - cameraSize) / 2)}
            y={Math.round(insetTop * 0.3)}
            width={cameraSize}
            height={cameraSize}
            fill="#555555"
            cornerRadius={cameraSize / 2}
            listening={false}
          />
        </>
      )}

      {/* Children (image content) rendered at inset position */}
      {children}
    </Group>
  );
}
