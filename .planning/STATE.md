# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09)

**App name:** OpenShots
**Core value:** Users can turn raw screenshots into polished, shareable visuals in seconds — without leaving the app.
**Current focus:** Phase 2 — Canvas Editor (mostly built, needs summaries and remaining items)

## Current Position

Phase: 2 of 3 (Canvas Editor and Beautification)
Plan: 0 of 3 formally complete (but ~85% of work already implemented)
Status: Plans need summaries written to reflect completed work
Last activity: 2026-04-09 — Phase 1 complete, Phase 2+3 largely implemented in same session

Progress: [████████░░] ~80%

## Performance Metrics

**Velocity:**
- Total plans completed: 2 (Phase 1)
- Plans with work done but no summary: 5 (02-01, 02-02, 02-03, Phase 3 export/presets)
- Average duration: —
- Total execution time: Single session (2026-04-09)

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1 | 2/2 | ✅ Complete |
| 2 | 0/3 formal, ~85% built | Needs summaries |
| 3 | 0/TBD formal, ~80% built | Needs plans + summaries |

## Accumulated Context

### Decisions

- Init: Tauri 2.x + React/TypeScript + Konva.js chosen for cross-platform + binary size constraint
- Phase 1: xcap crate used directly (not community plugin)
- Phase 1: **IPC uses JPEG data URLs (base64)** — NOT temp file + asset protocol. The `asset://` protocol was broken on macOS WKWebView in dev mode. Data URLs work reliably for screenshots up to ~5MB JPEG.
- Phase 1: Region overlay uses in-app canvas showing pre-captured fullscreen, NOT a separate transparent Tauri window. Simpler, avoids transparent window issues.
- Phase 1: Wayland detection via WAYLAND_DISPLAY env var at startup
- Phase 1: App renamed from "Screenshots" to "OpenShots"
- Phase 1: UI redesigned with Apple/Linear.app aesthetic (zinc palette, no purple)
- Phase 2: Konva v10 used (ESM-only, native cornerRadius on Image)
- Phase 2: Canvas-side Konva filters for live blur/pixelate preview; Rust imageproc for final export
- Phase 2: Padding implemented as reactive render-time scaling (not store mutation) — original image dims preserved
- Phase 2: SHORTCUT_REGISTRY is single source of truth for keyboard shortcuts
- Phase 2: Background removal via @huggingface/transformers not yet implemented
- Phase 2: Added macOS system wallpaper browser (HEIC→JPEG via sips)
- Phase 3: Export (PNG/JPEG/WebP), clipboard copy, presets already implemented

### What's NOT Built Yet

1. **Snap guides** during image drag (planned in 02-01)
2. **Background removal** — Transformers.js + RMBG-1.4 Web Worker (planned in 02-02)
3. **Crop overlay** — interactive crop with Enter to confirm (planned in 02-02)
4. **Grain filter** — slider exists but Konva grain rendering not implemented
5. **CLI batch processing** — Phase 3 remaining work

### Pending Todos

- Write SUMMARY.md files for Phase 2 plans (02-01, 02-02, 02-03)
- Implement remaining Phase 2 items (snap guides, bg removal, crop, grain)
- Plan and implement CLI batch processing (Phase 3)

### Blockers/Concerns

- Transformers.js WebGPU performance on Windows/Linux is unknown — benchmark early
- Pixelate Konva filter may produce artifacts on alpha regions
- Large retina screenshots as JPEG data URLs are ~3-5MB — works but uses memory

## Session Continuity

Last session: 2026-04-09
Stopped at: Phase 1 complete. Phase 2 ~85% built. Roadmap updated with "already implemented" annotations. Phase 2 plans need summaries.
Resume with: Write Phase 2 summaries, then implement remaining items (snap guides, bg removal, crop, grain) or move to CLI.
