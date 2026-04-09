# Roadmap: OpenShots

## Overview

Four phases deliver the v1.0 release. Phase 1 (complete) built the Tauri foundation and capture pipeline. Phase 2 finishes the canvas editor's remaining features. Phase 3 prepares the project for open-source release with CI/CD and cross-platform builds. Phase 4 ships a landing page with download links. CLI batch processing is deferred to v1.1.

## Phases

- [x] **Phase 1: Foundation and Capture** — Tauri app shell, IPC, screenshot capture, system tray, hotkeys
- [ ] **Phase 2: Canvas Editor Polish** — Remaining canvas features: snap guides, background removal, crop, grain
- [ ] **Phase 3: OSS Release Prep** — README, LICENSE, GitHub repo, CI/CD, cross-platform build pipeline
- [ ] **Phase 4: Landing Page** — Marketing site with download links, deployable to Vercel or GitHub Pages

## Phase Details

### Phase 1: Foundation and Capture ✅ COMPLETE
**Goal**: App runs cross-platform; users capture screenshots via hotkey and system tray
**Completed**: 2026-04-09
**Plans**: 2/2 complete

Also delivered beyond plan: UI redesign (Apple/Linear aesthetic), image upload, wallpaper browser, canvas zoom, empty state, app icon, rename to OpenShots. Canvas editor (Phase 2 scope) was ~85% implemented in this session.

### Phase 2: Canvas Editor Polish
**Goal**: Finish remaining canvas features not yet implemented
**Depends on**: Phase 1

**Already built** (from Phase 1 session):
- Konva Stage with 4 layers, Zustand + zundo undo/redo ✅
- ScreenshotNode with drag/resize/rotate/corners/shadow/border/flip ✅
- BackgroundLayer (solid, gradient, radial, image + wallpapers) ✅
- AnnotationLayer (arrow, rect, ellipse, text, emoji + Transformer) ✅
- Privacy regions (blur, pixelate) ✅
- All panels (Background, Style, Tool, AspectRatio, Export, Preset) ✅
- Keyboard shortcuts + modal ✅
- Export PNG/JPEG/WebP + clipboard + presets ✅
- Padding, zoom, upload ✅

**Remaining work:**
1. Snap guides during image drag
2. Background removal (Transformers.js + RMBG-1.4 Web Worker)
3. Interactive crop overlay (draw + Enter to confirm)
4. Grain filter rendering on canvas

**Plans**: TBD (small scope — may be 1 plan)

### Phase 3: OSS Release Prep
**Goal**: Project is ready for public GitHub release with automated cross-platform builds
**Depends on**: Phase 2

**Deliverables:**
1. README.md — hero description, feature list, screenshots, install instructions, build from source
2. LICENSE — MIT
3. CONTRIBUTING.md — dev setup, PR guidelines, code style
4. .github/workflows/ci.yml — build + test on PR (macOS, Windows, Linux)
5. .github/workflows/release.yml — on tag push: build all platforms, create GitHub Release, attach .dmg/.msi/.AppImage/.deb
6. GitHub repo creation + push
7. .gitignore audit

**Plans**: TBD

### Phase 4: Landing Page
**Goal**: Public-facing site where users discover the app and download it
**Depends on**: Phase 3 (needs repo + release URLs)

**Deliverables:**
1. Static site (HTML/CSS or lightweight framework)
2. Hero section with app screenshot
3. Feature highlights (capture, beautify, export — all offline)
4. Download buttons per OS (pull latest release from GitHub API)
5. Deploy to Vercel or GitHub Pages
6. Open-source badge, GitHub link

**Plans**: TBD

## Deferred to v1.1

- **CLI batch processing** — `openshots beautify --preset <name> --input <glob> --output <dir>`
- **Background removal** (may ship in v1.0 if time permits)

## Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| 1. Foundation and Capture | ✅ Complete (2/2 plans) | 2026-04-09 |
| 2. Canvas Editor Polish | Remaining items only | - |
| 3. OSS Release Prep | Not started | - |
| 4. Landing Page | Not started | - |
