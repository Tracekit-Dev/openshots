# Roadmap: OpenShots

## Milestones

- ✅ **v1.0 MVP** - Phases 1-4 (shipped 2026-04-09)
- 🚧 **v1.1 Feature Completeness** - Phases 5-8 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) - SHIPPED 2026-04-09</summary>

- [x] **Phase 1: Foundation and Capture** - Tauri app shell, IPC, screenshot capture, system tray, hotkeys
- [x] **Phase 2: Canvas Editor** - Canvas with backgrounds, annotations, privacy tools, styling, export, presets
- [x] **Phase 3: OSS Release Prep** - README, LICENSE (FSL-1.1-MIT), CONTRIBUTING, CI/CD, GitHub repo at Tracekit-Dev
- [x] **Phase 4: Landing Page** - Marketing site with TraceKit branding, deployed to Vercel

</details>

### v1.1 Feature Completeness

- [ ] **Phase 5: Rendering Fixes and Stability** - Fix shadow, border, grain rendering bugs and cross-platform drag-and-drop
- [ ] **Phase 6: Complete Editor** - Crop tool, snap guides, annotation editing, blur-at-export, and advanced annotation types
- [ ] **Phase 7: AI Background Removal** - On-device background removal with RMBG-1.4, Web Worker, and WebGPU/WASM fallback
- [ ] **Phase 8: CLI and Share** - Terminal batch processing and OS share sheet integration

## Phase Details

<details>
<summary>v1.0 MVP (Phases 1-4) - SHIPPED 2026-04-09</summary>

### Phase 1: Foundation and Capture
**Goal**: Users can capture screenshots via system tray with global hotkeys
**Depends on**: Nothing
**Requirements**: v1.0 Capture requirements (complete)
**Success Criteria** (what must be TRUE):
  1. User can capture screenshot via system tray
  2. User can trigger capture with global hotkey
**Plans**: 2/2 complete

### Phase 2: Canvas Editor
**Goal**: Users can beautify screenshots with backgrounds, annotations, and export
**Depends on**: Phase 1
**Requirements**: v1.0 Canvas, Backgrounds, Styling, Annotations, Privacy, Editing, Export, Presets, Shortcuts (complete)
**Success Criteria** (what must be TRUE):
  1. User can place screenshots on canvas with backgrounds
  2. User can annotate with arrows, shapes, text, emojis
  3. User can export to PNG, JPEG, WebP
**Plans**: 3/3 complete

### Phase 3: OSS Release Prep
**Goal**: Project is ready for open-source release
**Depends on**: Phase 2
**Plans**: Complete

### Phase 4: Landing Page
**Goal**: Marketing site live for project discovery
**Depends on**: Phase 3
**Plans**: Complete

</details>

### Phase 5: Rendering Fixes and Stability
**Goal**: Existing visual features render correctly and drag-and-drop works reliably across platforms
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: RENDER-01, RENDER-02, RENDER-03, RENDER-04, DND-01
**Success Criteria** (what must be TRUE):
  1. User sees drop shadow correctly track the image during drag and rotation (no detachment or offset)
  2. User can set shadow direction via angle and distance controls, and the shadow updates in real time
  3. User sees inset border color sampled from image edge pixels, not averaged across the entire image
  4. User can drag the grain/noise slider and see the filter applied to the canvas background
  5. User can drag image files from Finder/Explorer/file manager onto the canvas and they appear reliably on macOS, Windows, and Linux
**Plans**: TBD

### Phase 6: Complete Editor
**Goal**: Users have a full-featured editing workflow with crop, alignment, annotation editing, advanced annotation types, and trustworthy privacy blur in exports
**Depends on**: Phase 5
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, ANNOT-01, ANNOT-02, ANNOT-03, ANNOT-04
**Success Criteria** (what must be TRUE):
  1. User can draw a crop region on an image and confirm with Enter to crop it
  2. User can constrain crop to preset aspect ratios (16:9, 4:3, 1:1) or use freeform
  3. User can type custom canvas width and height values
  4. User sees Figma-style snap/alignment guides when dragging images near edges or centers of other elements
  5. User can select any existing annotation and change its color, stroke width, font size, dash pattern, and style via a property panel
  6. User can place numbered step callouts that auto-increment (1, 2, 3...) on the canvas
  7. Exported images contain actual pixel-level blur/pixelate in privacy regions (not just visual overlays)
**Plans**: TBD
**UI hint**: yes

### Phase 7: AI Background Removal
**Goal**: Users can remove image backgrounds entirely on-device with no network calls after initial model download
**Depends on**: Phase 5
**Requirements**: AI-01, AI-02, AI-03
**Success Criteria** (what must be TRUE):
  1. User can click "Remove Background" on a canvas image and see the background replaced with transparency
  2. User sees a progress bar during first-use model download (~45MB quantized) with clear status messaging
  3. Background removal works offline after model is cached, using WebGPU where available and WASM as fallback
**Plans**: TBD
**UI hint**: yes

### Phase 8: CLI and Share
**Goal**: Power users can batch-process screenshots from the terminal and all users can share to OS-level destinations
**Depends on**: Phase 6
**Requirements**: CLI-01, CLI-02, SHARE-01
**Success Criteria** (what must be TRUE):
  1. User can run `openshots beautify --preset <name> --input <glob> --output <dir>` from terminal and get beautified images
  2. User can run `openshots annotate` and `openshots export` commands for scripted workflows
  3. User can share an exported screenshot to OS share sheet (AirDrop, Messages, social apps) from the export panel
**Plans**: TBD

## Progress

**Execution Order:** Phase 5 -> Phase 6 -> Phase 7 -> Phase 8
(Phase 7 depends on Phase 5 only; can run in parallel with Phase 6 if desired)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation and Capture | v1.0 | 2/2 | Complete | 2026-04-09 |
| 2. Canvas Editor | v1.0 | 3/3 | Complete | 2026-04-09 |
| 3. OSS Release Prep | v1.0 | - | Complete | 2026-04-09 |
| 4. Landing Page | v1.0 | - | Complete | 2026-04-09 |
| 5. Rendering Fixes and Stability | v1.1 | 1/3 | In Progress|  |
| 6. Complete Editor | v1.1 | 0/? | Not started | - |
| 7. AI Background Removal | v1.1 | 0/? | Not started | - |
| 8. CLI and Share | v1.1 | 0/? | Not started | - |
