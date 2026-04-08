# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09)

**Core value:** Users can turn raw screenshots into polished, shareable visuals in seconds — without leaving the app.
**Current focus:** Phase 2 — Canvas Editor and Beautification

## Current Position

Phase: 2 of 3 (Canvas Editor and Beautification)
Plan: 0 of 3 in current phase
Status: Ready to execute
Last activity: 2026-04-09 — Phase 2 plans created (02-01, 02-02, 02-03)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: Tauri 2.x + React/TypeScript + Konva.js chosen for cross-platform + binary size constraint
- Init: All image processing in Rust backend; IPC must never carry raw pixel data (asset protocol / temp files only)
- Init: Undo/redo via zundo stores structural object model only — no pixel data in history
- Phase 1: xcap crate used directly (not tauri-plugin-screenshots community plugin) — better maintenance guarantees
- Phase 1: IPC image transfer uses temp file + convertFileSrc() pattern — eliminates JSON byte array overhead
- Phase 1: Region overlay implemented as second Tauri window (transparent, decorations:false, alwaysOnTop) — no native API alternative
- Phase 1: Wayland detection via WAYLAND_DISPLAY env var at startup — skip shortcut registration, show banner
- Phase 2: Konva v10 used (ESM-only, native cornerRadius on Image, updated text rendering) — confirmed in RESEARCH.md
- Phase 2: Canvas-side Konva filters for live blur/pixelate preview; Rust imageproc for final export-quality output
- Phase 2: Background removal via @huggingface/transformers v4 RMBG-1.4 in a Web Worker — one-time download, never bundled
- Phase 2: Padding model = canvas expansion (background grows around image, not image shrinks)
- Phase 2: Transformer onTransformEnd must normalize scaleX/scaleY → actual pixel width/height and reset scale to 1
- Phase 2: Arrow annotations use endpoint drag handles, NOT the standard Konva Transformer (Transformer conflicts with Arrow's points-based geometry)
- Phase 2: SHORTCUT_REGISTRY is the single source of truth for keyboard shortcuts — both tinykeys binding and ShortcutsModal derive from it

### Pending Todos

- Validate xcap 0.9.x API surface during Plan 01-02 execution: confirm method is `capture_area` or `capture_region` for region capture
- Confirm `tauri-plugin-macos-permissions` v2.3.0 Cargo.toml feature flags during Plan 01-01 setup
- Phase 2 Plan 02-02: Verify exact @huggingface/transformers v4 pipeline output shape for RMBG-1.4 at runtime (result[0].mask API)
- Phase 2 Plan 02-02: Confirm imageproc Gaussian blur channel handling — may need RGBA-to-Luma8 conversion and alpha channel recombination
- Phase 2 Plan 02-03: Remove temporary addEventListener in AnnotationLayer.tsx after Plan 02-03 installs useHotkeys

### Blockers/Concerns

- Phase 2: Transformers.js WebGPU performance on Windows integrated GPU and Linux is an unknown — benchmark early; Rust-side `ort` crate is the fallback if browser-side latency exceeds ~5s
- Phase 2: zundo middleware compatibility with Zustand 5.x must be confirmed during Plan 02-01 execution (zundo 2.3.0 claims Zustand 5 support — verify)
- Phase 2 Plan 02-02: Pixelate Konva filter produces black boxes on alpha regions (documented Konva issue #340) — use Rust for export output only; Konva filter is preview-only

## Session Continuity

Last session: 2026-04-09
Stopped at: Phase 2 plans written (02-01-PLAN.md, 02-02-PLAN.md, 02-03-PLAN.md) — ready to execute with /gsd-execute-phase 2
Resume file: None
