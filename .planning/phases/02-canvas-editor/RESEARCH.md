# Phase 2: Canvas Editor and Beautification — Research

**Researched:** 2026-04-09
**Domain:** React-Konva layered canvas editor, Zustand+zundo state, background system, annotation tools, privacy tools, background removal
**Confidence:** HIGH (core Konva/react-konva patterns from official docs), MEDIUM (background removal via Transformers.js — single-source verification), HIGH (Zustand/zundo from official docs)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CANV-01 | User can drag and drop images onto the canvas | Konva draggable prop + Stage onDrop handler |
| CANV-02 | User can import images via file picker | tauri-plugin-dialog openFile → convertFileSrc |
| CANV-03 | User can place multiple images on the canvas simultaneously | Multiple KonvaImage nodes in ScreenshotLayer |
| CANV-04 | User can freely position, scale, and rotate images | Konva Transformer + draggable + onTransformEnd |
| CANV-05 | User can see snap guides when aligning elements | Konva Line guide algorithm with dragmove event |
| CANV-06 | User can auto-arrange multiple images in a fan layout | Custom fan layout algorithm: rotate + offset per image |
| CANV-07 | User can undo and redo any canvas action | zundo temporal middleware on canvas.store |
| CANV-08 | User can select a canvas aspect ratio preset | Canvas store width/height driven by preset lookup table |
| BG-01 | Apply gradient background (linear/radial) | Konva Rect fillLinearGradient / fillRadialGradient props |
| BG-02 | Apply solid color background | Konva Rect fill prop on BackgroundLayer |
| BG-03 | Upload and apply custom image background | useImage hook + Konva Image on BackgroundLayer |
| BG-04 | Color picker for backgrounds | shadcn/ui + native `<input type="color">` or react-colorful |
| BG-05 | Blur effect on background | Konva Filters.Blur + cache() on background image node |
| BG-06 | Grain/noise texture on background | Konva Filters.Noise on cached Rect or overlay Rect |
| STYL-01 | Adjust padding around screenshot | Group offset + stage background Rect sizing math |
| STYL-02 | Rounded corners on embedded screenshots | Konva Image cornerRadius prop (v10 native support) |
| STYL-03 | Even drop shadow on screenshots | Konva shadowBlur + shadowColor + shadowOpacity props |
| STYL-04 | Directional drop shadow with angle/intensity | Konva shadowOffsetX/Y + shadowBlur + shadowOpacity |
| STYL-05 | Auto color-matched inset border | colorthief dominant color extraction + Konva Rect stroke |
| ANNO-01 | Arrows with curvature and thickness | Konva Arrow shape: points, tension, pointerLength/Width |
| ANNO-02 | Rectangles with fill, stroke, cornerRadius | Konva Rect shape props |
| ANNO-03 | Ellipses with fill and stroke | Konva Ellipse shape props |
| ANNO-04 | Text labels with font, size, color, shadow, outline | Konva Text shape + stroke for outline |
| ANNO-05 | Emoji stickers on canvas | Konva Text with emoji character OR HTMLImageElement |
| ANNO-06 | Select, move, resize, delete any annotation | Konva Transformer + DEL key handler |
| PRIV-01 | Blur a selected region with adjustable intensity | IPC → Rust imageproc Gaussian blur on region pixels |
| PRIV-02 | Pixelate a selected region | IPC → Rust pixel-averaging on region |
| PRIV-03 | Background removal on-device AI | Transformers.js RMBG-1.4 in Web Worker → alpha PNG |
| EDIT-01 | Crop screenshot with interactive overlay | Konva Rect crop overlay + Konva Image crop prop |
| EDIT-02 | Flip image horizontally | Konva scaleX(-1) on Image node |
| EDIT-03 | Flip image vertically | Konva scaleY(-1) on Image node |
| KEYS-01 | All common actions via keyboard shortcuts | tinykeys bound in useHotkeys hook |
| KEYS-02 | View list of available keyboard shortcuts | Modal/dialog driven by shortcut registry object |
</phase_requirements>

---

## Summary

Phase 2 builds the entire editing surface of the app — 33 requirements spanning canvas management, background styling, image decoration, annotation tools, privacy tools, and keyboard shortcuts. The technology decisions are already locked: react-konva (Konva.js v10) for canvas rendering and Zustand with zundo for state and undo/redo.

The central architecture is a layered Konva Stage with four discrete layers (background, screenshots, annotations, UI/guides). Each layer renders independently, which is the key performance pattern from the Konva documentation and from Excalidraw's architecture. Static layers (background) use `node.cache()` and `layer.listening(false)` to avoid unnecessary redraws. The annotation layer re-renders on every edit and handles pointer events.

Undo/redo uses zundo's `temporal` middleware wrapping only the canvas store. The store must hold serializable structural state only — image file paths and transform parameters, not pixel blobs. This prevents the undo stack from exhausting memory with large screenshots.

The most technically complex items are: (1) privacy tools (blur/pixelate regions) which require Rust-side pixel processing via IPC, (2) background removal which requires a Transformers.js Web Worker running RMBG-1.4, and (3) snap guides which require computing all snap edges at drag start. All other features map directly to documented Konva shape props and filters.

**Primary recommendation:** Build in layer order — BackgroundLayer first (gradients, solid, blur/noise), then ScreenshotLayer (image placement, padding, shadow, border, rounded corners, crop/flip), then AnnotationLayer (shapes, arrows, text, emoji, Transformer), then PrivacyLayer (blur/pixelate overlaid as processed image replacements). Wire undo/redo and keyboard shortcuts last, spanning all layers.

---

## Project Constraints (from CLAUDE.md)

| Directive | Source | Applies To |
|-----------|--------|------------|
| Tech stack: Tauri 2.x + React + TypeScript — non-negotiable | CLAUDE.md | All Phase 2 code |
| Offline: No network calls for core features | CLAUDE.md | Background removal must use on-device AI |
| Performance: Image operations <100ms for common operations | CLAUDE.md | Filters, transforms, shadow calculations |
| Binary size: Target <20MB installer | CLAUDE.md | Background removal model must NOT be bundled |
| Use GSD workflow entry points for all file changes | CLAUDE.md | Execution process |
| No direct repo edits outside GSD workflow | CLAUDE.md | Execution process |

---

## Standard Stack

### Core Canvas Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| konva | 10.2.3 | 2D canvas scene graph, shapes, transforms, hit testing | [VERIFIED: npm registry, 2026-03-16] Built for interactive editors. v10 is current stable — ESM-only, faster init (6x), native CSS filters. |
| react-konva | 19.2.3 | React bindings for Konva | [VERIFIED: npm registry] Version prefix matches React major. Declarative Stage/Layer/Shape components. |
| use-image | 1.1.4 | Custom React hook to load images for Konva | [VERIFIED: npm registry, 2025-05-25] Official Konva companion hook; handles crossOrigin and loading state. |

### State and History

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.12 | Canvas store, tool store, app state | [VERIFIED: npm registry] Already installed. Single-store model. |
| zundo | 2.3.0 | Undo/redo temporal middleware for Zustand | [VERIFIED: npm registry] <700 bytes. Official Zustand undo pattern. `temporal` wrapper provides undo/redo/clear/pastStates/futureStates. |

### Annotation and Color

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| colorthief | 3.3.1 | Extract dominant color from image for auto-matched border | [VERIFIED: npm registry] Pure JS, canvas-based, works with HTMLImageElement. Used for STYL-05. |
| tinykeys | 3.0.0 | In-app keyboard shortcut binding | [VERIFIED: npm registry] Zero-dependency, <1KB. Works with useEffect cleanup pattern. |

### AI / Background Removal

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @huggingface/transformers | 4.0.1 | RMBG-1.4 on-device background removal in Web Worker | [VERIFIED: npm registry] v4 (not v3 as previously assumed — see Assumptions Log A1). WebGPU + WASM fallback. |

### Supporting UI

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui (existing) | latest | Sliders, dialogs, tooltips for tool panels | Already decided. Use for all panel UI controls. |
| @tauri-apps/plugin-dialog | 2.x | File open dialog for image import (CANV-02, BG-03) | Official plugin — use for file picker. |

### Installation (new packages for Phase 2)

```bash
npm install konva react-konva use-image
npm install zundo
npm install colorthief
npm install tinykeys
npm install @huggingface/transformers
npm install @tauri-apps/plugin-dialog
```

**Version verification (run before installing):**
```bash
npm view konva version          # Expected: 10.2.3
npm view react-konva version    # Expected: 19.2.3
npm view use-image version      # Expected: 1.1.4
npm view zundo version          # Expected: 2.3.0
npm view colorthief version     # Expected: 3.3.1
npm view tinykeys version       # Expected: 3.0.0
npm view @huggingface/transformers version  # Expected: 4.0.1
```

**Konva v10 breaking changes (critical):** [VERIFIED: Konva CHANGELOG]
- Fully ESM — no `require('konva')` in CommonJS; Vite handles this transparently
- Node.js canvas support dropped by default (doesn't affect browser/Tauri)
- Text rendering changed: if pixel-perfect text positioning matters, set `Konva.legacyTextRendering = true`
- Native CSS filters now available: `node.filters(['blur(10px)'])` — but use Konva's functional filters for canvas export compatibility

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
src/
├── components/
│   ├── canvas/
│   │   ├── CanvasStage.tsx          # Root Stage, DPR handling, resize observer
│   │   ├── BackgroundLayer.tsx      # Gradient/solid/image bg, blur, noise
│   │   ├── ScreenshotLayer.tsx      # Image nodes, padding groups, shadow, border, rounded corners
│   │   ├── AnnotationLayer.tsx      # Arrow, Rect, Ellipse, Text, Emoji nodes + Transformer
│   │   ├── GuideLayer.tsx           # Snap guide lines (listening=false, non-interactive)
│   │   ├── SelectionOverlay.tsx     # Crop/privacy region selection rect
│   │   └── nodes/
│   │       ├── ScreenshotNode.tsx   # Single image: position, scale, rotate, shadow, border, crop
│   │       ├── ArrowNode.tsx        # Konva Arrow: tension, pointerLength, stroke
│   │       ├── RectNode.tsx         # Konva Rect: fill, stroke, cornerRadius
│   │       ├── EllipseNode.tsx      # Konva Ellipse: fill, stroke
│   │       ├── TextNode.tsx         # Konva Text: font, size, color, outline
│   │       └── EmojiNode.tsx        # Konva Text (emoji char) or Image
│   ├── toolbar/
│   │   ├── ToolPalette.tsx          # Tool mode switcher (select, arrow, rect, ellipse, text, blur, pixelate)
│   │   └── ShortcutsModal.tsx       # KEYS-02: shortcut reference list
│   └── panels/
│       ├── BackgroundPanel.tsx      # BG-01 to BG-06 controls
│       ├── StylePanel.tsx           # STYL-01 to STYL-05 controls
│       ├── AnnotationPanel.tsx      # Per-annotation property controls
│       └── AspectRatioPanel.tsx     # CANV-08 preset picker
├── stores/
│   ├── canvas.store.ts              # Canvas elements, layout, background — wrapped with zundo
│   ├── tool.store.ts                # Active tool, tool options — NOT in zundo history
│   └── app.store.ts                 # Existing — add lastCaptureUrl
├── hooks/
│   ├── useHotkeys.ts                # tinykeys bindings (undo, redo, delete, tool switches)
│   ├── useSnapGuides.ts             # Snap guide computation during drag
│   ├── useFanLayout.ts              # Auto fan-arrange multiple images
│   └── useBackgroundRemoval.ts      # Manages Web Worker lifecycle for RMBG
├── workers/
│   └── backgroundRemoval.worker.ts  # Transformers.js RMBG-1.4 inference
├── ipc/
│   ├── imageProcessing.ts           # blur_region, pixelate_region IPC wrappers
│   └── fileDialog.ts                # open_file dialog wrapper
└── lib/
    ├── colorAnalysis.ts             # colorthief wrapper → dominant color → border color
    ├── fanLayout.ts                 # Fan layout math: positions, rotations per image
    └── aspectRatios.ts              # Preset table: { label, width, height } []
```

### Pattern 1: Four-Layer Konva Stage

The stage has four Konva `Layer` nodes in z-order bottom to top. Each layer has a single responsibility and distinct update cadence.

```typescript
// Source: konvajs.org/docs/react/index.html + ARCHITECTURE.md pattern
// CanvasStage.tsx
const dpr = window.devicePixelRatio || 1;

<Stage
  width={canvasWidth}
  height={canvasHeight}
  scaleX={1 / dpr}   // compensate for DPR scaling applied to canvas element
  scaleY={1 / dpr}
  ref={stageRef}
>
  {/* Layer 1: Background — re-renders only on bg property change */}
  <BackgroundLayer />

  {/* Layer 2: Screenshots — re-renders on image transform or style change */}
  <ScreenshotLayer />

  {/* Layer 3: Annotations — re-renders on every annotation edit */}
  <AnnotationLayer />

  {/* Layer 4: Snap guides — ephemeral, no listening needed */}
  <Layer listening={false}>
    <GuideLines />
  </Layer>
</Stage>
```

**DPR handling:** Set the canvas physical size via Konva's `pixelRatio` prop on Stage. [VERIFIED: konvajs.org pitfalls + PITFALLS.md]

```typescript
// Correct DPR approach for Konva (different from raw canvas approach)
<Stage
  width={cssWidth}
  height={cssHeight}
  // Konva handles DPR internally when pixelRatio is set
  // Default: window.devicePixelRatio — no override needed in react-konva
/>
// Note: react-konva reads window.devicePixelRatio by default for the backing store.
// Do NOT manually divide stage dimensions by DPR; let Konva handle it.
```

### Pattern 2: Canvas Store Shape (Serializable State Only)

The canvas store must store only JSON-serializable state. Images are stored as file paths or object URLs, not as `HTMLImageElement` or `Blob`. [VERIFIED: ARCHITECTURE.md + PITFALLS.md]

```typescript
// canvas.store.ts
import { create } from 'zustand';
import { temporal } from 'zundo';

export type ToolMode =
  | 'select' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'emoji'
  | 'blur-region' | 'pixelate-region' | 'crop';

export interface CanvasImage {
  id: string;
  src: string;          // file:// path via convertFileSrc — serializable
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  cornerRadius: number;
  shadowBlur: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowOpacity: number;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  crop?: { x: number; y: number; width: number; height: number };
}

export type AnnotationShape =
  | { kind: 'arrow'; id: string; points: number[]; tension: number; stroke: string; strokeWidth: number; pointerLength: number; pointerWidth: number }
  | { kind: 'rect';  id: string; x: number; y: number; width: number; height: number; fill: string; stroke: string; strokeWidth: number; cornerRadius: number; rotation: number }
  | { kind: 'ellipse'; id: string; x: number; y: number; radiusX: number; radiusY: number; fill: string; stroke: string; strokeWidth: number; rotation: number }
  | { kind: 'text';  id: string; x: number; y: number; text: string; fontSize: number; fontFamily: string; fill: string; stroke: string; strokeWidth: number; rotation: number }
  | { kind: 'emoji'; id: string; x: number; y: number; emoji: string; fontSize: number; rotation: number };

export interface CanvasBackground {
  type: 'solid' | 'linear-gradient' | 'radial-gradient' | 'image';
  // solid
  color?: string;
  // gradient
  gradientStops?: Array<{ offset: number; color: string }>;
  gradientAngle?: number;   // degrees → converted to start/end points
  // image
  imageSrc?: string;
  blurRadius?: number;      // BG-05
  noiseAmount?: number;     // BG-06: 0–1
}

export interface CanvasState {
  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;
  aspectRatioPreset: string;  // e.g. '16:9', '1:1', 'custom'

  // Content
  images: CanvasImage[];
  annotations: AnnotationShape[];
  selectedId: string | null;

  // Background
  background: CanvasBackground;

  // Actions
  setCanvasSize: (w: number, h: number, preset: string) => void;
  addImage: (img: CanvasImage) => void;
  updateImage: (id: string, patch: Partial<CanvasImage>) => void;
  removeImage: (id: string) => void;
  addAnnotation: (ann: AnnotationShape) => void;
  updateAnnotation: (id: string, patch: Partial<AnnotationShape>) => void;
  removeAnnotation: (id: string) => void;
  setSelected: (id: string | null) => void;
  setBackground: (bg: Partial<CanvasBackground>) => void;
}

export const useCanvasStore = create<CanvasState>()(
  temporal(
    (set) => ({
      canvasWidth: 1200,
      canvasHeight: 675,
      aspectRatioPreset: '16:9',
      images: [],
      annotations: [],
      selectedId: null,
      background: { type: 'linear-gradient', gradientStops: [{ offset: 0, color: '#667eea' }, { offset: 1, color: '#764ba2' }], gradientAngle: 135 },

      setCanvasSize: (w, h, preset) => set({ canvasWidth: w, canvasHeight: h, aspectRatioPreset: preset }),
      addImage: (img) => set((s) => ({ images: [...s.images, img] })),
      updateImage: (id, patch) => set((s) => ({ images: s.images.map((i) => i.id === id ? { ...i, ...patch } : i) })),
      removeImage: (id) => set((s) => ({ images: s.images.filter((i) => i.id !== id) })),
      addAnnotation: (ann) => set((s) => ({ annotations: [...s.annotations, ann] })),
      updateAnnotation: (id, patch) => set((s) => ({ annotations: s.annotations.map((a) => a.id === id ? { ...a, ...patch } as AnnotationShape : a) })),
      removeAnnotation: (id) => set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) })),
      setSelected: (id) => set({ selectedId: id }),
      setBackground: (bg) => set((s) => ({ background: { ...s.background, ...bg } })),
    }),
    {
      limit: 100,
      // Exclude selectedId from undo history — selection is not an undoable action
      partialize: (state) => {
        const { selectedId, ...rest } = state;
        return rest;
      },
    }
  )
);

// Undo/redo access
export const useTemporalStore = (selector: (state: ReturnType<typeof useCanvasStore.temporal.getState>) => unknown) =>
  useCanvasStore.temporal(selector as never);
```

### Pattern 3: Background Layer — Gradients, Solid, Image, Blur, Noise

```typescript
// Source: konvajs.org/docs/styling/Fill.html [VERIFIED], konvajs.org/docs/filters/Blur.html [VERIFIED]
// BackgroundLayer.tsx
import { Layer, Rect, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';

// Linear gradient angle → Konva start/end points
function angleToPoints(angle: number, w: number, h: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    start: { x: w / 2 - Math.cos(rad) * w / 2, y: h / 2 - Math.sin(rad) * h / 2 },
    end:   { x: w / 2 + Math.cos(rad) * w / 2, y: h / 2 + Math.sin(rad) * h / 2 },
  };
}

// Gradient Rect props from CanvasBackground
function gradientProps(bg: CanvasBackground, w: number, h: number) {
  const stops = bg.gradientStops!.flatMap(({ offset, color }) => [offset, color]);
  if (bg.type === 'linear-gradient') {
    const { start, end } = angleToPoints(bg.gradientAngle ?? 135, w, h);
    return {
      fillLinearGradientStartPoint: start,
      fillLinearGradientEndPoint: end,
      fillLinearGradientColorStops: stops,
    };
  }
  // radial-gradient
  return {
    fillRadialGradientStartPoint: { x: w / 2, y: h / 2 },
    fillRadialGradientStartRadius: 0,
    fillRadialGradientEndPoint: { x: w / 2, y: h / 2 },
    fillRadialGradientEndRadius: Math.max(w, h) / 2,
    fillRadialGradientColorStops: stops,
  };
}
```

**Noise/grain for BG-06:** Use `Konva.Filters.Noise` on a cached transparent Rect overlay.

```typescript
// Noise overlay — separate Rect with Noise filter on top of background
const noiseRef = useRef<Konva.Rect>(null);
useEffect(() => {
  if (noiseRef.current && bg.noiseAmount && bg.noiseAmount > 0) {
    noiseRef.current.cache();
    noiseRef.current.filters([Konva.Filters.Noise]);
    noiseRef.current.noise(bg.noiseAmount);  // 0–1
  }
}, [bg.noiseAmount, w, h]);

<Rect ref={noiseRef} width={w} height={h} fill="transparent" opacity={0.4} />
```

### Pattern 4: Screenshot Node — Shadow, Rounded Corners, Inset Border, Padding, Crop, Flip

```typescript
// Source: konvajs.org/api/Konva.Image.html [VERIFIED], konvajs.org/api/Konva.Shape.html [VERIFIED]
// ScreenshotNode.tsx — one per image in the canvas.store.images array

// Rounded corners + shadow + flip directly on Konva Image node:
<Image
  ref={shapeRef}
  image={htmlImage}           // from useImage hook
  x={img.x}
  y={img.y}
  width={img.width}
  height={img.height}
  rotation={img.rotation}
  scaleX={img.scaleX}         // -1 to flip horizontally (EDIT-02)
  scaleY={img.scaleY}         // -1 to flip vertically (EDIT-03)
  cornerRadius={img.cornerRadius}  // STYL-02 — Konva Image supports this natively
  shadowBlur={img.shadowBlur}      // STYL-03/STYL-04
  shadowColor={img.shadowColor}
  shadowOffsetX={img.shadowOffsetX}
  shadowOffsetY={img.shadowOffsetY}
  shadowOpacity={img.shadowOpacity}
  crop={img.crop}             // EDIT-01 — { x, y, width, height } in source pixel coords
  draggable={isSelected && activeTool === 'select'}
  onClick={() => setSelected(img.id)}
  onTransformEnd={handleTransformEnd}
/>
```

**Inset border (STYL-05):** Use a separate Konva Rect with `stroke` derived from dominant color:

```typescript
// Source: colorthief npm docs [VERIFIED: npm registry]
// lib/colorAnalysis.ts
import ColorThief from 'colorthief';

export async function getDominantColor(imageElement: HTMLImageElement): Promise<string> {
  const thief = new ColorThief();
  const [r, g, b] = thief.getColor(imageElement);
  return `rgb(${r}, ${g}, ${b})`;
}

// In ScreenshotNode.tsx — inset border drawn as sibling Rect with no fill
<Rect
  x={img.x}
  y={img.y}
  width={img.width}
  height={img.height}
  cornerRadius={img.cornerRadius}
  stroke={img.strokeColor}   // set by colorAnalysis when STYL-05 is toggled
  strokeWidth={img.strokeWidth}
  listening={false}           // inset border is not interactive
/>
```

**Padding (STYL-01):** Padding is implemented as canvas background expansion — the image stays the same size, but the canvas background Rect grows around it. This is simpler than Group clipping and more intuitive for multi-image layouts:

```typescript
// Padding changes the gap between image edge and canvas edge, not image size
// In canvas.store: paddingTop/Right/Bottom/Left values affect image positioning math
// Image x = paddingLeft, image y = paddingTop (for single image centered layout)
```

### Pattern 5: Annotation Tools — Drawing Mode + Transformer

```typescript
// Source: konvajs.org/docs/react/Free_Drawing.html [VERIFIED], konvajs.org/docs/react/Transformer.html [VERIFIED]

// tool.store.ts — NOT in zundo history (ephemeral)
interface ToolState {
  activeTool: ToolMode;
  isDrawing: boolean;
  drawingId: string | null;
  setTool: (mode: ToolMode) => void;
  setDrawing: (drawing: boolean, id: string | null) => void;
}

// In AnnotationLayer — drawing lifecycle via Stage events
const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
  if (activeTool === 'select') return;
  const pos = stageRef.current!.getPointerPosition()!;
  const id = crypto.randomUUID();
  setDrawing(true, id);
  // Create initial shape in canvas store
  if (activeTool === 'arrow') {
    addAnnotation({ kind: 'arrow', id, points: [pos.x, pos.y, pos.x, pos.y], tension: 0, stroke: '#ff4444', strokeWidth: 3, pointerLength: 15, pointerWidth: 12 });
  }
  // ... rect, ellipse, text
};

const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
  if (!isDrawing || !drawingId) return;
  const pos = stageRef.current!.getPointerPosition()!;
  if (activeTool === 'arrow') {
    // Update end point of the arrow being drawn
    updateAnnotation(drawingId, {
      points: [startX, startY, pos.x, pos.y],
    } as Partial<AnnotationShape>);
  }
};

// Transformer — attaches to selected annotation node
const trRef = useRef<Konva.Transformer>(null);
const shapeRef = useRef<Konva.Shape>(null);
useEffect(() => {
  if (selectedId && trRef.current && shapeRef.current) {
    trRef.current.nodes([shapeRef.current]);
    trRef.current.getLayer()?.batchDraw();
  }
}, [selectedId]);

<Transformer
  ref={trRef}
  flipEnabled={false}
  boundBoxFunc={(oldBox, newBox) => {
    if (newBox.width < 5 || newBox.height < 5) return oldBox;
    return newBox;
  }}
  onTransformEnd={() => {
    // CRITICAL: Transformer changes scale, not width/height
    // Read back scale and size from the shape node, then reset scale to 1
    const node = shapeRef.current!;
    updateAnnotation(selectedId!, {
      x: node.x(), y: node.y(),
      width: node.width() * node.scaleX(),
      height: node.height() * node.scaleY(),
      rotation: node.rotation(),
      scaleX: 1, scaleY: 1,
    } as Partial<AnnotationShape>);
    node.scaleX(1);
    node.scaleY(1);
  }}
/>
```

**Arrow curvature (ANNO-01):** The `tension` prop on Konva Arrow/Line controls curvature. `tension=0` is straight; `tension=0.5` is smoothly curved. Points array for curved arrow: `[x0, y0, cx, cy, x1, y1]` where `cx/cy` is a control point the user can drag.

**Emoji stickers (ANNO-05):** Render via `Konva.Text` with an emoji character as the text string. Font size controls scale. No external image loading needed.

```typescript
<Text
  text={ann.emoji}     // e.g. '🎉'
  fontSize={ann.fontSize}
  x={ann.x}
  y={ann.y}
  draggable
/>
```

### Pattern 6: Snap Guides (CANV-05)

```typescript
// Source: konvajs.org/docs/sandbox/Objects_Snapping.html [VERIFIED]
// Snap algorithm runs during onDragMove on ScreenshotLayer group

const SNAP_THRESHOLD = 5; // pixels

function getSnapGuides(
  draggingNode: Konva.Node,
  allNodes: Konva.Node[],
  stageWidth: number,
  stageHeight: number
): { type: 'V' | 'H'; position: number; offset: number }[] {
  // Stage edges and center as snap targets
  const stops = {
    vertical:   [0, stageWidth / 2, stageWidth],
    horizontal: [0, stageHeight / 2, stageHeight],
  };
  // Add edges and centers of all other nodes
  for (const node of allNodes) {
    if (node === draggingNode) continue;
    const rect = node.getClientRect();
    stops.vertical.push(rect.x, rect.x + rect.width / 2, rect.x + rect.width);
    stops.horizontal.push(rect.y, rect.y + rect.height / 2, rect.y + rect.height);
  }
  // ... compare dragging node edges against stops, return matches within threshold
}
```

### Pattern 7: Fan Layout (CANV-06)

Fan layout positions N images in a stacked, fanned arrangement. Each image is offset and rotated slightly from center.

```typescript
// lib/fanLayout.ts
export function computeFanLayout(
  count: number,
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number
): Array<{ x: number; y: number; rotation: number }> {
  const cx = canvasWidth / 2 - imageWidth / 2;
  const cy = canvasHeight / 2 - imageHeight / 2;
  const maxAngle = Math.min(30, count * 8); // spread angle, capped at 30deg
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1; // -1 to 1
    return {
      x: cx + t * (count * 8),
      y: cy - Math.abs(t) * 20,  // slight arc
      rotation: t * maxAngle,
    };
  });
}
```

### Pattern 8: Undo/Redo Access

```typescript
// hooks/useHotkeys.ts
import { tinykeys } from 'tinykeys';
import { useEffect } from 'react';
import { useCanvasStore } from '../stores/canvas.store';

export function useHotkeys() {
  useEffect(() => {
    const { undo, redo } = useCanvasStore.temporal.getState();
    return tinykeys(window, {
      '$mod+z':       () => undo(),
      '$mod+Shift+z': () => redo(),
      '$mod+y':       () => redo(),       // Windows convention
      'Delete':       () => deleteSelected(),
      'Backspace':    () => deleteSelected(),
      'Escape':       () => setTool('select'),
      // Tool switches
      'v':            () => setTool('select'),
      'a':            () => setTool('arrow'),
      'r':            () => setTool('rect'),
      'e':            () => setTool('ellipse'),
      't':            () => setTool('text'),
    });
  }, []);
}
```

### Pattern 9: Privacy Tools — Blur and Pixelate Regions (PRIV-01, PRIV-02)

Privacy region processing is done in Rust (not canvas-side) to avoid blocking the main thread and to ensure consistent output across platforms. The user draws a selection rect on the canvas, then the IPC call processes the pixels server-side.

```typescript
// ipc/imageProcessing.ts
import { invoke } from '@tauri-apps/api/core';

export interface RegionArgs {
  imagePath: string;    // original file path
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;    // blur radius or pixelate block size
}

// Returns path to new temp PNG with region processed
export async function blurRegion(args: RegionArgs): Promise<string> {
  return invoke<string>('blur_region', args);
}

export async function pixelateRegion(args: RegionArgs): Promise<string> {
  return invoke<string>('pixelate_region', args);
}
```

After the IPC call returns, replace the `CanvasImage.src` with the new processed path. This is an undoable action because it mutates the canvas store.

**Alternative (canvas-side):** For privacy regions, Konva's built-in `Konva.Filters.Blur` and `Konva.Filters.Pixelate` can be applied to a clipped copy of the image in the canvas. This avoids an IPC round-trip and is simpler to implement. [ASSUMED] The tradeoff: canvas filters are preview-quality; Rust-side processing is export-quality. Given the <100ms performance requirement for common operations, canvas-side filters are the better choice for interactive preview — the Rust path should only be used at export time, if at all. See Assumptions Log A2.

### Pattern 10: Background Removal (PRIV-03)

Run Transformers.js RMBG-1.4 in a Web Worker to avoid blocking the main thread. Tauri's WebView supports Web Workers.

```typescript
// workers/backgroundRemoval.worker.ts
import { pipeline, RawImage } from '@huggingface/transformers';

let segmenter: Awaited<ReturnType<typeof pipeline>> | null = null;

self.onmessage = async (e: MessageEvent<{ imageSrc: string }>) => {
  if (!segmenter) {
    self.postMessage({ status: 'loading' });
    segmenter = await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
      device: 'webgpu',   // falls back to wasm automatically
    });
  }
  self.postMessage({ status: 'processing' });
  const output = await segmenter(e.data.imageSrc);
  // output[0].mask is the alpha matte
  self.postMessage({ status: 'done', mask: output });
};

// hooks/useBackgroundRemoval.ts
export function useBackgroundRemoval() {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/backgroundRemoval.worker.ts', import.meta.url),
      { type: 'module' }
    );
    return () => workerRef.current?.terminate();
  }, []);

  const removeBackground = useCallback(async (imageSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      workerRef.current!.onmessage = (e) => {
        if (e.data.status === 'done') resolve(e.data.resultUrl);
        if (e.data.status === 'error') reject(e.data.error);
      };
      workerRef.current!.postMessage({ imageSrc });
    });
  }, []);

  return { removeBackground };
}
```

**Model download:** RMBG-1.4 is ~176MB (fp32). It must NOT be bundled. Transformers.js caches it in the browser cache / IndexedDB after first download. Show a progress spinner during first use. The model is downloaded from HuggingFace CDN — this requires a network connection on first use, which is acceptable per project constraints (core features are offline; background removal requires one-time model download). [ASSUMED - see A3]

### Pattern 11: Crop Overlay (EDIT-01)

```typescript
// SelectionOverlay.tsx — interactive crop rect drawn over the image
// User drags to define crop bounds, then presses Enter to apply

const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

// Konva Rect with draggable corners (or use Transformer)
<Rect
  x={cropRect.x} y={cropRect.y}
  width={cropRect.w} height={cropRect.h}
  stroke="#fff"
  strokeWidth={2}
  dash={[6, 3]}
  fill="rgba(0,0,0,0.3)"
  draggable
/>
```

When confirmed: update `CanvasImage.crop` with `{ x, y, width, height }` in source image pixel coordinates (accounting for the image's scale and position transforms).

### Anti-Patterns to Avoid

- **Storing HTMLImageElement in canvas store:** Non-serializable. Breaks zundo snapshots. Store `src` strings only; reconstruct via `useImage`. [VERIFIED: PITFALLS.md]
- **Calling `toDataURL()` for undo snapshots:** Memory exhaustion. Use structural state only. [VERIFIED: PITFALLS.md]
- **CSS `filter` for drop shadows on canvas content:** Not captured in canvas export. Use Konva `shadowBlur`/`shadowOffsetX`/`shadowOffsetY` props. [VERIFIED: PITFALLS.md]
- **Calling `cache()` once and never again:** Konva requires re-caching after stroke, shadow, or size changes. Call `cache()` in a useEffect that depends on the relevant props.
- **Single flat canvas store:** Split canvas state from tool state. Tool selection changes should not trigger canvas re-renders. [VERIFIED: ARCHITECTURE.md]
- **Transformer changes scale, not width/height:** On `onTransformEnd`, always read back the new scale-adjusted dimensions, update the store with the actual pixel width/height, and reset scaleX/scaleY to 1. [VERIFIED: konvajs.org Transformer docs]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image loading with CORS and status | Custom fetch + Image element | `use-image` hook | Handles crossOrigin, loading/loaded/failed states, cleanup |
| Undo/redo state management | Manual history array + step counter | `zundo` temporal middleware | <700 bytes, works with Zustand actions, handles limit and partialize |
| Transformer handles (resize, rotate) | Custom drag handles | Konva `<Transformer>` | Hit testing, aspect ratio lock, rotation anchor, snap-to-angle built in |
| Dominant color extraction | Manual canvas pixel sampling | `colorthief` | Median-cut algorithm gives perceptually correct results; handles edge cases |
| Keyboard shortcut binding/cleanup | Manual `addEventListener` + keydown parsing | `tinykeys` | Cross-platform modifier keys (`$mod`), proper cleanup, sequence support |
| Canvas DPR scaling | Manual width/height * dpr calculation | Konva handles automatically | react-konva reads `window.devicePixelRatio` by default for backing store |
| Snap guide computation | Eyeballing proximity | Official Konva snapping algorithm (Objects_Snapping) | Handles all edge/center cases with proper threshold matching |
| Background removal inference | Custom ONNX loading | `@huggingface/transformers` pipeline | Model caching, WebGPU/WASM fallback, progress events, type-safe API |

**Key insight:** Konva provides drag, hit-testing, event routing, and transform handles. Every problem in this domain that feels like it needs a custom solution is almost certainly already in Konva's API or a documented Konva pattern.

---

## Common Pitfalls

### Pitfall 1: Cache Not Called After Prop Change (Filters Stop Working)
**What goes wrong:** After changing `blurRadius` or `noise`, the filter appears to stop updating.
**Why it happens:** Konva's filter pipeline caches the node's pixel data. When visual properties change, the cache must be invalidated and rebuilt.
**How to avoid:** In any component that uses `filters`, add a `useEffect` that calls `node.cache()` whenever the filter parameters change.
**Warning signs:** Changing the blur slider has no visual effect after the first application.

### Pitfall 2: Transformer Updates Scale, Not Width/Height
**What goes wrong:** After resizing with the Transformer, the shape's stored `width`/`height` are still the original values, but `scaleX`/`scaleY` are > 1. On the next render, the shape snaps back to its original size.
**Why it happens:** Konva's Transformer applies a scale transform, not a geometry mutation. The `onTransformEnd` handler must read the new values and reset scale to 1.
**How to avoid:** Always implement `onTransformEnd` to read `node.width() * node.scaleX()`, update the store, then call `node.scaleX(1)`. [VERIFIED: konvajs.org Transformer docs]
**Warning signs:** Shapes appear correct during drag but revert on mouse-up.

### Pitfall 3: zundo Snapshotting Non-Serializable State
**What goes wrong:** Adding an `HTMLImageElement` or `Blob` to the canvas store causes zundo to throw or silently fail.
**Why it happens:** zundo uses deep clone for snapshots; non-serializable objects can't be cloned.
**How to avoid:** Store only `string` (src URLs, paths), `number`, and plain objects in canvas store. [VERIFIED: PITFALLS.md]
**Warning signs:** Console errors about structured clone or undo steps that restore broken state.

### Pitfall 4: Background Removal Blocks UI Without Web Worker
**What goes wrong:** Calling Transformers.js on the main thread freezes the entire Tauri window for 5–30 seconds.
**Why it happens:** Model inference is CPU/GPU intensive. The main thread handles rendering AND JS execution.
**How to avoid:** Always run Transformers.js in a `new Worker(...)` with `type: 'module'`. Vite handles the bundling automatically. [VERIFIED: transformers.js pattern from MEDIUM source]
**Warning signs:** App becomes completely unresponsive during "Remove Background" operation.

### Pitfall 5: Pixelate Filter on Alpha Areas Produces Black Boxes
**What goes wrong:** Konva's `Filters.Pixelate` on images with transparent regions produces black rectangular artifacts.
**Why it happens:** Known Konva issue (GitHub #340). The pixelate filter doesn't correctly handle alpha channels in mixed regions.
**How to avoid:** For pixelate regions, send the request to Rust-side processing (which uses `imageproc` with correct alpha handling) rather than relying on the Konva filter for final output. Use the Konva filter only as a live preview.
**Warning signs:** Exported images have black boxes in pixelated regions where there was transparency.

### Pitfall 6: Arrow Annotation Transformer Conflict
**What goes wrong:** Using a standard Konva Transformer on an Arrow shape produces incorrect resize behavior because Arrow uses `points` not `width`/`height`.
**Why it happens:** Transformer is designed for rectangular shapes. Arrow's geometry is defined by a points array.
**How to avoid:** For arrows, don't use Transformer for resizing. Instead, show individual endpoint drag handles (two small circles at each end of the arrow) that modify the points array directly.
**Warning signs:** Rotating an arrow with the standard Transformer produces garbled output.

### Pitfall 7: Text Rendering Changed in Konva v10
**What goes wrong:** Text nodes appear in slightly different positions compared to designs that were tested with Konva v9.
**Why it happens:** Konva v10 changed text positioning to match DOM/CSS rendering. This is a breaking change if pixel-perfect text position matters.
**How to avoid:** If position mismatch is observed, add `Konva.legacyTextRendering = true` to the app entry point. Test on the target platforms before enabling this flag. [VERIFIED: Konva v10 CHANGELOG]
**Warning signs:** Text annotations are slightly off-center or misaligned with their bounding boxes.

---

## Code Examples

### Background: Linear Gradient

```typescript
// Source: konvajs.org/docs/styling/Fill.html [VERIFIED]
<Rect
  x={0} y={0}
  width={canvasWidth} height={canvasHeight}
  fillLinearGradientStartPoint={{ x: 0, y: 0 }}
  fillLinearGradientEndPoint={{ x: canvasWidth, y: canvasHeight }}
  fillLinearGradientColorStops={[0, '#667eea', 1, '#764ba2']}
  listening={false}
/>
```

### Background: Radial Gradient

```typescript
// Source: konvajs.org/docs/styling/Fill.html [VERIFIED]
<Rect
  x={0} y={0}
  width={canvasWidth} height={canvasHeight}
  fillRadialGradientStartPoint={{ x: canvasWidth / 2, y: canvasHeight / 2 }}
  fillRadialGradientStartRadius={0}
  fillRadialGradientEndPoint={{ x: canvasWidth / 2, y: canvasHeight / 2 }}
  fillRadialGradientEndRadius={Math.max(canvasWidth, canvasHeight) / 2}
  fillRadialGradientColorStops={[0, '#ff6b6b', 1, '#4ecdc4']}
  listening={false}
/>
```

### Background: Blur Filter on Image

```typescript
// Source: konvajs.org/docs/react/Filters.html [VERIFIED]
const bgRef = useRef<Konva.Image>(null);
const [bgImage] = useImage(background.imageSrc!, 'anonymous');

useEffect(() => {
  if (bgRef.current && bgImage && (background.blurRadius ?? 0) > 0) {
    bgRef.current.cache();
    bgRef.current.filters([Konva.Filters.Blur]);
    bgRef.current.blurRadius(background.blurRadius!);
    bgRef.current.getLayer()?.batchDraw();
  }
}, [bgImage, background.blurRadius]);

<KonvaImage ref={bgRef} image={bgImage} width={canvasWidth} height={canvasHeight} listening={false} />
```

### Screenshot: Directional Shadow

```typescript
// Source: konvajs.org/docs/styling/Shadow.html [VERIFIED]
// Even shadow (STYL-03): shadowOffsetX=0, shadowOffsetY=0
// Directional shadow (STYL-04): set offset based on angle
function shadowFromAngle(angleDeg: number, distance: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(rad) * distance, y: Math.sin(rad) * distance };
}

<Image
  image={htmlImage}
  shadowBlur={20}
  shadowColor="rgba(0,0,0,0.5)"
  shadowOffsetX={shadowOffset.x}
  shadowOffsetY={shadowOffset.y}
  shadowOpacity={0.6}
  cornerRadius={12}
/>
```

### Annotation: Arrow with Curvature

```typescript
// Source: konvajs.org/docs/shapes/Arrow.html [VERIFIED]
<Arrow
  points={ann.points}          // [x0, y0, x1, y1] or [x0, y0, cx, cy, x1, y1]
  tension={ann.tension}        // 0 = straight, 0.5 = curved
  stroke={ann.stroke}
  strokeWidth={ann.strokeWidth}
  pointerLength={ann.pointerLength}   // arrowhead length
  pointerWidth={ann.pointerWidth}     // arrowhead width
  fill={ann.stroke}            // fill must match stroke for solid arrowhead
  draggable={isSelected}
/>
```

### Undo/Redo with zundo

```typescript
// Source: github.com/charkour/zundo [VERIFIED: official README]
// In component:
const undo = () => useCanvasStore.temporal.getState().undo();
const redo = () => useCanvasStore.temporal.getState().redo();

// Check if undo is available:
const canUndo = useCanvasStore.temporal((s) => s.pastStates.length > 0);
const canRedo = useCanvasStore.temporal((s) => s.futureStates.length > 0);
```

### Keyboard Shortcuts with tinykeys

```typescript
// Source: npmjs.com/package/tinykeys [VERIFIED: npm registry]
import { tinykeys } from 'tinykeys';

useEffect(() => {
  return tinykeys(window, {
    '$mod+z':       (e) => { e.preventDefault(); undo(); },
    '$mod+Shift+z': (e) => { e.preventDefault(); redo(); },
    '$mod+y':       (e) => { e.preventDefault(); redo(); },
    'Delete':       () => removeSelected(),
    'Backspace':    () => removeSelected(),
    'Escape':       () => setTool('select'),
    'v': () => setTool('select'),
    'a': () => setTool('arrow'),
    'r': () => setTool('rect'),
    'e': () => setTool('ellipse'),
    't': () => setTool('text'),
    'b': () => setTool('blur-region'),
    'p': () => setTool('pixelate-region'),
    'c': () => setTool('crop'),
  });
}, []);  // stable function refs required — use useCallback for the action functions
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Konva CommonJS + `require('konva')` | Konva ESM-only (v10+) | Konva v10.0.0 (Sep 2025) | Vite handles transparently; no action needed |
| Konva text position (internal algorithm) | DOM/CSS-matching text position | Konva v10.0.0 | Opt-in legacy mode if needed |
| Transformers.js v3 WebGPU | Transformers.js v4 (latest stable 4.0.1) | 2025 | v4 is current; use v4 not v3 |
| `toDataURL()` for undo snapshots | Structural JSON state only | Established pattern | Avoids OOM; mandatory approach |
| CSS drop-shadow on canvas content | Konva shadow props | Always correct | CSS effects not captured at export |

**Deprecated/outdated:**
- `Konva.Brighten` filter: Replaced by `Konva.Brightness` in v10. Use `Brightness`.
- Default Node.js canvas in Konva: Removed in v10. Irrelevant for browser/Tauri.
- `require('konva')` without `.default`: Broken in v10 ESM. Vite's ESM import handles this automatically.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@huggingface/transformers` v4.0.1 is compatible with the RMBG-1.4 pipeline API shown in v3 examples | Standard Stack, Pattern 10 | Breaking API change between v3 and v4 would require updating the worker code; low risk as the `pipeline()` API is stable |
| A2 | For interactive privacy tools (PRIV-01, PRIV-02), canvas-side Konva filters are sufficient for the live preview, with Rust processing only at export time | Pattern 9 | If Konva Filters.Pixelate black-box issue (GitHub #340) affects the live preview quality unacceptably, the approach must shift to sending every preview to Rust — higher latency |
| A3 | RMBG-1.4 model download from HuggingFace CDN is acceptable for first use; subsequent uses are cached locally by Transformers.js | Pattern 10 | Project constraints say "no network calls for core features" — background removal is an advanced feature but this should be confirmed with user; alternatively, the model could be shipped bundled with the app (violates <20MB) or downloaded separately via a setup wizard |
| A4 | Tauri's WebView supports Web Workers with `type: 'module'` for Transformers.js | Pattern 10 | If Tauri's WebView2 (Windows) or WebKitGTK (Linux) doesn't support module workers, the background removal feature would fail silently on those platforms |

---

## Open Questions

1. **Privacy tool implementation boundary (PRIV-01, PRIV-02)**
   - What we know: Konva has built-in Blur and Pixelate filters; Rust can process pixels with rayon; Konva pixelate has a known alpha bug
   - What's unclear: Should blur/pixelate be done canvas-side (instant preview, potential alpha artifacts) or Rust-side (correct output, ~100ms IPC roundtrip)?
   - Recommendation: Use canvas Konva filters for live preview only. At export time (Phase 3), re-apply via Rust for correct output. This satisfies the <100ms UX requirement without sacrificing export quality.

2. **Background removal model download strategy (PRIV-03)**
   - What we know: RMBG-1.4 is ~176MB; binary target is <20MB; Transformers.js caches to IndexedDB after download
   - What's unclear: Is a first-time network request acceptable given the "offline" constraint? The CLAUDE.md says "no network calls for core features" — is background removal a core feature?
   - Recommendation: Treat as a non-core feature requiring opt-in download. Add a "Download AI features" button in Settings with progress indicator. Disable the Remove Background button until the model is cached.

3. **Padding implementation model (STYL-01)**
   - What we know: Padding can be implemented as canvas expansion (background grows) or as image shrinking
   - What's unclear: Which model matches user expectations? TinyShots-style apps expand the canvas background to create padding, not shrink the image.
   - Recommendation: [ASSUMED] Expand the canvas background approach — image stays at full resolution within the canvas, background Rect covers the padding area. Confirm with user.

---

## Environment Availability

Step 2.6: No new external runtime dependencies beyond what Phase 1 already established (Node.js, Rust, Tauri). All Phase 2 libraries are npm packages installed at build time. Background removal requires a network connection for first-time model download but is otherwise offline.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| konva / react-konva | Canvas rendering | To install | 10.2.3 / 19.2.3 | No fallback — core stack decision |
| zundo | Undo/redo | To install | 2.3.0 | No fallback — core UX requirement |
| @huggingface/transformers | PRIV-03 | To install | 4.0.1 | Disable Remove Background button if model not cached |
| WebGPU | Transformers.js fast path | Platform-dependent | — | WASM fallback auto-used by Transformers.js |
| colorthief | STYL-05 auto border | To install | 3.3.1 | Manual color picker fallback |
| tinykeys | KEYS-01/02 | To install | 3.0.0 | Direct addEventListener fallback |
| Rust imageproc crate | PRIV-01/02 Rust-side | Cargo add needed | latest | Canvas-side filter fallback (see Open Question 1) |

---

## Sources

### Primary (HIGH confidence)
- [Konva Changelog](https://raw.githubusercontent.com/konvajs/konva/master/CHANGELOG.md) — v10 breaking changes verified
- [Konva Fill / Gradient API](https://konvajs.org/docs/styling/Fill.html) — gradient prop names verified
- [Konva Shadow API](https://konvajs.org/docs/styling/Shadow.html) — shadow prop names verified
- [Konva Filters / Blur](https://konvajs.org/docs/filters/Blur.html) — filter application pattern verified
- [Konva Filters / Pixelate](https://konvajs.org/docs/filters/Pixelate.html) — pixelate filter + known alpha bug confirmed
- [React-Konva Filters](https://konvajs.org/docs/react/Filters.html) — cache() + filters prop pattern verified
- [React-Konva Transformer](https://konvajs.org/docs/react/Transformer.html) — Transformer attach pattern + scale gotcha verified
- [Konva Objects Snapping](https://konvajs.org/docs/sandbox/Objects_Snapping.html) — snap algorithm verified
- [Konva Arrow Shape](https://konvajs.org/docs/shapes/Arrow.html) — Arrow props verified
- [zundo README](https://github.com/charkour/zundo) — temporal middleware API verified
- [npm: konva@10.2.3](https://www.npmjs.com/package/konva) — version verified 2026-03-16
- [npm: react-konva@19.2.3](https://www.npmjs.com/package/react-konva) — version verified
- [npm: use-image@1.1.4](https://www.npmjs.com/package/use-image) — version verified 2025-05-25
- [npm: zundo@2.3.0](https://www.npmjs.com/package/zundo) — version verified
- [npm: colorthief@3.3.1](https://www.npmjs.com/package/colorthief) — version verified
- [npm: tinykeys@3.0.0](https://www.npmjs.com/package/tinykeys) — version verified
- [npm: @huggingface/transformers@4.0.1](https://www.npmjs.com/package/@huggingface/transformers) — version verified
- PITFALLS.md — IPC image data bottleneck, undo memory, CSS filter export gap, DPR handling
- ARCHITECTURE.md — Layer separation, store split, structural state pattern

### Secondary (MEDIUM confidence)
- [Konva Pixelate Alpha Bug — GitHub #340](https://github.com/konvajs/konva/issues/340) — black boxes in alpha regions
- [Transformers.js RMBG-1.4 Web Worker pattern](https://medium.com/myorder/building-an-ai-background-remover-using-transformer-js-and-webgpu-882b0979f916) — single source; worker architecture

### Tertiary (LOW confidence / needs validation)
- Fan layout algorithm — [ASSUMED] geometry is straightforward but the visual expectation (fan vs grid) needs user confirmation
- Padding expansion model — [ASSUMED] canvas-expansion vs image-shrink needs user preference confirmation

---

## Metadata

**Confidence breakdown:**
- Core Konva patterns (gradients, shadows, filters, Transformer): HIGH — verified from official Konva docs
- Konva v10 breaking changes: HIGH — verified from CHANGELOG
- zundo temporal middleware API: HIGH — verified from official README
- Background removal Web Worker pattern: MEDIUM — single source, widely cited
- Fan layout geometry: MEDIUM — math is sound; visual result is [ASSUMED]
- Padding implementation model: LOW — needs user confirmation

**Research date:** 2026-04-09
**Valid until:** 2026-07-09 (Konva and Transformers.js are fast-moving; re-verify versions before execution)
