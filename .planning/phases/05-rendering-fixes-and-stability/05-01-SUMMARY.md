---
phase: 05-rendering-fixes-and-stability
plan: "01"
subsystem: canvas-rendering
tags: [shadow, konva, bug-fix, ui-controls]
dependency_graph:
  requires: []
  provides: [RENDER-01, RENDER-02]
  affects:
    - src/components/canvas/nodes/ScreenshotNode.tsx
    - src/components/panels/StylePanel.tsx
tech_stack:
  added: []
  patterns:
    - "Konva Group-level shadow props (shadowEnabled/Color/Blur/OffsetX/OffsetY/Opacity) follow affine transform automatically"
    - "Shadow on outer Group (no clipFunc) renders outside image bounds correctly"
key_files:
  modified:
    - src/components/canvas/nodes/ScreenshotNode.tsx
    - src/components/panels/StylePanel.tsx
decisions:
  - "Group-level Konva shadow props chosen over manual coordinate sync — props follow rotation/drag automatically with no custom math"
  - "shadowOpacity={1} used because data.shadow.color already encodes alpha (rgba(0,0,0,0.3)) — avoids double-dimming"
  - "Offset X slider range -40 to 40 matching existing Offset Y slider for UI parity"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-10"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 5 Plan 1: Shadow Rendering Fix and Offset X Slider Summary

**One-liner:** Replaced absolute-coordinate shadow Rect with Konva Group-level shadow props that track rotation/drag automatically; added Offset X slider to shadow controls panel.

## What Was Built

**RENDER-01 — Drop shadow rendering fix (ScreenshotNode.tsx)**

The standalone `<Rect>` that was rendering the shadow used absolute stage coordinates (`data.x - totalW / 2 + bw`) with no rotation adjustment. When a user rotated an image, the shadow Rect stayed at its absolute position and detached visibly from the image. The fix deletes the Rect entirely and moves six shadow props (`shadowEnabled`, `shadowColor`, `shadowBlur`, `shadowOffsetX`, `shadowOffsetY`, `shadowOpacity`) onto the outer `<Group ref={groupRef}>`. Konva Group-level shadow props are part of the node's affine transform context — they rotate and translate with the Group automatically.

The shadow props were placed on the outer Group (which has no `clipFunc`) and not on the inner `<Group clipFunc={...}>`. Shadow on a clipped Group would be clipped to the image bounds and invisible — the outer Group is the correct attachment point.

**RENDER-02 — Offset X slider (StylePanel.tsx)**

The `shadow.offsetX` field was already present in the `CanvasImage` store type (initialized to `0`) but had no UI control. An Offset X slider was inserted between the existing Blur and Offset Y sliders in the shadow controls block, matching the Offset Y slider's exact markup: range -40 to 40, `accent-zinc-400`, spread update pattern `{ ...selected.shadow, offsetX: Number(e.target.value) }`, no value readout span.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Replace standalone shadow Rect with Group-level shadow props | c3113c6 | ScreenshotNode.tsx |
| 2 | Add Offset X slider to shadow controls | 3b148a9 | StylePanel.tsx |

## Acceptance Criteria Verification

All criteria passed:

- `shadowEnabled` — 1 match on outer Group (line 71 of ScreenshotNode.tsx)
- Standalone shadow Rect — no matches (deleted)
- `shadowOffsetX={data.shadow.offsetX}` — present on outer Group
- `shadowOpacity={1}` — 1 match
- `Offset X` label — 1 match in StylePanel.tsx (line 139)
- `shadow.offsetX` in onChange — spread update pattern present
- `min={-40}` — 2 matches (one for Offset X, one for Offset Y)
- Offset X (line 139) before Offset Y (line 154)
- `npm run build` — exits 0, no TypeScript errors

## Deviations from Plan

**1. [Rule 1 - Bug] Removed invalid JSX comment from prop list**
- **Found during:** Task 1
- **Issue:** The plan's action instructions included a JSX comment `{/* Shadow — ... */}` inside the `<Group>` prop attribute list, which is invalid JSX syntax (comments cannot appear as attribute nodes in JSX).
- **Fix:** Replaced with a standard JS line comment (`//`) above the shadow props block, which is valid in a JSX tag's attribute position.
- **Files modified:** src/components/canvas/nodes/ScreenshotNode.tsx
- **Commit:** c3113c6

No other deviations — plan executed as written.

## Known Stubs

None. Both store fields (`shadow.offsetX`, `shadow.offsetY`) were already initialized and wired. Shadow rendering is fully functional.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- [x] `src/components/canvas/nodes/ScreenshotNode.tsx` exists and modified
- [x] `src/components/panels/StylePanel.tsx` exists and modified
- [x] Commit c3113c6 exists
- [x] Commit 3b148a9 exists
- [x] `npm run build` exits 0
