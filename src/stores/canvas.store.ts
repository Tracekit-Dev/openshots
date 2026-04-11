import { create } from "zustand";
import { temporal } from "zundo";

// ---------- Types ----------

export interface CanvasImage {
  id: string;
  src: string; // asset:// URL or data URL
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth?: number;   // original image dimensions (for padding contain-fit)
  naturalHeight?: number;
  userResized?: boolean;   // true if user manually resized via Transformer
  rotation: number;
  cornerRadius: number;
  flipX: boolean;
  flipY: boolean;
  shadow: {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  insetBorder: {
    enabled: boolean;
    color: string;
    width: number;
  };
  frame?: {
    type: "window-chrome" | "device-mockup";
    variant: string;
    theme?: "light" | "dark";
  };
}

export type AnnotationType =
  | "arrow"
  | "rectangle"
  | "ellipse"
  | "text"
  | "emoji"
  | "callout"
  | "speech-bubble"
  | "spotlight";

export interface AnnotationBase {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  rotation: number;
}

export interface ArrowAnnotation extends AnnotationBase {
  type: "arrow";
  points: number[];
  stroke: string;
  fill?: string;
  strokeWidth: number;
  curvature: number;
  dash?: number[];
}

export interface RectAnnotation extends AnnotationBase {
  type: "rectangle";
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  dash?: number[];
}

export interface EllipseAnnotation extends AnnotationBase {
  type: "ellipse";
  radiusX: number;
  radiusY: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  dash?: number[];
}

export interface TextAnnotation extends AnnotationBase {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
}

export interface EmojiAnnotation extends AnnotationBase {
  type: "emoji";
  emoji: string;
  fontSize: number;
}

export interface CalloutAnnotation extends AnnotationBase {
  type: "callout";
  number: number;
  fill: string;
  textColor: string;
}

export interface SpeechBubbleAnnotation extends AnnotationBase {
  type: "speech-bubble";
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  textColor: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  tailDirection: "bottom" | "top" | "left" | "right";
  tailSize: number;
}

export interface SpotlightAnnotation extends AnnotationBase {
  type: "spotlight";
  width: number;
  height: number;
  cornerRadius: number;
  overlayOpacity: number;
  overlayColor: string;
}

export type AnnotationShape =
  | ArrowAnnotation
  | RectAnnotation
  | EllipseAnnotation
  | TextAnnotation
  | EmojiAnnotation
  | CalloutAnnotation
  | SpeechBubbleAnnotation
  | SpotlightAnnotation;

export interface PrivacyRegion {
  id: string;
  type: "blur" | "pixelate";
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
  opacity: number; // 0-1
  fill: string;
}

export interface CanvasBackground {
  type: "solid" | "linear-gradient" | "radial-gradient" | "image";
  color: string;
  gradientColors: [string, string];
  gradientAngle: number;
  imageSrc: string | null;
  blur: number;
  grain: number;
}

export interface CanvasState {
  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;

  // Padding around images
  padding: number;

  // Background
  background: CanvasBackground;

  // Images on canvas
  images: CanvasImage[];

  // Annotations
  annotations: AnnotationShape[];

  // Privacy regions
  privacyRegions: PrivacyRegion[];

  // Selection (excluded from undo via partialize)
  selectedId: string | null;
}

interface CanvasActions {
  // Canvas
  setCanvasSize: (width: number, height: number) => void;
  setPadding: (padding: number) => void;

  // Background
  setBackground: (bg: Partial<CanvasBackground>) => void;

  // Images
  addImage: (image: CanvasImage) => void;
  updateImage: (id: string, updates: Partial<CanvasImage>) => void;
  removeImage: (id: string) => void;

  // Annotations
  addAnnotation: (annotation: AnnotationShape) => void;
  updateAnnotation: (id: string, updates: Partial<AnnotationShape>) => void;
  removeAnnotation: (id: string) => void;

  // Privacy
  addPrivacyRegion: (region: PrivacyRegion) => void;
  updatePrivacyRegion: (id: string, updates: Partial<PrivacyRegion>) => void;
  removePrivacyRegion: (id: string) => void;

  // Z-ordering
  reorderElement: (id: string, direction: "front" | "back" | "forward" | "backward") => void;

  // Selection
  setSelectedId: (id: string | null) => void;

  // Bulk
  removeSelected: () => void;
}

const DEFAULT_BACKGROUND: CanvasBackground = {
  type: "linear-gradient",
  color: "#0f172a",
  gradientColors: ["#0f172a", "#1e293b"],
  gradientAngle: 135,
  imageSrc: null,
  blur: 0,
  grain: 0,
};

export const useCanvasStore = create<CanvasState & CanvasActions>()(
  temporal(
    (set) => ({
      canvasWidth: 1920,
      canvasHeight: 1080,
      padding: 64,
      background: DEFAULT_BACKGROUND,
      images: [],
      annotations: [],
      privacyRegions: [],
      selectedId: null,

      setCanvasSize: (width, height) => set({ canvasWidth: width, canvasHeight: height }),
      setPadding: (padding) => set({ padding }),

      setBackground: (bg) =>
        set((s) => ({ background: { ...s.background, ...bg } })),

      addImage: (image) => set((s) => ({ images: [...s.images, image] })),
      updateImage: (id, updates) =>
        set((s) => ({
          images: s.images.map((img) =>
            img.id === id ? { ...img, ...updates } : img,
          ),
        })),
      removeImage: (id) =>
        set((s) => ({
          images: s.images.filter((img) => img.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

      addAnnotation: (annotation) =>
        set((s) => ({ annotations: [...s.annotations, annotation] })),
      updateAnnotation: (id, updates) =>
        set((s) => ({
          annotations: s.annotations.map((a) =>
            a.id === id ? ({ ...a, ...updates } as AnnotationShape) : a,
          ),
        })),
      removeAnnotation: (id) =>
        set((s) => ({
          annotations: s.annotations.filter((a) => a.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

      addPrivacyRegion: (region) =>
        set((s) => ({ privacyRegions: [...s.privacyRegions, region] })),
      updatePrivacyRegion: (id, updates) =>
        set((s) => ({
          privacyRegions: s.privacyRegions.map((r) =>
            r.id === id ? { ...r, ...updates } : r,
          ),
        })),
      removePrivacyRegion: (id) =>
        set((s) => ({
          privacyRegions: s.privacyRegions.filter((r) => r.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

      reorderElement: (id, direction) =>
        set((s) => {
          const reorder = <T extends { id: string }>(arr: T[]): T[] => {
            const idx = arr.findIndex((item) => item.id === id);
            if (idx === -1) return arr;
            const next = [...arr];
            const item = next.splice(idx, 1)[0] as T;
            switch (direction) {
              case "front":
                next.push(item);
                break;
              case "back":
                next.unshift(item);
                break;
              case "forward":
                if (idx < arr.length - 1) {
                  next.splice(idx + 1, 0, item);
                } else {
                  next.push(item);
                }
                break;
              case "backward":
                if (idx > 0) {
                  next.splice(idx - 1, 0, item);
                } else {
                  next.unshift(item);
                }
                break;
            }
            return next;
          };

          if (s.images.some((img) => img.id === id)) {
            return { images: reorder(s.images) };
          }
          if (s.annotations.some((a) => a.id === id)) {
            return { annotations: reorder(s.annotations) };
          }
          if (s.privacyRegions.some((r) => r.id === id)) {
            return { privacyRegions: reorder(s.privacyRegions) };
          }
          return s;
        }),

      setSelectedId: (id) => set({ selectedId: id }),

      removeSelected: () =>
        set((s) => {
          if (!s.selectedId) return s;
          return {
            images: s.images.filter((i) => i.id !== s.selectedId),
            annotations: s.annotations.filter((a) => a.id !== s.selectedId),
            privacyRegions: s.privacyRegions.filter(
              (r) => r.id !== s.selectedId,
            ),
            selectedId: null,
          };
        }),
    }),
    {
      // Only include data fields in undo history — exclude selectedId and all action functions
      partialize: (state) => ({
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        padding: state.padding,
        background: state.background,
        images: state.images,
        annotations: state.annotations,
        privacyRegions: state.privacyRegions,
      }),
      limit: 50,
    },
  ),
);

export const useTemporalStore = () => useCanvasStore.temporal.getState();
