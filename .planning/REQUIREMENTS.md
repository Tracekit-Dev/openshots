# Requirements: Screenshots

**Defined:** 2026-04-09
**Core Value:** Users can turn raw screenshots into polished, shareable visuals in seconds — without leaving the app.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Capture

- [ ] **CAPT-01**: User can capture a selected screen region via global hotkey
- [ ] **CAPT-02**: User can capture a full screen via global hotkey
- [ ] **CAPT-03**: User can capture a specific window via global hotkey
- [ ] **CAPT-04**: User can access the app from the system tray menu
- [ ] **CAPT-05**: User can configure custom global hotkeys for each capture mode
- [ ] **CAPT-06**: User can trigger capture from system tray click (Wayland fallback)

### Canvas

- [ ] **CANV-01**: User can drag and drop images onto the canvas
- [ ] **CANV-02**: User can import images via file picker
- [ ] **CANV-03**: User can place multiple images on the canvas simultaneously
- [ ] **CANV-04**: User can freely position, scale, and rotate images on the canvas
- [ ] **CANV-05**: User can see snap guides when aligning elements
- [ ] **CANV-06**: User can auto-arrange multiple images in a fan layout
- [ ] **CANV-07**: User can undo and redo any canvas action
- [ ] **CANV-08**: User can select a canvas aspect ratio preset (16:9, 1:1, 9:16, custom)

### Backgrounds

- [ ] **BG-01**: User can apply a gradient background (linear/radial) to the canvas
- [ ] **BG-02**: User can apply a solid color background to the canvas
- [ ] **BG-03**: User can upload and apply a custom image as the canvas background
- [ ] **BG-04**: User can pick any color via a color picker for backgrounds
- [ ] **BG-05**: User can add blur effect to the background
- [ ] **BG-06**: User can add grain/noise texture to the background

### Styling

- [ ] **STYL-01**: User can adjust padding around the screenshot on the canvas
- [ ] **STYL-02**: User can apply rounded corners to embedded screenshots
- [ ] **STYL-03**: User can add a drop shadow (even) to screenshots
- [ ] **STYL-04**: User can add a directional drop shadow with angle/intensity controls
- [ ] **STYL-05**: User can apply an auto color-matched inset border around screenshots

### Annotations

- [ ] **ANNO-01**: User can draw arrows with curvature and thickness controls
- [ ] **ANNO-02**: User can draw rectangles with fill, stroke, and corner radius
- [ ] **ANNO-03**: User can draw ellipses with fill and stroke
- [ ] **ANNO-04**: User can add text labels with font, size, color, shadow, and outline
- [ ] **ANNO-05**: User can place emoji stickers on the canvas
- [ ] **ANNO-06**: User can select, move, resize, and delete any annotation

### Privacy

- [ ] **PRIV-01**: User can blur a selected region of a screenshot with adjustable intensity
- [ ] **PRIV-02**: User can pixelate a selected region of a screenshot with adjustable intensity
- [ ] **PRIV-03**: User can remove the background from an image on-device (AI-powered)

### Editing

- [ ] **EDIT-01**: User can crop a screenshot with an interactive overlay
- [ ] **EDIT-02**: User can flip an image horizontally
- [ ] **EDIT-03**: User can flip an image vertically

### Export

- [ ] **EXPO-01**: User can export the canvas as PNG
- [ ] **EXPO-02**: User can export the canvas as JPEG with quality slider
- [ ] **EXPO-03**: User can export the canvas as WebP with quality slider
- [ ] **EXPO-04**: User can copy the canvas to the system clipboard
- [ ] **EXPO-05**: User can choose export resolution/scaling

### Presets

- [ ] **PRES-01**: User can save current canvas settings as a named preset
- [ ] **PRES-02**: User can load a saved preset to apply settings in one click
- [ ] **PRES-03**: User can delete saved presets

### CLI

- [ ] **CLI-01**: User can beautify a screenshot from the command line using a preset
- [ ] **CLI-02**: User can batch-process multiple screenshots via CLI with glob patterns
- [ ] **CLI-03**: User can specify input file, output path, and preset name via CLI flags

### Shortcuts

- [ ] **KEYS-01**: User can perform all common actions via keyboard shortcuts
- [ ] **KEYS-02**: User can view a list of available keyboard shortcuts

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Capture

- **CAPT-07**: User can capture a scrolling page (long screenshot)

### Composition

- **COMP-01**: User can apply window chrome decoration (macOS/Windows frame)
- **COMP-02**: User can apply device mockup frames (phone, tablet, laptop)

### Annotations

- **ANNO-07**: User can add numbered step counters
- **ANNO-08**: User can add speech bubbles
- **ANNO-09**: User can add spotlight/highlight overlays

### Presets

- **PRES-04**: User can export presets as JSON for team sharing
- **PRES-05**: User can import presets from JSON files

### Ecosystem

- **ECO-01**: User can install plugins to extend functionality
- **ECO-02**: User can use the app in languages other than English

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Cloud storage/sync | Violates offline-first, privacy-first core value. Let OS filesystem and existing cloud drives handle this |
| Video/GIF recording | Doubles codebase complexity. Separate product category (OBS, Loom, Kap) |
| Subscription model | Contradicts free + open-source positioning |
| Screenshot history/catalog | OS filesystem + search (Spotlight/Everything) handles this better |
| OCR / text extraction | Different product goal. Dedicated OCR tools exist |
| Color picker / screen ruler | Scope creep. Developer utilities are a separate concern |
| Cloud upload destinations (S3, etc.) | Adds server config complexity. Contradicts offline-first positioning |
| AI auto-enhancement | ML model distribution complexity, undermines user control |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAPT-01 | Phase 1 | Pending |
| CAPT-02 | Phase 1 | Pending |
| CAPT-03 | Phase 1 | Pending |
| CAPT-04 | Phase 1 | Pending |
| CAPT-05 | Phase 1 | Pending |
| CAPT-06 | Phase 1 | Pending |
| CANV-01 | Phase 2 | Pending |
| CANV-02 | Phase 2 | Pending |
| CANV-03 | Phase 2 | Pending |
| CANV-04 | Phase 2 | Pending |
| CANV-05 | Phase 2 | Pending |
| CANV-06 | Phase 2 | Pending |
| CANV-07 | Phase 2 | Pending |
| CANV-08 | Phase 2 | Pending |
| BG-01 | Phase 2 | Pending |
| BG-02 | Phase 2 | Pending |
| BG-03 | Phase 2 | Pending |
| BG-04 | Phase 2 | Pending |
| BG-05 | Phase 2 | Pending |
| BG-06 | Phase 2 | Pending |
| STYL-01 | Phase 2 | Pending |
| STYL-02 | Phase 2 | Pending |
| STYL-03 | Phase 2 | Pending |
| STYL-04 | Phase 2 | Pending |
| STYL-05 | Phase 2 | Pending |
| ANNO-01 | Phase 2 | Pending |
| ANNO-02 | Phase 2 | Pending |
| ANNO-03 | Phase 2 | Pending |
| ANNO-04 | Phase 2 | Pending |
| ANNO-05 | Phase 2 | Pending |
| ANNO-06 | Phase 2 | Pending |
| PRIV-01 | Phase 2 | Pending |
| PRIV-02 | Phase 2 | Pending |
| PRIV-03 | Phase 2 | Pending |
| EDIT-01 | Phase 2 | Pending |
| EDIT-02 | Phase 2 | Pending |
| EDIT-03 | Phase 2 | Pending |
| KEYS-01 | Phase 2 | Pending |
| KEYS-02 | Phase 2 | Pending |
| EXPO-01 | Phase 3 | Pending |
| EXPO-02 | Phase 3 | Pending |
| EXPO-03 | Phase 3 | Pending |
| EXPO-04 | Phase 3 | Pending |
| EXPO-05 | Phase 3 | Pending |
| PRES-01 | Phase 3 | Pending |
| PRES-02 | Phase 3 | Pending |
| PRES-03 | Phase 3 | Pending |
| CLI-01 | Phase 3 | Pending |
| CLI-02 | Phase 3 | Pending |
| CLI-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 50 total
- Mapped to phases: 50
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after roadmap creation*
