<!-- GSD:project-start source:PROJECT.md -->
## Project

**Screenshots**

An open-source, cross-platform desktop app for capturing and beautifying screenshots. Built with Tauri (Rust backend + React/TypeScript frontend), it lets users take screenshots, add beautiful backgrounds, annotate with arrows/shapes/text, compose multiple images, blur sensitive areas, remove backgrounds, and export polished visuals — all offline, all free. A TinyShots alternative that runs on Mac, Windows, and Linux.

**Core Value:** Users can turn raw screenshots into polished, shareable visuals in seconds — without leaving the app.

### Constraints

- **Tech stack**: Tauri 2.x + React + TypeScript — cross-platform requirement drives this choice
- **Offline**: All processing must happen locally, no network calls for core features
- **Performance**: Image operations must feel instant (<100ms for common operations)
- **Binary size**: Target <20MB installer (Tauri advantage over Electron)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tauri | 2.10.3 (latest stable) | Desktop shell, native OS APIs, Rust backend | Smallest binary footprint vs Electron (~3-5 MB vs ~80 MB). Rust backend handles image processing at native speed. Official plugins cover global shortcuts, clipboard, file dialog, system tray — all required for this app. Cross-platform from one codebase (macOS/Windows/Linux). |
| React | 19.x | UI component tree | Largest OSS contributor pool. react-konva (canvas library) is React-native. Most Tauri 2 templates and community examples target React. |
| TypeScript | 5.x | Type safety across frontend + Tauri IPC types | Tauri auto-generates TypeScript bindings for Rust commands. Catching IPC contract mismatches at compile time is critical for a canvas editor where data shapes are complex. |
| Vite | 6.x | Frontend build tool + dev server | Official Tauri frontend recommendation. First-party `@tailwindcss/vite` plugin. Sub-second HMR during Tauri dev sessions. Tauri points its dev server URL at `localhost:5173` by default. |
| Rust (stable) | 1.77.2+ | Backend image processing, file I/O, CLI | Required by Tauri. The `image` crate handles encode/decode for PNG/JPEG/WebP. Processing in Rust avoids JS thread blocking for export operations. |
### Canvas and Editing Layer
| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Konva.js | latest (9.x) | 2D canvas scene graph — shapes, transforms, hit testing | Built for interactive editors: drag-and-drop, transformer handles (resize/rotate), layering, event system. Best-in-class React integration via `react-konva`. Actively maintained. Alternative Fabric.js has SVG-based rendering that performs worse at high object counts. |
| react-konva | 19.2.3 | React bindings for Konva | Declarative canvas — `<Stage>`, `<Layer>`, `<Rect>`, `<Text>`, `<Image>` map directly to React component model. Eliminates imperative canvas bookkeeping. Current version (19.2.3) aligns with React 19. |
### AI / On-Device Processing
| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| @huggingface/transformers (Transformers.js) | v3.x | Background removal using RMBG-1.4 model | Runs RMBG-1.4 entirely in-browser via WebAssembly + WebGPU. No server calls — satisfies the offline/privacy requirement. On an M1 Pro: ~0.5s for 4K images with WebGPU. v3 required for WebGPU support. Falls back to WASM on non-GPU paths. |
### State Management
| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Zustand | 5.x | Global app state (canvas elements, tool selection, history, presets) | Single-store model maps well to a canvas editor's centralised state (selected tool, active canvas, element list). Simpler than Redux with no boilerplate. Widely validated for editor-type apps. Jotai's atomic model is better for granular derived state but adds mental overhead for the history/undo system that Zustand handles cleanly with middleware. |
### UI / Styling
| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Tailwind CSS | v4.x | Utility-first styling | v4 ships a first-party Vite plugin (`@tailwindcss/vite`) — zero config beyond `@import "tailwindcss"`. 5x faster full builds, 100x faster incremental. Pairs with shadcn/ui without friction. |
| shadcn/ui | latest (December 2025 release) | Accessible component primitives (dialogs, sliders, dropdowns, tooltips) | Copy-paste components mean no hidden abstractions. Built on Radix UI primitives. The `tauri-ui` starter confirms it works well in Tauri desktop contexts (native-looking window controls, dark mode, ~2 MB bundle). Replaces building custom accessible widgets from scratch. |
### Tauri Official Plugins
| Plugin | Version | Purpose | Why |
|--------|---------|---------|-----|
| tauri-plugin-global-shortcut | 2.x | Register system-wide hotkeys (e.g. Cmd+Shift+S) | Official plugin. Required for screenshot capture trigger without app focus. |
| tauri-plugin-clipboard-manager | 2.x | Copy exported image to clipboard | Official plugin. Essential UX feature. |
| tauri-plugin-dialog | 2.x | Native file save/open dialogs | Official plugin. Cleaner than custom JS dialogs for file export. |
| tauri-plugin-store | 2.x | Persist canvas presets, user preferences | Official plugin. JSON-backed persistent storage — no SQLite needed for this use case. |
| tauri-plugin-shell | 2.x | Spawn CLI subprocess from GUI (or expose CLI entry point) | Official plugin. The CLI batch processing mode can be a separate Rust binary, but Shell plugin allows GUI to delegate to it. |
| tauri-plugin-window-state | 2.x | Persist window size/position across launches | Official plugin. Expected desktop app behaviour. |
### Rust Crates (Backend)
| Crate | Version | Purpose | Why |
|-------|---------|---------|-----|
| image | 0.25.x | PNG/JPEG decode + encode, basic transforms (crop, flip, rotate, resize) | Standard Rust image crate. Supports PNG, JPEG, WebP natively. Pure Rust. Used widely in Tauri image processing examples. |
| webp | 0.3.x | High-quality lossy WebP encoding via libwebp | The `image` crate's pure-Rust WebP encoder only does lossless. For production-quality lossy WebP export, `webp` wraps libwebp and delivers better compression ratios. |
| rayon | 1.x | Parallel pixel processing for blur/pixelate operations | Data-parallel iterator model. Blur and pixelate operations over large images benefit from multi-core parallelism. Trivial to add: `.par_iter()` over pixel rows. |
| clap | 4.x | CLI argument parsing for batch processing mode | Tauri's CLI plugin uses clap under the hood. For the standalone CLI binary, clap is the de-facto standard. |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | Unit testing frontend (components, canvas logic, state) | Vite-native. Use `vitest-canvas-mock` for canvas API mocking. Mock Tauri APIs with `@tauri-apps/api/mocks`. |
| React Testing Library | Component interaction tests | Standard companion to Vitest for React. |
| Prettier + ESLint | Code formatting and linting | `eslint-plugin-react-hooks` is mandatory for canvas editor's complex hook usage. |
| cargo test | Rust backend unit tests | Test image encode/decode pipelines and CLI commands in isolation. |
| Tauri CLI (`cargo tauri`) | Build, dev, bundle | `cargo tauri dev` spins up Vite + Tauri simultaneously. `cargo tauri build` produces platform installers. |
## Installation
# Scaffold project (choose React + TypeScript when prompted)
# Canvas rendering
# State management
# UI components and styling
# On-device AI (background removal)
# Tauri plugins (JS side)
# Dev dependencies
# src-tauri/Cargo.toml additions
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Konva.js + react-konva | Fabric.js | If you need SVG output or advanced text rendering (Fabric.js has richer text/font support). Fabric underperforms with many objects; Konva wins for interactive annotation layers. |
| Konva.js + react-konva | Raw HTML5 Canvas API | Never for this app. Managing z-ordering, hit testing, selection handles, and undo manually on raw canvas is months of work Konva provides for free. |
| Zustand | Jotai | If the state model becomes heavily derived and interdependent (e.g., real-time collaborative editing). Jotai's atomic re-render optimization pays off at that scale. For a local editor, Zustand's simplicity wins. |
| Zustand | Redux Toolkit | Redux is justified only if you need time-travel debugging tooling or work in a large team where strict action patterns prevent foot guns. Overhead isn't worth it here. |
| Transformers.js (RMBG-1.4) | External API (Remove.bg, Clipdrop) | Never — privacy-first requirement explicitly excludes network calls. On-device is the only option. |
| Transformers.js (RMBG-1.4) | Rust-side ONNX (ort crate) | Viable if model inference needs GPU acceleration beyond WebGPU's reach. More complex build pipeline. Revisit if Transformers.js performance is insufficient on target hardware. |
| shadcn/ui | Mantine / Radix primitives directly | Mantine bundles more — bigger footprint. Radix alone requires styling every component from scratch. shadcn/ui is the right middle ground for a desktop app aiming for <20 MB binary. |
| Tailwind CSS v4 | CSS Modules / styled-components | CSS Modules fine for small projects; at canvas editor scale with dark mode, theming, and shadcn/ui integration, Tailwind utility classes win on maintainability. |
| image crate (Rust) | Sharp (Node.js) | Sharp is Node.js only — incompatible with Rust backend. Node.js image processing could run in the Vite frontend but cannot leverage multi-core Rust parallelism. Use image crate in Rust. |
| Tauri 2.x | Electron | Electron apps average 80+ MB installers; Tauri targets <20 MB. Electron is justified only if your team has zero Rust exposure and timeline is critically constrained. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Fabric.js | SVG-based rendering engine underperforms vs Canvas at 20+ objects. Mobile-first API not aligned with desktop use. Weaker React integration. | Konva.js + react-konva |
| Three.js / WebGL directly | Massive API surface for 2D operations. No built-in scene graph, selection, or event system. | Konva.js (uses Canvas 2D context efficiently) |
| Redux / Redux Toolkit | Excessive boilerplate for a single-user local editor. No meaningful benefit over Zustand for this domain. | Zustand |
| Electron | 80-150 MB installers, high RAM usage, no Rust backend for native image processing. Contradicts the <20 MB binary constraint. | Tauri 2.x |
| External background removal APIs (Remove.bg, etc.) | Violates offline/privacy requirement. Requires internet, incurs cost, leaks user screenshots. | Transformers.js with RMBG-1.4 |
| Create React App (CRA) | Deprecated, no longer maintained. Webpack-based — slow vs Vite. | Vite (via create-tauri-app scaffold) |
| Recoil | Facebook-internal library, maintenance uncertain, smaller community than Jotai/Zustand. | Zustand |
| tauri-plugin-screenshots (community) | Community plugin, unverified maintenance status. Screenshots should be triggered via global shortcut → Tauri window capture via `webview.capture_image()` API or OS-level screenshot APIs via Shell plugin. | tauri-plugin-global-shortcut + OS screenshot APIs |
## Stack Patterns by Variant
- Fall back from WebGPU path to a smaller model (e.g., `briaai/RMBG-1.4` quantized INT8 variant)
- Or move inference to Rust via `ort` crate (ONNX Runtime for Rust) for CPU-parallel execution
- Benchmark on Windows with integrated GPU early — this is the highest-risk performance path
- Enable Konva's layer caching (`node.cache()`) for static layers (background, borders)
- Move active editing layer to its own Konva `Layer` to limit repaint scope
- Profile with `stage.listening(false)` on non-interactive layers
- Separate Rust binary in `src-tauri/` that shares the image processing logic as a library crate
- GUI calls into the same library; CLI is a thin clap wrapper around it
- Avoid duplicating image processing code between GUI and CLI paths
- Lazy-download model to `$APP_DATA/models/` on first use via Tauri's HTTP client + store plugin
- Show a progress indicator; model is ~176 MB (RMBG-1.4 fp32), cache locally after first download
- Consider the quantized ONNX version (~45 MB) to reduce download burden
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| react-konva@19.2.3 | React 19.x, konva 9.x | Version prefix tracks React major. react-konva 19.x = React 19 support. |
| @tauri-apps/api@2.x | Tauri 2.10.3 | API and Tauri core must be on matching major version. |
| Tailwind CSS v4 | Vite 6.x via `@tailwindcss/vite` | v4 drops PostCSS config — uses Vite plugin only. Do not use `tailwind.config.js` (v3 pattern). |
| shadcn/ui (Dec 2025) | React 19, Tailwind v4, Radix UI or Base UI | Confirm `npx shadcn@latest init` detects Tailwind v4 correctly — it should auto-configure. |
| @huggingface/transformers v3 | WebGPU (Chrome 113+, Edge 113+, Firefox 125+) | WebGPU not available on all Linux GPU drivers — test WASM fallback path on CI. |
| image crate 0.25.x | Rust 1.77.2+ | Matches Tauri's minimum Rust requirement. |
| Tauri 2.10.3 | Rust 1.77.2+, Node 18+ | Tauri requires Node for CLI tooling; Rust for compilation. |
## Sources
- [Tauri 2.10.3 GitHub Releases](https://github.com/tauri-apps/tauri/releases) — latest stable version confirmed
- [Tauri Official Plugin List](https://v2.tauri.app/plugin/) — global-shortcut, clipboard, dialog, store, shell, window-state verified
- [Tauri Vite Setup](https://v2.tauri.app/start/frontend/vite/) — official Vite integration docs
- [react-konva@19.2.3 npm](https://www.npmjs.com/package/react-konva) — current version confirmed
- [Konva.js Best Canvas Library Guide](https://konvajs.org/docs/guides/best-canvas-library.html) — Konva vs Fabric rationale
- [Transformers.js WebGPU background removal](https://medium.com/myorder/building-an-ai-background-remover-using-transformer-js-and-webgpu-882b0979f916) — RMBG-1.4 + WebGPU approach (MEDIUM confidence — single source)
- [Tailwind CSS v4 announcement](https://tailwindcss.com/blog/tailwindcss-v4) — v4 Vite plugin, no PostCSS requirement
- [tauri-ui starter template](https://github.com/agmmnn/tauri-ui) — shadcn/ui + Tauri 2 compatibility confirmed
- [image crate crates.io](https://crates.io/crates/image) — PNG/JPEG/WebP format support
- [Tauri CLI plugin docs](https://v2.tauri.app/plugin/cli/) — clap integration confirmed
- [Vitest canvas mock](https://github.com/vitest-dev/vitest/discussions/6636) — Tauri frontend testing patterns
- State management comparison (2025): [DEV Community](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k), [React Libraries](https://www.reactlibraries.com/blog/zustand-vs-jotai-vs-valtio-performance-guide-2025) — Zustand recommendation MEDIUM confidence (multiple WebSearch sources, no Context7 verification)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
