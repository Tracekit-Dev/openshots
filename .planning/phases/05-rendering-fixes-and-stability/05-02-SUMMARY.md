---
phase: 05-rendering-fixes-and-stability
plan: 02
subsystem: ui
tags: [konva, canvas, filters, grain, noise, react, typescript]

# Dependency graph
requires: []
provides:
  - BackgroundLayer with Konva.Filters.Noise wired to background.grain slider
  - Grain filter applied to both solid/gradient rect and image background nodes
affects: [rendering-fixes-and-stability, background-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Combined filter array pattern: build Filter[] conditionally, apply once via node.filters()"
    - "Import Filter type from konva/lib/Node for correct TypeScript typing (Konva.Filter not in namespace)"

key-files:
  created: []
  modified:
    - src/components/canvas/BackgroundLayer.tsx

key-decisions:
  - "Import Filter type from konva/lib/Node directly — Konva.Filter is not re-exported from the Konva namespace"
  - "Use Filter[] array type instead of inline cast to avoid undefined narrowing issues"
  - "background.grain added to image useEffect dependency array alongside background.blur"

patterns-established:
  - "Combined filter array: build Filter[] conditionally (blur, noise), call node.filters(arr) once — same pattern for both rect and image nodes"

requirements-completed: [RENDER-04]

# Metrics
duration: 12min
completed: 2026-04-10
---

# Phase 5 Plan 02: Grain Filter Summary

**Konva.Filters.Noise wired to background.grain slider in BackgroundLayer, composing with existing Blur filter on both rect and image background nodes**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-10T00:00:00Z
- **Completed:** 2026-04-10T00:12:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Grain slider in BackgroundPanel now applies visible Konva noise texture to canvas background in real time
- Noise filter applies to both solid/gradient rect and image background nodes
- Blur and Noise filters compose correctly when both sliders are active simultaneously
- `background.grain` added to image useEffect dependency array so grain changes re-trigger the effect

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Add Noise filter to rect and image backgrounds** - `1e75caf` (fix)

**Plan metadata:** pending docs commit

## Files Created/Modified
- `src/components/canvas/BackgroundLayer.tsx` - Added Konva.Filters.Noise to both filter useEffects; imported Filter type from konva/lib/Node

## Decisions Made
- Imported `Filter` type from `konva/lib/Node` directly rather than using `Konva.Filter` — the Konva namespace does not re-export that type, causing a TS2694 error
- Dropped manual type annotation attempt using `(imageData: ImageData) => void)[]` (the original plan's suggested type) because Konva's `Filter` is `FilterFunction | string`, not just `FilterFunction`
- Both tasks committed in a single commit since they implement the same pattern symmetrically

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect TypeScript type annotation for filter array**
- **Found during:** Task 1 (build verification)
- **Issue:** Plan suggested `((imageData: ImageData) => void)[]` as the filter array type, but Konva's `Filter` type is `FilterFunction | string` — the narrower type caused TS2345 errors on `filters.push(Konva.Filters.Blur)`
- **Fix:** Imported `Filter` from `konva/lib/Node` and typed the array as `Filter[]`
- **Files modified:** src/components/canvas/BackgroundLayer.tsx
- **Verification:** `npm run build` exits 0 with no TypeScript errors
- **Committed in:** 1e75caf (task commit)

---

**Total deviations:** 1 auto-fixed (1 type bug)
**Impact on plan:** Fix necessary for TypeScript correctness. No scope creep.

## Issues Encountered
- `Konva.Filter` is not accessible as a namespace member — must import from `konva/lib/Node` directly. Noted for any future code adding Konva filter arrays.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — grain filter is fully wired. Slider value flows from store to `node.noise()` with no placeholders.

## Next Phase Readiness
- RENDER-04 complete. Grain slider applies visible noise texture on both background types.
- Remaining Phase 5 plans: drop shadow fix (05-03), directional shadow UI (05-04), DnD fix (05-05).

## Self-Check: PASSED
- BackgroundLayer.tsx: FOUND
- 05-02-SUMMARY.md: FOUND
- Commit 1e75caf: FOUND

---
*Phase: 05-rendering-fixes-and-stability*
*Completed: 2026-04-10*
