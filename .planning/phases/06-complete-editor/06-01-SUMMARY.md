---
phase: 06-complete-editor
plan: 01
subsystem: annotations
tags: [callout, annotation-types, dash-style, canvas]
dependency_graph:
  requires: []
  provides: [CalloutAnnotation, dash-field, callout-tool]
  affects: [06-02, 06-03]
tech_stack:
  added: []
  patterns: [discriminated-union-extension, konva-group-rendering]
key_files:
  created: []
  modified:
    - src/stores/canvas.store.ts
    - src/stores/tool.store.ts
    - src/components/canvas/AnnotationLayer.tsx
    - src/components/panels/ToolPanel.tsx
    - src/components/canvas/CanvasStage.tsx
decisions:
  - Callout radius fixed at 18px with 14px font for clean numbered badges
  - Callout uses strokeColor for fill (consistent with other annotation color behavior)
  - Auto-increment counts all existing callouts, not just non-deleted ones
metrics:
  duration: 141s
  completed: "2026-04-10T20:05:56Z"
  tasks: 2
  files: 5
---

# Phase 06 Plan 01: Callout Annotations and Dash Field Summary

CalloutAnnotation type with auto-incrementing numbered circle badges, dash field on Arrow/Rect/Ellipse for dashed stroke support in Plans 02/03.

## What Was Built

### Task 1: Store Type Extensions
- Added `CalloutAnnotation` interface to canvas.store.ts with `number`, `fill`, `textColor` fields
- Added `"callout"` to `AnnotationType` union and `AnnotationShape` discriminated union
- Added optional `dash?: number[]` field to `ArrowAnnotation`, `RectAnnotation`, and `EllipseAnnotation`
- Added `"callout"` to `ToolMode` union in tool.store.ts

### Task 2: UI Wiring (Render, Tool, Placement)
- Added `Circle` and `Group` imports to AnnotationLayer; callout renders as filled circle with centered white number text
- Wired `dash` prop on Arrow, Rect, Ellipse Konva components (passes undefined when not set, which Konva treats as solid)
- Added Callout button to ToolPanel TOOLS array with "N" keyboard shortcut
- Added callout color update case in handleColorClick
- Added callout placement handler in CanvasStage that auto-increments numbers based on existing callout count

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 850b0b3 | feat(06-01): add CalloutAnnotation type, dash field, and callout tool mode to stores |
| 2 | 90e0cd1 | feat(06-01): add callout rendering, tool button, placement handler, and dash props |

## Verification

- TypeScript compilation: PASSED (zero errors)
- Vite production build: PASSED (269ms)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
