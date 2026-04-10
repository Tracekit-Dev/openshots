---
phase: 06-complete-editor
plan: 03
subsystem: canvas-alignment
tags: [snap, guides, alignment, drag, konva]
dependency_graph:
  requires: [06-01]
  provides: [snap-alignment, guide-lines]
  affects: [ScreenshotNode, ScreenshotLayer, CanvasStage]
tech_stack:
  added: []
  patterns: [konva-snap-detection, guide-line-overlay, edge-center-alignment]
key_files:
  created:
    - src/components/canvas/GuidesLayer.tsx
  modified:
    - src/components/canvas/ScreenshotLayer.tsx
    - src/components/canvas/nodes/ScreenshotNode.tsx
decisions:
  - "GuidesLayer rendered as sibling Layer inside ScreenshotLayer fragment (above screenshots, below privacy/annotations)"
  - "Snap detection uses offset model (x,y = center) matching existing ScreenshotNode Group positioning"
  - "Fixed position override bug: ScreenshotLayer no longer force-centers images on every render"
metrics:
  duration: 123s
  completed: "2026-04-10T20:11:42Z"
  tasks: 2
  files: 3
---

# Phase 06 Plan 03: Snap/Alignment Guides Summary

Figma-style snap alignment guides with 8px threshold for center-to-center and edge-to-edge detection across canvas edges and sibling images.

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create GuidesLayer and fix position override | ab64d75 | GuidesLayer.tsx, ScreenshotLayer.tsx |
| 2 | Snap detection in ScreenshotNode dragmove | c1e30e4 | ScreenshotNode.tsx |

## What Was Built

**GuidesLayer component** (`src/components/canvas/GuidesLayer.tsx`):
- Renders red (#ef4444) alignment guide lines as a non-interactive Konva Layer
- Accepts Guide[] array with lineGuide position and V/H orientation
- Draws full-width horizontal or full-height vertical lines at snap positions

**Snap detection** (`src/components/canvas/nodes/ScreenshotNode.tsx`):
- `getLineGuideStops()` collects snap targets: canvas edges (0, width, height), canvas center, and all sibling image edges/centers
- `handleDragMove()` checks left/center/right vertical edges and top/center/bottom horizontal edges against stops
- SNAP_THRESHOLD = 8px per design spec D-10
- Snaps node position and updates guide state on match; clears guides on dragEnd

**Position override fix** (`src/components/canvas/ScreenshotLayer.tsx`):
- Removed forced `x: canvasWidth/2, y: canvasHeight/2` override that was resetting image positions on every render
- Images now use stored x/y from canvas store (set to center on initial add by addScreenshotToCanvas)
- Passes allImages, canvasWidth, canvasHeight, setGuides to ScreenshotNode for snap calculations

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compiles without errors (`npx tsc --noEmit`)
- Vite build completes successfully (`npx vite build`)

## Self-Check: PASSED
