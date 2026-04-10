# Requirements: OpenShots

**Defined:** 2026-04-10
**Core Value:** Users can turn raw screenshots into polished, shareable visuals in seconds -- without leaving the app.

## v1.0 Requirements (Validated)

All v1.0 requirements shipped and validated. See MILESTONES archive for details.

### Capture (6 requirements) -- Complete
### Canvas (8 requirements) -- Complete
### Backgrounds (6 requirements) -- Complete
### Styling (5 requirements) -- Complete
### Annotations (6 requirements) -- Complete
### Privacy (2 requirements) -- Complete (PRIV-01, PRIV-02 canvas overlay only)
### Editing (2 requirements) -- Complete (EDIT-02, EDIT-03 flip only)
### Export (5 requirements) -- Complete
### Presets (3 requirements) -- Complete
### Shortcuts (2 requirements) -- Complete

## v1.1 Requirements

Requirements for v1.1 Feature Completeness milestone. Each maps to roadmap phases.

### Rendering Fixes

- [x] **RENDER-01**: User sees drop shadow correctly attached to image during drag and rotation
- [x] **RENDER-02**: User can configure directional shadow with angle, distance, and opacity controls
- [x] **RENDER-03**: User sees inset border color auto-matched to image edge pixels (not full-image average)
- [x] **RENDER-04**: User can apply grain/noise filter to canvas background via existing slider

### Core Editing

- [ ] **EDIT-01**: User can draw a crop region on the canvas and confirm with Enter to crop the image
- [ ] **EDIT-02**: User can lock crop to specific aspect ratios (16:9, 4:3, 1:1, free)
- [ ] **EDIT-03**: User can set custom canvas dimensions via free-form width/height input
- [ ] **EDIT-04**: User sees Figma-style snap/alignment guides when dragging images on canvas
- [ ] **EDIT-05**: User's blur/pixelate privacy regions are applied to actual pixel data at export (Rust-side processing)

### Annotations

- [ ] **ANNOT-01**: User can select an existing annotation and edit its color, stroke width, and font via a property panel
- [ ] **ANNOT-02**: User can place numbered step callouts (auto-incrementing badges) on the canvas
- [ ] **ANNOT-03**: User can choose from dash pattern presets (solid, dashed, dotted) for line/arrow annotations
- [ ] **ANNOT-04**: User can select from stroke width presets for annotations

### AI Processing

- [ ] **AI-01**: User can remove image background using on-device AI (RMBG-1.4 via Transformers.js)
- [ ] **AI-02**: User sees a progress indicator during model download on first use
- [ ] **AI-03**: Background removal works offline after initial model download with WebGPU acceleration (WASM fallback)

### Power Features

- [ ] **CLI-01**: User can beautify screenshots from the terminal via `openshots beautify --preset <name> --input <glob> --output <dir>`
- [ ] **CLI-02**: User can apply annotations and export via CLI commands (`openshots annotate`, `openshots export`)
- [ ] **SHARE-01**: User can share exported screenshot to OS-level share sheet (social/messaging)
- [x] **DND-01**: User can reliably drag-and-drop image files onto the canvas across macOS, Windows, and Linux

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Capture

- **CAPT-07**: User can capture a scrolling page (long screenshot)

### Composition

- **COMP-01**: User can apply window chrome decoration (macOS/Windows frame)
- **COMP-02**: User can apply device mockup frames (phone, tablet, laptop)

### Annotations

- **ANNO-07**: User can add speech bubbles
- **ANNO-08**: User can add spotlight/highlight overlays

### Presets

- **PRES-04**: User can export presets as JSON for team sharing
- **PRES-05**: User can import presets from JSON files

### Advanced Processing

- **PROC-01**: User can batch-apply background removal via CLI
- **PROC-02**: User can record GIF/video of editing workflow

### Ecosystem

- **ECO-01**: User can install plugins to extend functionality
- **ECO-02**: User can use the app in languages other than English

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud storage/sync | Privacy-first, fully offline |
| Subscription model | Free and open source |
| Video/GIF recording | Separate product category |
| Mobile apps | Desktop-first |
| Real-time collaboration | High complexity, not core value |
| RMBG-2.0 model | Upstream OOM bug in onnxruntime-web |
| Transformers.js v4 | @next tag, RMBG-1.4 compat unverified |
| OCR / text extraction | Different product goal |
| Cloud upload destinations | Contradicts offline-first |
| AI auto-enhancement | Undermines user control |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| RENDER-01 | Phase 5 | Complete |
| RENDER-02 | Phase 5 | Complete |
| RENDER-03 | Phase 5 | Complete |
| RENDER-04 | Phase 5 | Complete |
| DND-01 | Phase 5 | Complete |
| EDIT-01 | Phase 6 | Pending |
| EDIT-02 | Phase 6 | Pending |
| EDIT-03 | Phase 6 | Pending |
| EDIT-04 | Phase 6 | Pending |
| EDIT-05 | Phase 6 | Pending |
| ANNOT-01 | Phase 6 | Pending |
| ANNOT-02 | Phase 6 | Pending |
| ANNOT-03 | Phase 6 | Pending |
| ANNOT-04 | Phase 6 | Pending |
| AI-01 | Phase 7 | Pending |
| AI-02 | Phase 7 | Pending |
| AI-03 | Phase 7 | Pending |
| CLI-01 | Phase 8 | Pending |
| CLI-02 | Phase 8 | Pending |
| SHARE-01 | Phase 8 | Pending |

**Coverage:**
- v1.1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-04-10*
*Last updated: 2026-04-10 after roadmap creation*
