# Contributing to OpenShots

Thanks for your interest in contributing! OpenShots is a Tauri 2.x desktop app with a Rust backend and React/TypeScript frontend. Built by [TraceKit](https://www.tracekit.dev).

## Development Setup

### Prerequisites

- [Rust](https://rustup.rs/) 1.77.2+ (stable)
- [Node.js](https://nodejs.org/) 18+
- npm
- Platform-specific Tauri dependencies: [tauri.app/start/prerequisites](https://v2.tauri.app/start/prerequisites/)

### Getting Started

```bash
git clone https://github.com/Tracekit-Dev/openshots.git
cd openshots
npm install
npx tauri dev
```

This starts both the Vite dev server and the Tauri app. Hot-reload works for frontend changes; Rust changes trigger a recompile.

## Project Structure

```
src/                     # React/TypeScript frontend
  components/
    canvas/              # Konva canvas layers and nodes
    capture/             # Region overlay, window picker
    panels/              # Sidebar panels (background, style, export, etc.)
    shell/               # Settings, shortcuts modal, wayland banner
  hooks/                 # React hooks (capture flow, hotkeys)
  ipc/                   # Typed Tauri IPC wrappers
  stores/                # Zustand stores (app, canvas, tool, preset)
  lib/                   # Utilities (color analysis, fan layout, aspect ratios)

src-tauri/               # Rust backend
  src/
    commands/
      capture.rs         # Screenshot capture, file reading, wallpaper conversion
      export.rs          # Image export (PNG/JPEG/WebP)
    lib.rs               # App setup, tray, shortcuts, plugin registration
    main.rs              # Entry point

www/                     # Landing page (static HTML, deployed to Vercel)
```

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Tauri | 2.x | Desktop shell, native OS APIs, Rust backend |
| React | 19.x | UI components |
| TypeScript | 5.x | Type safety |
| Vite | 6.x+ | Frontend build tool |
| Konva.js | 10.x | 2D canvas rendering (react-konva 19.x) |
| Zustand | 5.x | State management (with zundo for undo/redo) |
| Tailwind CSS | v4 | Styling (via @tailwindcss/vite plugin) |
| Rust `image` crate | 0.25.x | PNG/JPEG encode/decode in backend |
| xcap | 0.9.x | Cross-platform screen capture |

### Version Compatibility

| Package | Requires | Notes |
|---------|----------|-------|
| react-konva 19.x | React 19.x | Version prefix matches React major |
| @tauri-apps/api 2.x | Tauri 2.x | Must match Tauri core version |
| Tailwind CSS v4 | Vite 6.x+ | Uses Vite plugin, no PostCSS config |

## Code Style

- **TypeScript**: No explicit type annotations where inference works. No unnecessary comments.
- **Rust**: Standard `cargo fmt` formatting. Handle errors with `Result<T, String>`.
- **CSS**: Tailwind utility classes. No custom CSS unless absolutely needed.
- **Components**: Functional components only. Zustand for state, not React context.

## Architecture Principles

- **Offline first**: No network calls for core features
- **Rust for heavy work**: Image processing, file I/O, capture all happen in Rust
- **Data URLs for IPC**: Images transfer as JPEG data URLs between Rust and frontend (not file paths)
- **Zustand + zundo**: Canvas state with undo/redo. Selection state excluded from history via `partialize`.
- **Konva layer architecture**: Background → Screenshot → Privacy → Annotation (z-order)
- **No unnecessary abstractions**: Simple code over clever patterns

## What NOT to Use

These have been evaluated and rejected for this project:

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Fabric.js | SVG-based rendering, underperforms at scale | Konva.js + react-konva |
| Three.js / WebGL | Overkill for 2D operations | Konva.js |
| Redux / Redux Toolkit | Too much boilerplate for a local editor | Zustand |
| Electron | 80-150MB installers, high RAM | Tauri 2.x |
| External APIs (Remove.bg, etc.) | Violates offline/privacy requirement | Local processing only |
| Create React App | Deprecated, slow | Vite |
| CSS Modules / styled-components | Tailwind is already in use | Tailwind CSS v4 |
| Raw HTML5 Canvas API | No scene graph, hit testing, or selection | Konva.js |

## Making Changes

1. Fork and create a branch from `main`
2. Make your changes
3. Verify: `npx tsc --noEmit` (TypeScript) and `cargo check` (Rust) pass
4. Test the app: `npx tauri dev`
5. Submit a PR with a clear description of what and why

## Reporting Issues

Open an issue on GitHub with:
- What you expected vs what happened
- Steps to reproduce
- Your OS and version
- Console errors (right-click app > Inspect > Console)

## Community

Join the [TraceKit Discord](https://discord.gg/huSuJ94k) to discuss development, ask questions, or share feedback.
