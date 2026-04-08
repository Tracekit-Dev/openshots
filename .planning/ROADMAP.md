# Roadmap: Screenshots

## Overview

Three phases deliver the full v1.0 screenshot beautifier. Phase 1 builds the Tauri foundation and screenshot capture pipeline — the prerequisite everything else sits on. Phase 2 builds the entire canvas editing surface: backgrounds, styling, annotations, privacy tools, and editing primitives. Phase 3 completes the value chain with export formats, reusable presets, and the CLI batch processing differentiator.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation and Capture** - Tauri app shell, IPC architecture, canvas scaffold, and screenshot capture across all platforms
- [ ] **Phase 2: Canvas Editor and Beautification** - Full editing surface: backgrounds, styling, annotations, privacy tools, editing, and keyboard shortcuts
- [ ] **Phase 3: Export, Presets, and CLI** - Export to PNG/JPEG/WebP, reusable presets, clipboard, and CLI batch processing

## Phase Details

### Phase 1: Foundation and Capture
**Goal**: The app runs on macOS, Windows, and Linux; users can capture screenshots via global hotkey and system tray without leaving their workflow
**Depends on**: Nothing (first phase)
**Requirements**: CAPT-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05, CAPT-06
**Success Criteria** (what must be TRUE):
  1. User can capture a selected region, full screen, or specific window via global hotkey on macOS and Windows
  2. User can access the app and trigger captures from the system tray menu on all three platforms
  3. User can configure custom hotkeys for each capture mode in settings
  4. User on Linux (Wayland) can trigger capture via system tray click when global hotkeys are unavailable, and sees an informational banner explaining the limitation
  5. macOS prompts the user to grant Screen Recording permission on first capture and provides a recovery path when permission is revoked
**Plans**: 2 plans
Plans:
- [ ] 01-01-PLAN.md — Rust install, Tauri scaffold, layered project structure, typed IPC contracts
- [ ] 01-02-PLAN.md — System tray, global shortcuts, xcap capture pipeline, region overlay, window picker, hotkey settings, Wayland fallback
**UI hint**: yes

### Phase 2: Canvas Editor and Beautification
**Goal**: Users can place screenshots on a canvas, apply beautiful backgrounds and styling, annotate with shapes and text, redact sensitive areas, and perform basic image corrections — all with full undo/redo and keyboard shortcuts
**Depends on**: Phase 1
**Requirements**: CANV-01, CANV-02, CANV-03, CANV-04, CANV-05, CANV-06, CANV-07, CANV-08, BG-01, BG-02, BG-03, BG-04, BG-05, BG-06, STYL-01, STYL-02, STYL-03, STYL-04, STYL-05, ANNO-01, ANNO-02, ANNO-03, ANNO-04, ANNO-05, ANNO-06, PRIV-01, PRIV-02, PRIV-03, EDIT-01, EDIT-02, EDIT-03, KEYS-01, KEYS-02
**Success Criteria** (what must be TRUE):
  1. User can drag, drop, position, scale, and rotate one or more screenshots on the canvas and auto-arrange them in a fan layout
  2. User can apply gradient, solid color, or custom image backgrounds with blur and grain effects, and adjust padding, rounded corners, and drop shadows on placed images
  3. User can draw arrows, rectangles, ellipses, text labels, and emoji stickers on the canvas, then select, move, resize, and delete them
  4. User can blur or pixelate a selected region of a screenshot to redact sensitive content, and remove the background from an image entirely on-device
  5. User can undo and redo any action, access all common operations via keyboard shortcuts, and view a shortcut reference list
**Plans**: 3 plans
Plans:
- [ ] 02-01-PLAN.md — Canvas store (Zustand+zundo), Konva Stage, BackgroundLayer, ScreenshotLayer with snap guides and fan layout, tool panels (background, style, aspect ratio)
- [ ] 02-02-PLAN.md — AnnotationLayer with five shape types and Transformer, privacy tools (blur/pixelate regions via Rust IPC + live Konva preview), crop overlay, flip, background removal Web Worker
- [ ] 02-03-PLAN.md — Unified keyboard shortcut binding (tinykeys), SHORTCUT_REGISTRY, shortcut reference modal
**UI hint**: yes

### Phase 3: Export, Presets, and CLI
**Goal**: Users can export polished visuals in multiple formats, save canvas configurations as reusable presets, and batch-process screenshots from the command line using those presets
**Depends on**: Phase 2
**Requirements**: EXPO-01, EXPO-02, EXPO-03, EXPO-04, EXPO-05, PRES-01, PRES-02, PRES-03, CLI-01, CLI-02, CLI-03
**Success Criteria** (what must be TRUE):
  1. User can export the canvas as PNG, JPEG (with quality slider), or WebP (with quality slider) at a chosen resolution and save to a file via native dialog
  2. User can copy the finished canvas image directly to the system clipboard in one action
  3. User can save the current canvas configuration as a named preset and apply any saved preset in one click, or delete presets they no longer need
  4. User can run `screenshots beautify --preset <name> --input <glob> --output <dir>` from the terminal to batch-process multiple files without opening the GUI
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Capture | 0/2 | In progress | - |
| 2. Canvas Editor and Beautification | 0/3 | Not started | - |
| 3. Export, Presets, and CLI | 0/TBD | Not started | - |
