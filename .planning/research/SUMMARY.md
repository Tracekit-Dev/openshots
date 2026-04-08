# Project Research Summary

**Project:** Screenshots — Cross-Platform Screenshot Beautifier
**Domain:** Desktop image editor / screenshot beautifier (Tauri 2.x + React/TypeScript)
**Researched:** 2026-04-09
**Confidence:** HIGH (stack, features, architecture, pitfalls all verified from official and community sources)

## Executive Summary

This is a cross-platform desktop screenshot beautifier — a category occupied exclusively by Mac-only paid tools (CleanShot X, TinyShots, Shottr, Xnapper) and a Windows-only open-source tool (ShareX). The primary competitive moat is the combination of: cross-platform support (macOS + Windows + Linux), open source/free, offline-first/privacy-first, and a feature set that matches or exceeds the best Mac-only alternatives. The recommended approach is Tauri 2.x as the desktop shell with React/TypeScript in the frontend and Rust for all image processing — this delivers the <20 MB binary target while enabling native-speed pixel operations that would block the browser thread if implemented in JavaScript.

The architecture follows a clear three-layer model: a React/Konva canvas editor in the WebView handles composition and UI; a Zustand state layer drives all canvas mutations through an undo-safe object model; and a Rust backend handles screenshot capture, image processing (blur, pixelate, background removal via ONNX), and export encoding. IPC between the layers is typed via tauri-specta and must never carry raw image pixel data — large image transfers go through the asset protocol or temp files, not JSON payloads. Background removal is the most technically complex feature, requiring a separately downloaded ~45–170 MB ONNX model cached to the app data directory.

The two highest-impact risks are: (1) IPC image transfer becoming a bottleneck if raw pixel data flows over `invoke()` — this must be an architectural constraint from day one, not a retrofit; and (2) undo/redo exhausting memory if history snapshots pixel data rather than the object model. Both pitfalls are cheap to prevent upfront and expensive to fix after the codebase is built. A secondary risk is cross-platform rendering divergence: Tauri uses three different WebView engines (WebKit/macOS, WebView2/Windows, WebKitGTK/Linux), and CSS effects like `backdrop-filter` and font weight are not equivalent across them — CI must run on all three platforms from phase 1.

## Key Findings

### Recommended Stack

The stack is well-established with high confidence on the core choices and medium confidence on the AI/ML layer. Tauri 2.x is unambiguously correct for this domain — it delivers the smallest binary footprint (~3–5 MB vs Electron's ~80 MB), a Rust backend for native image processing speed, and official plugins covering every required OS integration (global shortcuts, clipboard, file dialogs, system tray, persistent storage). The canvas layer uses Konva.js with react-konva bindings — the only viable choice for an interactive React canvas editor with selection handles, transformers, layering, and undo.

The AI layer (on-device background removal) uses Transformers.js v3 with the RMBG-1.4 model via WebGPU, falling back to WASM. This is a MEDIUM-confidence choice: it satisfies the privacy/offline requirement and achieves ~0.5s on M1 Pro, but Windows integrated GPU paths and Linux GPU driver variability need early benchmarking. The alternative (Rust-side ONNX via `ort` crate) is more complex but provides a GPU-independent fallback if Transformers.js performance is insufficient on target hardware.

**Core technologies:**
- **Tauri 2.10.3**: Desktop shell, native OS APIs, Rust backend — smallest binary, official plugin ecosystem
- **React 19 + TypeScript 5**: Frontend UI — largest ecosystem, react-konva alignment, Tauri auto-generates TS bindings
- **Konva.js 9.x + react-konva 19.2.3**: Canvas scene graph — drag/drop, transformer handles, layering, hit testing
- **Zustand 5.x**: State management — single-store model for canvas state, undo/redo via zundo middleware
- **Rust (image 0.25, rayon 1, ort)**: Backend image processing — native speed, multi-core parallelism, no JS thread blocking
- **Transformers.js v3 (RMBG-1.4)**: On-device background removal — WebGPU + WASM fallback, fully offline
- **Tailwind CSS v4 + shadcn/ui**: Styling — v4 Vite plugin, accessible component primitives, confirmed working in Tauri
- **Vite 6**: Build tool — official Tauri recommendation, sub-second HMR

### Expected Features

The MVP (v1.0) must match TinyShots' core feature set as a cross-platform free alternative. The key differentiators are: cross-platform coverage, CLI batch processing (no competitor has this cross-platform), and on-device background removal (no cross-platform alternative exists in open source). Canvas presets are a prerequisite for CLI and must be serializable as JSON from day one.

**Must have (table stakes):**
- Global hotkey + system tray capture (fullscreen, area, window) — users expect capture without app switching
- Canvas editor with gradient/solid/custom image backgrounds — the core "beautify" action
- Padding, drop shadow, rounded corners, aspect ratio presets — baseline polish controls
- Annotation tools: arrows, shapes, text, emoji stickers — universally expected
- Blur/pixelate regions — privacy is non-negotiable; users share screenshots with sensitive data
- Crop, flip horizontal/vertical — basic image correction
- Auto color-matched inset border — key TinyShots differentiator
- Multi-image composition with auto fan-layout — matches TinyShots
- On-device background removal (cross-platform ONNX) — key feature with no cross-platform OSS alternative
- Canvas presets (save/load as JSON) — enables CLI and power-user workflows
- Export: PNG, JPEG, WebP with quality controls + clipboard copy
- CLI for batch processing — developer differentiator with no cross-platform equivalent
- Full keyboard shortcut coverage — required by target developer audience

**Should have (v1.x after launch validation):**
- Scrolling capture — commonly requested but complex per-platform implementation
- Window chrome decoration (macOS/Windows title bar frames) — useful for cross-platform docs
- Additional annotation types: step counters, speech bubbles, spotlights
- Preset import/export for team sharing

**Defer (v2+):**
- Plugin architecture
- Localization beyond English
- ML-based composition suggestions
- Screenshot history with thumbnail browser

### Architecture Approach

The app follows a strict three-layer architecture: React/Konva frontend for composition and UI, Zustand stores for all mutable state, and a Rust backend for all pixel-level operations. The canvas uses a layered composition model (BackgroundLayer, ScreenshotLayer, AnnotationLayer, SelectionLayer) where each layer is an independent Konva `Layer` node — static layers do not re-render when interactive layers change. All IPC calls are wrapped in typed `src/ipc/` modules; no component calls `invoke()` directly. Rust commands are thin and domain-separated (`commands/screenshot.rs`, `commands/image_processing.rs`, `commands/export.rs`); heavy logic lives in models or pure functions. The undo system (zundo middleware over Zustand) stores structural object state only — never pixel data, never HTML elements.

**Major components:**
1. **UI Shell** — Window management, system tray, global hotkey registration via tauri-plugin-global-shortcut
2. **Canvas Editor (React Konva)** — Layered scene graph rendering composite: background + screenshot + annotations + selection UI
3. **State Layer (Zustand)** — canvas.store (elements), tool.store (active tool), history.store (undo/redo via zundo), app.store (window/preferences)
4. **IPC Bridge** — Typed wrappers around `invoke`/`listen`; image data via asset protocol or temp files, not JSON payloads
5. **Rust Backend** — Screenshot capture (xcap), image processing (image-rs, imageproc, ONNX), export encoding (image-rs, webp crate)
6. **CLI Handler** — Headless batch processing entry point reusing Rust image processing library; clap argument parsing

### Critical Pitfalls

1. **IPC image data bottleneck** — Never pass raw pixel arrays through `invoke()`. A 4K image serialized as JSON takes ~200 ms and blocks the render thread. Use `convertFileSrc()` for reads (asset protocol bypasses IPC), write to temp files for processed results, and reserve `invoke` for metadata and control messages only. Must be established in phase 1 — retrofitting every Rust command signature later is high-cost.

2. **Undo/redo memory exhaustion** — Never snapshot pixel data in history. Full-canvas `toDataURL()` snapshots with a 4K image reach 750 MB–2 GB in 50 steps, crashing memory-constrained machines. Store only the structural object model (positions, parameters, image paths) in zundo state. Recompute pixel output from model on demand. Must be decided before annotation tools are built.

3. **Canvas high-DPI blurriness** — The canvas bitmap dimensions must be set to `cssWidth * devicePixelRatio` with a matching CSS scale-back. Missing this makes every element in the editor and every export visibly blurry on Retina/HiDPI displays. Set this in the first canvas component; auditing all draw calls after the fact is expensive.

4. **Linux Wayland global shortcuts silently fail** — Tauri's global-shortcut plugin is disabled on Wayland (the default on modern Ubuntu, Fedora, Pop!_OS) because Wayland intentionally blocks cross-app input interception. No workaround exists. Provide system tray click and CLI invocation as first-class alternatives from day one, and show an informational banner when `WAYLAND_DISPLAY` is detected.

5. **macOS Screen Recording permission resets on app update** — macOS ties Screen Recording permission to the binary hash; every update triggers a re-request (or silent black-screen failure). Build a permission check and recovery UI (deep link to System Preferences) alongside the first capture implementation, not as a polish step.

6. **JPEG export black transparent areas** — JPEG has no alpha channel. Exporting a canvas with transparent regions via `canvas.toBlob('image/jpeg')` fills transparency with black. Always composite onto a background-colored offscreen canvas before JPEG encoding. Easy to prevent in the export module; confusing for users to encounter as a bug.

7. **Background removal model size and first-run UX** — RMBG-1.4 is 40–170 MB. Bundling it violates the <20 MB binary target. Download must be initiated separately (onboarding or Settings), with progress tracking, checksum validation, and graceful degradation (disabled button with tooltip) when the model is not yet downloaded.

## Implications for Roadmap

Based on the dependency graph in FEATURES.md and the build order recommended in ARCHITECTURE.md, the natural phase structure has 7 phases. Architecture drives the ordering: the IPC pattern and canvas foundation must be correct before any features are built on top of them.

### Phase 1: Foundation and IPC Infrastructure
**Rationale:** Nothing else can be built correctly without the Tauri/React scaffold, IPC patterns, cross-platform testing baseline, and canvas foundation. The two most expensive pitfalls (IPC image bottleneck, canvas high-DPI) must be addressed here. A wrong pattern here requires rewriting all downstream code.
**Delivers:** Working Tauri app shell, system tray, typed IPC layer (tauri-specta), layered canvas stage with DPR scaling, Zustand store architecture, CI running on macOS + Windows + Linux, cross-platform CSS baseline (font weight normalization, backdrop-filter fallback)
**Addresses:** Shell and canvas prerequisites from FEATURES.md dependency tree
**Avoids:** IPC bottleneck (Pitfall 1), canvas blurriness (Pitfall 2), cross-platform CSS rendering divergence (Pitfall 6)
**Research flag:** Standard patterns — well-documented in Tauri official docs; skip phase research

### Phase 2: Screenshot Capture
**Rationale:** Capture is the source of every image the editor operates on. No editing or export feature can be validated without real screenshots as input. Must be complete — including permission recovery UI and multi-path activation — before UI features are built on top of it.
**Delivers:** Global hotkey capture (fullscreen, area, window), system tray activation, macOS Screen Recording permission check + recovery flow, Linux Wayland detection + tray fallback, image emitted to frontend as base64 via event
**Addresses:** "Global hotkey capture," "capture area selection," "full-screen and window capture" from table stakes
**Avoids:** macOS permission reset (Pitfall 4), Linux Wayland failure (Pitfall 3)
**Research flag:** Needs phase research — cross-platform xcap/screenshot API integration, macOS entitlements, Windows UIA behavior

### Phase 3: Canvas Editor Core
**Rationale:** All editing features (background, annotations, transforms, privacy tools) plug into the canvas editor. The undo/redo architecture must be settled here, before any mutation paths are built. Changing it later requires rewriting every action.
**Delivers:** Konva Stage with BackgroundLayer/ScreenshotLayer/AnnotationLayer/SelectionLayer, Zustand canvas.store with zundo undo/redo (structural state only), multi-image composition with free-form positioning, basic padding/shadow/rounded-corner controls, aspect ratio presets
**Addresses:** "Canvas editor," "padding/spacing control," "drop shadow," "rounded corners," "canvas aspect ratio presets," "multi-image composition" from features
**Avoids:** Undo/redo memory exhaustion (Pitfall 5), single flat Zustand store anti-pattern, mutable image blobs in Zustand anti-pattern
**Research flag:** Standard patterns — Konva, zundo, and Zustand are well-documented for this use case

### Phase 4: Annotation Tools and Privacy
**Rationale:** Annotations are the most user-visible editing capability after backgrounds. Blur/pixelate are privacy-critical and required for launch. Both build directly on the canvas foundation from Phase 3. Grouping them together validates the full annotation pipeline — including the Rust IPC path for pixel-level privacy operations — before moving to export.
**Delivers:** Arrow, rectangle, ellipse, text, and emoji sticker annotations on the Annotation layer; blur and pixelate region tools (frontend selection + Rust pixel processing via IPC); crop and flip (non-destructive); auto color-matched inset border
**Addresses:** All annotation table stakes and privacy tools from FEATURES.md; differentiating "auto color-matched inset border"
**Avoids:** Processing raw pixels in the WebView (anti-pattern 1); shadowBlur performance trap; re-rendering on every mouse move
**Research flag:** Needs phase research — blur/pixelate IPC data pipeline with large images, color dominance extraction algorithm for inset border

### Phase 5: Export System and Canvas Presets
**Rationale:** Presets are a prerequisite for the CLI (Phase 7) and enable power-user workflows. Export must be complete before presets are useful. Grouping export + presets together ensures all canvas parameters are serializable as a unit — retrofitting serializability later breaks preset schemas. The JPEG transparency bug must be addressed here.
**Delivers:** PNG/JPEG/WebP export with quality controls, copy to clipboard, native file save dialog, canvas presets (save/load/name JSON), preset-driven export from the UI
**Addresses:** "Export to PNG/JPEG/WebP," "copy to clipboard," "reusable canvas presets" from features; all canvas settings serializable
**Avoids:** JPEG export black fill (Pitfall 8); non-serializable preset schemas that break CLI later
**Research flag:** Standard patterns — Tauri dialog plugin, image-rs encoding, Zustand persist are well-documented

### Phase 6: On-Device Background Removal
**Rationale:** This is the most technically complex feature and is isolated enough to defer without blocking the core editor. Isolating it in its own phase allows the download-and-cache infrastructure to be built correctly before inference is integrated, and benchmarking on multiple platforms before shipping.
**Delivers:** ONNX model download-on-demand with progress tracking, checksum validation, and failure recovery; background removal inference (Transformers.js RMBG-1.4 with WebGPU/WASM fallback); graceful degradation when model not downloaded; progress feedback UI (spinner + estimated time + cancel)
**Addresses:** "On-device background removal (cross-platform)" differentiator from FEATURES.md
**Avoids:** Model size in installer (Pitfall 7); UI freeze on first activation; silent download failure
**Research flag:** Needs phase research — Transformers.js WebGPU performance on Windows integrated GPU and Linux GPU drivers; WASM fallback behavior; quantized vs full-precision model trade-offs; consider Rust-side ort crate as fallback if browser-side performance is insufficient

### Phase 7: CLI Batch Processing
**Rationale:** CLI reuses all Rust image processing logic already built. It is frontend-independent and can be built after the GUI is stable. Presets (Phase 5) are a hard prerequisite — the CLI's value proposition is "apply a preset to files."
**Delivers:** Rust CLI binary entry point (clap), `screenshots capture`, `screenshots beautify --preset <name> --input <glob> --output <dir>` commands, path handling for spaces/non-ASCII/100+ file batches
**Addresses:** "CLI for batch processing" differentiator from FEATURES.md — the primary developer-audience hook with no cross-platform alternative
**Avoids:** Duplicating image processing code between GUI and CLI (shared library crate pattern)
**Research flag:** Standard patterns — clap is well-documented; Rust shared library crate pattern is established

### Phase Ordering Rationale

- **Dependency drives order:** Canvas editor depends on screenshot capture (needs real images); presets depend on canvas editor (must serialize all settings); CLI depends on presets (presets are the batch template). The dependency chain is capture → editor → annotations → export/presets → CLI.
- **Pitfall prevention forces early decisions:** The two most expensive pitfalls (IPC image pattern, undo architecture) must be set in Phase 1 and Phase 3 respectively. Both require all downstream code to follow the pattern; establishing them early prevents rewrites.
- **Isolation of complex features:** Background removal (Phase 6) is technically complex and isolated — it can slip without blocking the rest of the roadmap. This provides schedule flexibility without threatening launch.
- **CLI last because it reuses everything:** CLI adds no new architecture, just a new entry point. Building it last means it benefits from all the hardened image processing code with no risk of blocking the GUI.

### Research Flags

Phases needing deeper research during planning:
- **Phase 2 (Screenshot Capture):** Cross-platform screen capture API integration (xcap, macOS entitlements, Windows capture behavior) and macOS permission lifecycle are complex and platform-specific. Official Tauri docs provide the plugin interface but not the platform-specific edge cases.
- **Phase 4 (Annotations and Privacy):** The blur/pixelate IPC pipeline with large images needs design work (region selection in frontend, pixel processing in Rust, result compositing back). The color dominance extraction algorithm for the inset border feature needs a concrete implementation plan.
- **Phase 6 (Background Removal):** Transformers.js WebGPU performance on Windows integrated GPUs and Linux GPU drivers is the highest-risk unknown in the entire project. Early benchmarking on non-Apple hardware should happen before committing to the browser-side approach. The Rust-side `ort` crate alternative should be kept ready.

Phases with standard patterns (skip phase research):
- **Phase 1 (Foundation):** Tauri scaffold, IPC setup, Konva stage initialization, and Zustand stores are all officially documented with examples. High confidence.
- **Phase 3 (Canvas Editor Core):** Konva layered composition and zundo undo/redo are both documented in Konva's official guides and OSS editor codebases.
- **Phase 5 (Export and Presets):** image-rs encoding, Tauri dialog plugin, and Zustand persist are straightforward and well-documented.
- **Phase 7 (CLI):** clap is mature and well-documented; the shared Rust library crate pattern is standard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH (core) / MEDIUM (AI layer) | Tauri, React, Konva, Zustand choices are verified against official docs and active OSS projects. Transformers.js WebGPU on non-Apple hardware is a single-source MEDIUM — needs benchmarking. |
| Features | HIGH | Based on direct analysis of 7 competitors (TinyShots, CleanShot X, Shottr, Xnapper, Skrin, ShareX, Snagit). Feature gaps and differentiators are clear and well-sourced. |
| Architecture | HIGH | Tauri IPC, Konva layer patterns, and Zustand store split are from official docs and battle-tested OSS editors (Excalidraw). ONNX model architecture from active OSS projects. |
| Pitfalls | HIGH (Tauri-specific) / MEDIUM (canvas/rendering) | Tauri IPC, Wayland, macOS permission, and export pitfalls are from GitHub issues and official Tauri discussions with many confirmations. Canvas rendering pitfalls are from MDN and Konva docs. |

**Overall confidence:** HIGH

### Gaps to Address

- **Transformers.js performance on Windows integrated GPU:** Single source for the ~0.5s M1 Pro figure. Must benchmark on a Windows machine with integrated Intel/AMD GPU before Phase 6 planning. If latency is >5s, switch to Rust-side ONNX via `ort` crate.
- **xcap cross-platform screenshot API maturity:** Cited in architecture docs but community plugin status needs verification. Validate `tauri-plugin-screenshots` maintenance status before Phase 2 planning; have a fallback plan (OS-level shell commands via tauri-plugin-shell) if the plugin is unmaintained.
- **Zustand state management recommendation:** Cited from community articles, not official Zustand docs or Context7. Confidence is MEDIUM. Validate the zundo middleware compatibility with Zustand 5.x during Phase 3 setup.
- **WebP export quality:** `image` crate's pure-Rust WebP encoder is lossless only; `webp` crate wraps libwebp for lossy. This adds a C dependency that may complicate cross-compilation. Validate the build pipeline on all three platforms during Phase 5.

## Sources

### Primary (HIGH confidence)
- [Tauri 2.10.3 official docs](https://v2.tauri.app/) — architecture, IPC, plugins, project structure, capabilities, CLI
- [Konva.js official docs](https://konvajs.org/docs/) — canvas layer patterns, undo/redo, performance tips, memory leak prevention
- [react-konva@19.2.3 npm](https://www.npmjs.com/package/react-konva) — version and React 19 compatibility confirmed
- [Tailwind CSS v4 announcement](https://tailwindcss.com/blog/tailwindcss-v4) — Vite plugin, no PostCSS, v4 patterns
- [image crate crates.io](https://crates.io/crates/image) — PNG/JPEG/WebP format support
- [zundo GitHub](https://github.com/charkour/zundo) — Zustand undo/redo middleware
- [tauri-specta GitHub](https://github.com/dannysmith/tauri-template) — TypeScript type generation from Rust

### Secondary (MEDIUM confidence)
- [tauri-plugin-screenshots / xcap — deepwiki](https://deepwiki.com/ayangweb/tauri-plugin-screenshots) — community plugin, cross-platform capture
- [Transformers.js WebGPU background removal — Medium](https://medium.com/myorder/building-an-ai-background-remover-using-transformer-js-and-webgpu-882b0979f916) — RMBG-1.4 approach (single source)
- [rust-background-removal — GitHub](https://github.com/dnanhkhoa/rust-background-removal) — Rust-side ONNX alternative
- [tauri-ui starter — GitHub](https://github.com/agmmnn/tauri-ui) — shadcn/ui + Tauri 2 compatibility
- [State management comparison 2025 — DEV Community](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k) — Zustand recommendation
- [Tauri IPC Performance — Medium](https://medium.com/@srish5945/tauri-rust-speed-but-heres-where-it-breaks-under-pressure-fef3e8e2dcb3) — IPC bottleneck analysis
- [Global Shortcut Wayland — GitHub Issue #3578](https://github.com/tauri-apps/tauri/issues/3578) — confirmed limitation
- [WebKitGTK Font Weight Bug — Medium](https://medium.com/@dasunnimantha777/fonts-render-too-bold-in-rust-tauri-wails-on-linux-a-webkitgtk-bug-and-how-to-fix-it-8b6a0b27b613) — Linux rendering divergence
- [High DPI Canvas — web.dev](https://web.dev/articles/canvas-hidipi) — devicePixelRatio scaling pattern

### Tertiary (LOW confidence — needs validation)
- [Excalidraw two-layer canvas architecture — deepwiki](https://deepwiki.com/excalidraw/excalidraw/5.1-canvas-rendering-pipeline) — architectural reference for layer separation
- [macOS 16 Clipboard Privacy Protection — 9to5Mac](https://9to5mac.com/2025/05/12/macos-16-clipboard-privacy-protection/) — clipboard permission behavior (macOS 16 not yet released)

---
*Research completed: 2026-04-09*
*Ready for roadmap: yes*
