---
phase: 02-canvas-editor
plan: 02
subsystem: ui
tags: [konva, annotations, privacy, blur, pixelate, canvas]

requires:
  - phase: 02-canvas-editor
    plan: 01
    provides: Canvas store, Konva stage, tool store, screenshot layer

provides:
  - Annotation layer with arrow, rect, ellipse, text, emoji drawing
  - Transformer-based annotation selection and resize
  - Privacy layer with blur and pixelate region tools (canvas-side preview)
  - Tool panel with 8 tool modes and keyboard shortcut labels

affects: [02-03, export]

tech-stack:
  added: []
  patterns: [inline-annotation-rendering, konva-filter-preview, privacy-region-model]

key-files:
  created:
    - src/components/canvas/AnnotationLayer.tsx
    - src/components/canvas/PrivacyLayer.tsx
    - src/components/panels/ToolPanel.tsx
  modified:
    - src/stores/canvas.store.ts
    - src/components/canvas/CanvasStage.tsx

key-decisions:
  - "All annotation shapes rendered inline in AnnotationLayer instead of separate node components — less indirection for 5 shape types"
  - "Privacy regions (blur/pixelate) stored in canvas store as separate privacyRegions array, not as annotations"
  - "Blur/pixelate uses Konva filters for live canvas preview — Rust-side processing for export not yet implemented"
  - "Arrow annotations use empty enabledAnchors array on Transformer (no resize handles, consistent with Konva best practices for line-based shapes)"
  - "Background removal deferred — no Web Worker, no @huggingface/transformers integration yet"

patterns-established:
  - "Inline shape rendering: AnnotationLayer switches on annotation.type to render Konva primitives directly"
  - "Privacy region model: separate from annotations, applied as Konva.Filters.Blur/Pixelate on canvas preview"
  - "Scale normalization on all Transformer onTransformEnd handlers"

requirements-completed: [ANNO-01, ANNO-02, ANNO-03, ANNO-04, ANNO-05, ANNO-06, PRIV-01, PRIV-02, EDIT-02, EDIT-03]

duration: N/A
completed: 2026-04-08
---

# Plan 02-02: Annotations & Privacy Tools Summary

**Annotation drawing for 5 shape types with Transformer selection, plus blur/pixelate privacy regions with live Konva filter preview**

## Performance

- **Duration:** Single session (combined with Plans 01 and 03)
- **Tasks:** 3 (2 implemented, 1 deferred)
- **Files modified:** 5+

## Accomplishments
- AnnotationLayer renders all 5 shape types: arrow, rectangle, ellipse, text, emoji
- Drawing mode: select tool, click-and-drag on canvas to create shapes
- Transformer-based selection with resize/rotate for rect, ellipse, text, emoji
- Arrow annotations with empty anchor set (no standard resize, only endpoint repositioning)
- PrivacyLayer with blur and pixelate region creation and live Konva filter preview
- ToolPanel with 8 tools (select, arrow, rect, ellipse, text, emoji, blur, pixelate) showing shortcut keys

## Task Commits

1. **Tasks 1-2: Annotations + privacy tools** — `11d065e` (feat: canvas editor with backgrounds, styling, annotations, privacy tools, and undo/redo)
2. **Task 3: Background removal** — NOT IMPLEMENTED (deferred)

## Files Created/Modified
- `src/components/canvas/AnnotationLayer.tsx` — Renders all annotations inline, manages drawing mode and Transformer
- `src/components/canvas/PrivacyLayer.tsx` — Blur/pixelate regions with live Konva filter preview
- `src/components/panels/ToolPanel.tsx` — 8 tool mode buttons in 2-column grid with shortcut labels
- `src/stores/canvas.store.ts` — Added privacyRegions array and CRUD actions
- `src/components/canvas/CanvasStage.tsx` — Integrated AnnotationLayer, PrivacyLayer, and tool-based click handlers

## Decisions Made
- Rendered all shapes inline in AnnotationLayer instead of separate ArrowNode, RectNode, etc. components
- Privacy regions stored separately from annotations (different data model, different layer)
- Blur/pixelate preview is canvas-side only via Konva filters — export path doesn't bake them yet
- No separate AnnotationPanel for per-shape property editing — properties edited via StylePanel
- No SelectionOverlay component — selection handled implicitly via store + Transformer

## Deviations from Plan

### Not Implemented

**1. Background removal (PRIV-03)**
- Plan specified Web Worker with @huggingface/transformers RMBG-1.4 pipeline
- No worker, hook, or model integration exists
- @huggingface/transformers not in package.json
- Impact: PRIV-03 not met

**2. Rust blur/pixelate commands**
- Plan specified src-tauri/src/commands/image_processing.rs with blur_region and pixelate_region
- No Rust-side image processing commands implemented; imageproc not in Cargo.toml
- Canvas-side Konva filter preview works but exported images won't include blur/pixelate
- Impact: EDIT-01 (crop) not met; export fidelity gap for privacy regions

**3. Separate node components**
- Plan specified ArrowNode.tsx, RectNode.tsx, EllipseNode.tsx, TextNode.tsx, EmojiNode.tsx
- All rendered inline in AnnotationLayer instead — functionally equivalent, less file surface

**4. AnnotationPanel**
- Plan specified dedicated panel for per-annotation property controls (color, stroke width, etc.)
- Not implemented as separate panel — annotation properties not directly editable via UI controls
- Impact: Users can draw and transform annotations but can't change colors/stroke after creation

**5. Inline text editing**
- Plan specified double-click to enter edit mode with HTML textarea overlay
- Status unclear — text annotations are created with default text but inline edit may not be wired

---

**Requirements not completed:** PRIV-03 (background removal), EDIT-01 (crop)
**Gaps for export:** Blur/pixelate regions render on canvas but aren't baked into exported images

---
*Phase: 02-canvas-editor, Plan: 02*
*Completed: 2026-04-08*
