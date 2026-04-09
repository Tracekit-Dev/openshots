# OpenShots

Turn raw screenshots into polished, shareable visuals in seconds. Free, open-source, and completely offline.

OpenShots is a cross-platform desktop app built with Tauri (Rust + React). Capture screenshots, add beautiful backgrounds, annotate with shapes and text, blur sensitive areas, and export — all without leaving the app or sending data anywhere.

**Built by the [TraceKit](https://github.com/Tracekit-Dev) team** — the makers of TraceKit APM.

## Features

**Capture**
- Full screen, region selection, or specific window capture
- Global hotkeys (configurable)
- System tray quick access
- macOS Screen Recording permission handling

**Beautify**
- Gradient, solid color, or custom image backgrounds
- macOS system wallpapers built-in
- Adjustable padding, rounded corners, drop shadows
- Auto-matched inset borders
- Multiple images with fan layout

**Annotate**
- Arrows, rectangles, ellipses, text labels, emoji
- Blur and pixelate regions for privacy
- Drag, resize, rotate any element
- Full undo/redo history

**Export**
- PNG, JPEG, WebP with quality control
- 1x, 2x, 3x scale export
- One-click clipboard copy
- Save/apply reusable presets

**Automation** *(coming soon)*
- CLI for batch processing with preset support
- Agent-friendly interface — let AI tools like Claude Code generate polished visuals automatically
- `openshots beautify --preset <name> --input <glob> --output <dir>`

## Install

Download the latest release for your platform:

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | [.dmg](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_0.1.0_aarch64.dmg) |
| macOS (Intel) | [.dmg](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_0.1.0_x64.dmg) |
| Windows | [.msi](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_0.1.0_x64_en-US.msi) |
| Linux (AppImage) | [.AppImage](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_0.1.0_amd64.AppImage) |
| Linux (deb) | [.deb](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_0.1.0_amd64.deb) |

The macOS builds are code-signed and notarized with an Apple Developer ID certificate.

## Build from source

**Prerequisites:**
- [Rust](https://rustup.rs/) 1.77.2+
- [Node.js](https://nodejs.org/) 18+
- npm

```bash
# Clone the repo
git clone https://github.com/Tracekit-Dev/openshots.git
cd openshots

# Install dependencies
npm install

# Run in development
npx tauri dev

# Build for production
npx tauri build
```

### Platform-specific notes

**macOS:** Requires Screen Recording permission for capture. The app will prompt on first use.

**Linux (Wayland):** Global hotkeys are unavailable on Wayland. Use the system tray to trigger captures.

**Windows:** No special requirements.

## Tech Stack

- **Tauri 2.x** — Rust backend, tiny binaries (<20MB)
- **React 19 + TypeScript** — UI components
- **Konva.js** — Canvas rendering engine
- **Zustand** — State management with undo/redo
- **Tailwind CSS v4** — Styling
- **xcap** — Cross-platform screen capture

## Keyboard Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Capture Full Screen | `Cmd+Shift+4` | `Ctrl+Shift+4` |
| Capture Region | `Cmd+Shift+3` | `Ctrl+Shift+3` |
| Capture Window | `Cmd+Shift+5` | `Ctrl+Shift+5` |
| Undo | `Cmd+Z` | `Ctrl+Z` |
| Redo | `Cmd+Shift+Z` | `Ctrl+Shift+Z` |
| Delete selected | `Delete` / `Backspace` | `Delete` / `Backspace` |
| Reset zoom | `Cmd+0` | `Ctrl+0` |
| Tools | `V` `A` `R` `E` `T` `M` `B` `P` | Same |

## Community

Join the [TraceKit Discord](https://discord.gg/huSuJ94k) for questions, feedback, and discussion.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[FSL-1.1-MIT](LICENSE) — source available now, converts to MIT on 2030-04-09.

---

<p align="center">
  Built by <a href="https://github.com/Tracekit-Dev">TraceKit</a>
</p>
