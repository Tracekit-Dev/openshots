---
phase: 06-complete-editor
plan: 05
subsystem: export-privacy
tags: [rust, imageproc, blur, pixelate, privacy, export]
dependency_graph:
  requires: []
  provides: [pixel-level-privacy-export]
  affects: [export-pipeline]
tech_stack:
  added: [imageproc-0.25]
  patterns: [rust-image-processing, coordinate-scaling]
key_files:
  created: []
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/src/commands/export.rs
    - src/ipc/export.ts
    - src/components/panels/ExportPanel.tsx
decisions:
  - Used imageproc 0.25 for compatibility with image 0.25 crate
  - Privacy regions param is Option<Vec> for backward compatibility
  - Coordinate scaling done on frontend before IPC to keep Rust side simple
metrics:
  duration: 172s
  completed: "2026-04-10"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 06 Plan 05: Export Privacy Region Processing Summary

Rust-side pixel-level blur (gaussian_blur_f32) and pixelate (block-averaging) applied to privacy regions before image encoding at export time, with frontend coordinate scaling from canvas space to export pixel space.

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add imageproc and implement blur/pixelate in export.rs | 4adfea2 | src-tauri/Cargo.toml, src-tauri/src/commands/export.rs |
| 2 | Update frontend export IPC to pass privacy regions | af30d3a | src/ipc/export.ts, src/components/panels/ExportPanel.tsx |

## Implementation Details

### Rust Export Pipeline (export.rs)
- Added `imageproc = "0.25"` dependency for `gaussian_blur_f32`
- `PrivacyRegionExport` struct: region_type, x, y, width, height, intensity
- Blur: extracts sub-image, applies `gaussian_blur_f32(sigma = intensity / 2.0)`, pastes back
- Pixelate: custom `pixelate_region` function with block-averaging at `8 * intensity` block size
- All region coordinates clamped to image bounds with `saturating_sub` to prevent OOB access
- `privacy_regions: Option<Vec<PrivacyRegionExport>>` -- backward compatible

### Frontend IPC (export.ts, ExportPanel.tsx)
- `PrivacyRegionExport` interface mirrors Rust struct with snake_case field names
- `ExportOptions.privacyRegions` optional field
- ExportPanel reads `privacyRegions` from canvas store
- Scales coordinates: `exportScale = outW / canvasWidth`, applies `Math.round` for integer pixel coords
- Only passes regions when array is non-empty

## Verification

- `cargo check` passes
- `npx tsc --noEmit` passes
- `npx vite build` completes successfully

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all data paths are wired end-to-end.

## Threat Model Compliance

- T-06-07 (Information Disclosure): Mitigated -- blur/pixelate applied to actual pixel data before encoding
- T-06-08 (Tampering): Mitigated -- all region coordinates clamped to image bounds using `min(saturating_sub)`
- T-06-09 (DoS): Accepted -- sigma capped by intensity range (max 40 -> sigma 20.0)

## Self-Check: PASSED

All files found. All commits verified (4adfea2, af30d3a).
