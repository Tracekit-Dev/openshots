// Frame definitions for window chrome and device mockups

export type FrameType = "none" | "macos" | "windows" | "iphone" | "ipad" | "macbook";
export type FrameTheme = "light" | "dark";

export interface FrameConfig {
  type: FrameType;
  theme?: FrameTheme;
}

// ---------- Window Chrome ----------

export interface WindowChromeThemeColors {
  bg: string;
  border: string;
  text: string;
}

export interface WindowChromeConfig {
  id: "macos" | "windows";
  label: string;
  titleBarHeight: number;
  borderRadius: number;
  trafficLights?: boolean;
  controlButtons?: boolean;
  themes: {
    light: WindowChromeThemeColors;
    dark: WindowChromeThemeColors;
  };
}

export const WINDOW_CHROME_FRAMES: Record<"macos" | "windows", WindowChromeConfig> = {
  macos: {
    id: "macos",
    label: "macOS",
    titleBarHeight: 28,
    borderRadius: 10,
    trafficLights: true,
    themes: {
      light: { bg: "#f6f6f6", border: "#dddddd", text: "#333333" },
      dark: { bg: "#3a3a3c", border: "#555555", text: "#e5e5e5" },
    },
  },
  windows: {
    id: "windows",
    label: "Windows",
    titleBarHeight: 32,
    borderRadius: 0,
    controlButtons: true,
    themes: {
      light: { bg: "#ffffff", border: "#e5e5e5", text: "#333333" },
      dark: { bg: "#2d2d2d", border: "#555555", text: "#e5e5e5" },
    },
  },
};

// ---------- Device Mockups ----------

export interface DeviceMockupConfig {
  id: "iphone" | "ipad" | "macbook";
  label: string;
  screenInset: { top: number; right: number; bottom: number; left: number };
  frameAspectRatio: number;
  bezelRadius: number;
  frameColor: string;
  notch?: boolean;
}

export const DEVICE_MOCKUP_FRAMES: Record<"iphone" | "ipad" | "macbook", DeviceMockupConfig> = {
  iphone: {
    id: "iphone",
    label: "iPhone",
    screenInset: { top: 0.04, right: 0.04, bottom: 0.04, left: 0.04 },
    frameAspectRatio: 9 / 19.5,
    bezelRadius: 40,
    frameColor: "#1a1a1a",
    notch: true,
  },
  ipad: {
    id: "ipad",
    label: "iPad",
    screenInset: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
    frameAspectRatio: 3 / 4,
    bezelRadius: 24,
    frameColor: "#2a2a2a",
  },
  macbook: {
    id: "macbook",
    label: "MacBook",
    screenInset: { top: 0.03, right: 0.03, bottom: 0.08, left: 0.03 },
    frameAspectRatio: 16 / 10,
    bezelRadius: 12,
    frameColor: "#333333",
  },
};

// Helper to get any frame config by type
export function getFrameConfig(type: FrameType): WindowChromeConfig | DeviceMockupConfig | null {
  if (type === "macos" || type === "windows") {
    return WINDOW_CHROME_FRAMES[type];
  }
  if (type === "iphone" || type === "ipad" || type === "macbook") {
    return DEVICE_MOCKUP_FRAMES[type];
  }
  return null;
}
