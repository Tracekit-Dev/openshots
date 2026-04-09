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
}

export type AnnotationType =
  | "arrow"
  | "rectangle"
  | "ellipse"
  | "text"
  | "emoji";

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
  strokeWidth: number;
  curvature: number;
}

export interface RectAnnotation extends AnnotationBase {
  type: "rectangle";
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface EllipseAnnotation extends AnnotationBase {
  type: "ellipse";
  radiusX: number;
  radiusY: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
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

export type AnnotationShape =
  | ArrowAnnotation
  | RectAnnotation
  | EllipseAnnotation
  | TextAnnotation
  | EmojiAnnotation;

export interface PrivacyRegion {
  id: string;
  type: "blur" | "pixelate";
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
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
