# Roadmap: OpenShots

## Overview

Three phases deliver the full v1.0 screenshot beautifier. Phase 1 builds the Tauri foundation and screenshot capture pipeline — the prerequisite everything else sits on. Phase 2 builds the entire canvas editing surface: backgrounds, styling, annotations, privacy tools, and editing primitives. Phase 3 completes the value chain with export formats, reusable presets, and the CLI batch processing differentiator.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation and Capture** - Tauri app shell, IPC architecture, canvas scaffold, and screenshot capture across all platforms
- [ ] **Phase 2: Canvas Editor and Beautification** - Full editing surface: backgrounds, styling, annotations, privacy tools, editing, and keyboard shortcuts
- [ ] **Phase 3: Export, Presets, and CLI** - Export to PNG/JPEG/WebP, reusable presets, clipboard, and CLI batch processing

## Phase Details

### Phase 1: Foundation and Capture ✅ COMPLETE
**Goal**: The app runs on macOS, Windows, and Linux; users can capture screenshots via global hotkey and system tray without leaving their workflow
**Depends on**: Nothing (first phase)
**Completed**: 2026-04-09
**Requirements**: CAPT-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05, CAPT-06
**Success Criteria** (all verified TRUE):
  1. ✅ User can capture a selected region, full screen, or specific window via global hotkey on macOS and Windows
  2. ✅ User can access the app and trigger captures from the system tray menu on all three platforms
  3. ✅ User can configure custom hotkeys for each capture mode in settings
  4. ✅ User on Linux (Wayland) can trigger capture via system tray click when global hotkeys are unavailable, and sees an informational banner explaining the limitation
  5. ✅ macOS prompts the user to grant Screen Recording permission on first capture and provides a recovery path when permission is revoked
**Plans**: 2/2 complete
Plans:
- [x] 01-01-PLAN.md — Rust install, Tauri scaffold, layered project structure, typed IPC contracts
- [x] 01-02-PLAN.md — System tray, global shortcuts, xcap capture pipeline, region overlay, window picker, hotkey settings, Wayland fallback

**Additional work delivered beyond plan:**
- Full UI redesign (Apple/Linear.app aesthetic, zinc palette)
- Image upload via file dialog
- macOS system wallpaper browser (HEIC→JPEG via sips)
- Canvas zoom (scroll wheel + UI controls)
- Empty state with clear CTAs
- App icon (dark blue viewfinder)
- App renamed to OpenShots

### Phase 2: Canvas Editor and Beautification
**Goal**: Users can place screenshots on a canvas, apply beautiful backgrounds and styling, annotate with shapes and text, redact sensitive areas, and perform basic image corrections — all with full undo/redo and keyboard shortcuts
**Depends on**: Phase 1
**Requirements**: CANV-01 through CANV-08, BG-01 through BG-06, STYL-01 through STYL-05, ANNO-01 through ANNO-06, PRIV-01 through PRIV-03, EDIT-01 through EDIT-03, KEYS-01, KEYS-02

⚠️ **ALREADY IMPLEMENTED** (during Phase 1 session — plans need updating):

The following Plan 02-01 features are ALREADY BUILT and working:
- Canvas store (Zustand + zundo undo/redo) ✅
- Tool store ✅
- Konva Stage with 4 layers (Background, Screenshot, Privacy, Annotation) ✅
- BackgroundLayer (solid, linear-gradient, radial-gradient, image) ✅
- ScreenshotLayer + ScreenshotNode (drag, resize, rotate, corners, shadow, border, flip) ✅
- BackgroundPanel (gradient presets, solid presets, custom colors, image upload, system wallpapers) ✅
- StylePanel (padding, corners, shadow, inset border, flip, fan layout) ✅
- AspectRatioPanel (preset picker) ✅
- File drop handler ✅
- Color analysis (auto-match inset border) ✅
- Fan layout algorithm ✅
- Aspect ratio presets ✅

The following Plan 02-02 features are ALREADY BUILT:
- AnnotationLayer with Transformer ✅
- Arrow, Rectangle, Ellipse, Text, Emoji annotations ✅
- Privacy regions (blur, pixelate) ✅
- Flip H/V ✅

The following Plan 02-03 features are ALREADY BUILT:
- useHotkeys with SHORTCUT_REGISTRY ✅
- ShortcutsModal ✅
- Undo/Redo (Cmd+Z / Cmd+Shift+Z) ✅
- Delete/Backspace to remove selected ✅
- Tool switching via keyboard (V, A, R, E, T, M, B, P) ✅

**NOT YET IMPLEMENTED** (remaining Phase 2 work):
- Snap guides during drag
- Background removal (Transformers.js + RMBG-1.4 in Web Worker)
- Crop overlay (interactive crop with Enter to confirm)
- Blur/grain Konva filters on background (grain not rendering)

**Plans**: 3 plans (most work already done, plans need summary/update)
Plans:
- [ ] 02-01-PLAN.md — Canvas store, Konva Stage, BackgroundLayer, ScreenshotLayer, tool panels (**~95% already built**)
- [ ] 02-02-PLAN.md — AnnotationLayer, privacy tools, crop, flip, background removal (**~70% already built**, missing: bg removal, crop overlay, snap guides)
- [ ] 02-03-PLAN.md — Keyboard shortcuts, shortcut modal (**100% already built**)
**UI hint**: yes

### Phase 3: Export, Presets, and CLI
**Goal**: Users can export polished visuals in multiple formats, save canvas configurations as reusable presets, and batch-process screenshots from the command line using those presets
**Depends on**: Phase 2
**Requirements**: EXPO-01, EXPO-02, EXPO-03, EXPO-04, EXPO-05, PRES-01, PRES-02, PRES-03, CLI-01, CLI-02, CLI-03

⚠️ **PARTIALLY IMPLEMENTED** (during earlier sessions):
- Export to PNG/JPEG/WebP with quality slider ✅
- Scale selector (1x, 2x, 3x) ✅
- Copy to clipboard ✅
- Save to file via native dialog ✅
- Preset save/apply/delete ✅

**NOT YET IMPLEMENTED:**
- CLI batch processing mode
- CLI preset application

**Success Criteria** (what must be TRUE):
  1. ✅ User can export the canvas as PNG, JPEG, or WebP at a chosen resolution and save to a file via native dialog
  2. ✅ User can copy the finished canvas image directly to the system clipboard in one action
  3. ✅ User can save the current canvas configuration as a named preset and apply any saved preset in one click
  4. ❌ User can run CLI batch processing from the terminal (NOT YET)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Capture | 2/2 | ✅ Complete | 2026-04-09 |
| 2. Canvas Editor and Beautification | 0/3 | ~85% built (plans need summaries) | - |
| 3. Export, Presets, and CLI | 0/TBD | ~80% built (missing CLI) | - |
