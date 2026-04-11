import { Group, Rect, Circle, Line, Text } from "react-konva";
import type { WindowChromeConfig, FrameTheme } from "./frames";

interface WindowChromeProps {
  config: WindowChromeConfig;
  theme: FrameTheme;
  width: number;
  height: number;
}

/**
 * Renders macOS or Windows window chrome (title bar) above screenshot content.
 * The title bar occupies (0,0) to (width, titleBarHeight).
 * The image content should be rendered below at y = titleBarHeight.
 */
export function WindowChrome({ config, theme, width }: WindowChromeProps) {
  const colors = config.themes[theme];
  const { titleBarHeight, borderRadius } = config;

  return (
    <Group>
      {/* Title bar background */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={titleBarHeight}
        fill={colors.bg}
        cornerRadius={[borderRadius, borderRadius, 0, 0]}
      />

      {/* Bottom border line */}
      <Line
        points={[0, titleBarHeight, width, titleBarHeight]}
        stroke={colors.border}
        strokeWidth={1}
      />

      {/* macOS traffic lights */}
      {config.trafficLights && (
        <>
          <Circle x={12 + 6} y={titleBarHeight / 2} radius={6} fill="#ff5f57" />
          <Circle x={12 + 6 + 20} y={titleBarHeight / 2} radius={6} fill="#febc2e" />
          <Circle x={12 + 6 + 40} y={titleBarHeight / 2} radius={6} fill="#28c840" />
        </>
      )}

      {/* Windows control buttons (minimize, maximize, close) */}
      {config.controlButtons && (
        <>
          {/* Minimize: horizontal line */}
          <Line
            points={[width - 138, titleBarHeight / 2, width - 126, titleBarHeight / 2]}
            stroke={colors.text}
            strokeWidth={1}
          />
          {/* Maximize: square outline */}
          <Rect
            x={width - 96}
            y={titleBarHeight / 2 - 5}
            width={10}
            height={10}
            stroke={colors.text}
            strokeWidth={1}
          />
          {/* Close: X */}
          <Text
            x={width - 52}
            y={titleBarHeight / 2 - 7}
            text="\u00D7"
            fontSize={16}
            fill={colors.text}
            fontFamily="sans-serif"
          />
        </>
      )}
    </Group>
  );
}
