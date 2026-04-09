# Contributing to OpenShots

Thanks for your interest in contributing! OpenShots is a Tauri 2.x desktop app with a Rust backend and React/TypeScript frontend.

## Development Setup

### Prerequisites

- [Rust](https://rustup.rs/) 1.77.2+ (stable)
- [Node.js](https://nodejs.org/) 18+
- npm
- Platform-specific Tauri dependencies: [tauri.app/start/prerequisites](https://v2.tauri.app/start/prerequisites/)

### Getting Started

```bash
git clone https://github.com/terryosayawe/openshots.git
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
```

## Code Style

- **TypeScript**: No explicit type annotations where inference works. No unnecessary comments.
- **Rust**: Standard `cargo fmt` formatting. Handle errors with `Result<T, String>`.
- **CSS**: Tailwind utility classes. No custom CSS unless absolutely needed.
- **Components**: Functional components only. Zustand for state, not React context.

## Making Changes

1. Fork and create a branch from `main`
2. Make your changes
3. Verify: `npx tsc --noEmit` (TypeScript) and `cargo check` (Rust) pass
4. Test the app: `npx tauri dev`
5. Submit a PR with a clear description of what and why

## Architecture Principles

- **Offline first**: No network calls for core features
- **Rust for heavy work**: Image processing, file I/O, capture all happen in Rust
- **Data URLs for IPC**: Images transfer as JPEG data URLs between Rust and frontend (not file paths)
- **Zustand + zundo**: Canvas state with undo/redo. Selection state excluded from history.
- **No unnecessary abstractions**: Simple code over clever patterns

## Reporting Issues

Open an issue on GitHub with:
- What you expected vs what happened
- Steps to reproduce
- Your OS and version
- Console errors (right-click app > Inspect > Console)
