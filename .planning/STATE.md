# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09)

**App name:** OpenShots
**Core value:** Users can turn raw screenshots into polished, shareable visuals in seconds — without leaving the app.
**Current focus:** Phase 2 — Canvas Editor (summaries written, UAT next)

## Current Position

Phase: 2 of 4 (Canvas Editor and Beautification)
Plan: 3 of 3 have summaries
Status: Ready for UAT verification
Last activity: 2026-04-09 — Phase 2 summaries written reflecting actual implementation state

Progress: [████████░░░░░░░░░░░░] 3/5 plans documented

## Performance Metrics

**Velocity:**
- Total plans completed: 5 (Phase 1: 2, Phase 2: 3)
- Average duration: —
- Total execution time: Single session (2026-04-08)

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1 | 2/2 | Complete |
| 2 | 3/3 | Summaries written, awaiting UAT |
| 3 | 0/TBD | Not started (OSS release prep) |
| 4 | 0/TBD | Not started (landing page) |

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
- Phase 2: Canvas-side Konva filters for live blur/pixelate preview; Rust imageproc for final export NOT YET IMPLEMENTED
- Phase 2: Padding implemented as reactive render-time scaling (not store mutation) — original image dims preserved
- Phase 2: SHORTCUT_REGISTRY is single source of truth for keyboard shortcuts
- Phase 2: Background removal deferred — @huggingface/transformers not installed
- Phase 2: Added macOS system wallpaper browser (HEIC→JPEG via sips)
- Phase 2: Annotations rendered inline in AnnotationLayer (no separate node components)
- Phase 2: Privacy regions stored separately from annotations in canvas store
- Phase 2: tinykeys not used — plain addEventListener for keyboard shortcuts
- Phase 3 (export/presets): Already implemented in prior session — export PNG/JPEG/WebP, clipboard copy, presets
- Branding: Rebranded to TraceKit, FSL-1.1-MIT license, repo at Tracekit-Dev/openshots

### What's NOT Built Yet (Phase 2 gaps)

1. **Snap guides** during image drag (CANV-05)
2. **Background removal** — Transformers.js + RMBG-1.4 Web Worker (PRIV-03)
3. **Crop overlay** — interactive crop with Enter to confirm (EDIT-01)
4. **Grain filter** — slider exists but Konva.Filters.Noise not wired (BG-06)
5. **Rust blur/pixelate export** — Konva preview works but exported images don't include privacy regions
6. **Custom aspect ratio input** — only presets, no free-form entry (CANV-07 partial)
7. **Annotation property editing** — can create shapes but can't change color/stroke after creation
8. **Directional shadow controls** — only blur + offsetY, no angle/distance/opacity
9. **Platform-specific shortcut labels** — same labels on all OS
10. **? / Cmd+/ keyboard trigger** for shortcuts modal

### Pending Todos

- Run UAT on Phase 2 to verify what works
- Plan gap closure for unimplemented Phase 2 requirements
- Plan Phase 3 (OSS release prep) and Phase 4 (landing page)

### Blockers/Concerns

- Transformers.js WebGPU performance on Windows/Linux is unknown — benchmark early
- Pixelate Konva filter may produce artifacts on alpha regions
- Large retina screenshots as JPEG data URLs are ~3-5MB — works but uses memory
- Export doesn't bake in privacy regions (blur/pixelate) — significant gap

## Session Continuity

Last session: 2026-04-09
Stopped at: Phase 2 summaries written for all 3 plans. TraceKit branding applied and pushed.
Resume with: `/gsd-verify-work 02` to UAT Phase 2, then plan gap closure for unmet requirements.
