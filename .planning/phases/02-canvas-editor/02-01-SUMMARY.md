---
phase: 02-canvas-editor
plan: 01
subsystem: ui
tags: [konva, react-konva, zustand, zundo, canvas, tailwind]

requires:
  - phase: 01-foundation-and-capture
    provides: Tauri shell, capture pipeline, typed IPC, global shortcuts

provides:
  - Zustand canvas store with zundo undo/redo (50-step limit)
  - Tool store for active tool selection
  - Konva Stage with Background, Screenshot, Privacy, and Annotation layers
  - All background types: solid, linear-gradient, radial-gradient, image with blur
  - Screenshot placement with rounded corners, drop shadow, inset border, flip
  - BackgroundPanel, StylePanel, AspectRatioPanel sidebar controls
  - Fan layout for multi-image arrangement
  - Dominant color extraction for auto-matched inset borders

affects: [02-02, 02-03, export, presets]

tech-stack:
  added: [konva 10.x, react-konva 19.x, zundo 2.x]
  patterns: [zustand-temporal-undo, konva-layer-architecture, partialize-for-history]

key-files:
  created:
    - src/stores/canvas.store.ts
    - src/stores/tool.store.ts
    - src/components/canvas/CanvasStage.tsx
    - src/components/canvas/BackgroundLayer.tsx
    - src/components/canvas/ScreenshotLayer.tsx
    - src/components/canvas/nodes/ScreenshotNode.tsx
    - src/components/panels/BackgroundPanel.tsx
    - src/components/panels/StylePanel.tsx
    - src/components/panels/AspectRatioPanel.tsx
    - src/lib/colorAnalysis.ts
    - src/lib/fanLayout.ts
    - src/lib/aspectRatios.ts
  modified:
    - package.json

key-decisions:
  - "Used flipX/flipY booleans instead of scaleX/scaleY=-1 for image flipping — simpler mental model"
  - "Shadow stored as nested object {enabled, color, blur, offsetX, offsetY} instead of flat fields"
  - "Inset border stored as nested object {enabled, color, width} with auto-match via dominant color"
  - "Custom pixel-sampling color analysis instead of colorthief dependency — samples image edges at 64x64"
  - "Gradient stored as [color1, color2] tuple instead of gradientStops array — sufficient for two-stop gradients"
  - "System wallpapers integration for macOS background selection"

patterns-established:
  - "Konva layer architecture: Background → Screenshot → Privacy → Annotation (z-order)"
  - "Canvas store partialize: selectedId and actions excluded from undo history"
  - "Transformer onTransformEnd: normalize scaleX/scaleY to 1, store actual pixel width/height"

requirements-completed: [CANV-01, CANV-02, CANV-03, CANV-04, CANV-06, CANV-08, BG-01, BG-02, BG-03, BG-04, BG-05, STYL-01, STYL-02, STYL-03, STYL-05]

duration: N/A
completed: 2026-04-08
---

# Plan 02-01: Canvas Foundation Summary

**Konva canvas with 4-layer architecture, Zustand+zundo undo/redo, full background system, and screenshot styling controls**

## Performance

- **Duration:** Single session (combined with Plans 02 and 03)
- **Tasks:** 3
- **Files modified:** 13+

## Accomplishments
- Canvas store with zundo temporal middleware providing 50-step undo/redo history
- Konva Stage with ResizeObserver-driven sizing and zoom controls (Cmd+0 reset, scroll wheel, UI buttons)
- All four background types (solid, linear gradient, radial gradient, image) with blur slider
- Screenshot nodes with rounded corners, configurable drop shadow, auto-matched inset border, and flip H/V
- Fan layout algorithm for multi-image composition
- BackgroundPanel with gradient presets, custom colors, image upload, and macOS system wallpaper thumbnails
- StylePanel with padding, corner radius, shadow, inset border, and flip controls
- AspectRatioPanel with 6 preset ratios (16:9, 1:1, 9:16, 4:3, 3:2, 21:9)
- File drag-and-drop onto canvas for image import

## Task Commits

Implementation was done in a single session spanning all Phase 2 plans:

1. **Task 1-3: Full canvas foundation** — `11d065e` (feat: canvas editor with backgrounds, styling, annotations, privacy tools, and undo/redo)

## Files Created/Modified
- `src/stores/canvas.store.ts` — Serializable canvas state with zundo temporal middleware
- `src/stores/tool.store.ts` — Active tool selection (select, arrow, rect, ellipse, text, emoji, blur, pixelate)
- `src/components/canvas/CanvasStage.tsx` — Root Konva Stage with 4 layers, zoom, drag-and-drop
- `src/components/canvas/BackgroundLayer.tsx` — Renders solid/gradient/image backgrounds with blur filter
- `src/components/canvas/ScreenshotLayer.tsx` — Renders all CanvasImage nodes with padding layout
- `src/components/canvas/nodes/ScreenshotNode.tsx` — Image node with corners, shadow, border, flip, transformer
- `src/components/panels/BackgroundPanel.tsx` — Background type selector, gradient presets, blur/grain sliders
- `src/components/panels/StylePanel.tsx` — Padding, corners, shadow, border, flip, fan layout controls
- `src/components/panels/AspectRatioPanel.tsx` — 6 preset ratio buttons with active highlighting
- `src/lib/colorAnalysis.ts` — Edge-sampling dominant color extraction (no colorthief dep)
- `src/lib/fanLayout.ts` — Fan position/rotation algorithm for N images
- `src/lib/aspectRatios.ts` — Preset table and canvasSize() lookup

## Decisions Made
- Skipped colorthief dependency; custom pixel sampling at 64x64 with edge-focus is lighter and sufficient
- Simplified shadow model: no directional angle/distance mode, just blur + offsetY
- No shadow opacity slider (fixed at shadow.color alpha)
- Used boolean flipX/flipY instead of negative scale values
- Gradient model uses simple [color1, color2] tuple, not variable stop array
- tinykeys not installed; keyboard shortcuts handled via plain addEventListener

## Deviations from Plan

### Simplified Implementations

**1. Shadow model simplified**
- Plan specified Even/Directional toggle with angle slider, distance slider, and opacity slider
- Actual: single blur slider + offsetY slider, no angle/distance/opacity controls
- Impact: Less control over shadow direction, but covers the common use case

**2. Snap guides not implemented**
- Plan required useSnapGuides.ts hook with 5px threshold alignment
- Actual: not implemented; no visual alignment guides during drag
- Impact: CANV-05 (snap guides) not met

**3. Aspect ratio panel simplified**
- Plan specified 8 presets including Twitter/X, LinkedIn, and Custom (free input)
- Actual: 6 presets, no social media presets, no custom dimension input
- Impact: CANV-07 partially met (no custom entry)

**4. Grain/noise filter not wired**
- BackgroundPanel has a grain slider but BackgroundLayer doesn't apply Konva.Filters.Noise
- Impact: BG-06 (grain) control exists in UI but has no visual effect

**5. fileDialog IPC not abstracted**
- Plan specified src/ipc/fileDialog.ts with openImageFile/openMultipleImageFiles
- Actual: Tauri dialog API called directly in components
- Impact: No functional difference, just less abstraction

---

**Requirements not completed:** CANV-05 (snap guides), CANV-07 (custom aspect ratio), BG-06 (grain filter application)

---
*Phase: 02-canvas-editor, Plan: 01*
*Completed: 2026-04-08*
