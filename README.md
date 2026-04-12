# OpenShots

Turn raw screenshots into polished, shareable visuals in seconds. Free, open-source, and completely offline.

OpenShots is a cross-platform desktop app built with Tauri (Rust + React). Capture screenshots, add beautiful backgrounds, annotate with shapes and text, blur sensitive areas, and export polished results without leaving the app or sending data anywhere.

**Built by the [TraceKit](https://github.com/Tracekit-Dev) team** — the makers of TraceKit APM.

## Features

**Capture**
- Full screen, region selection, or specific window capture
- Global hotkeys (configurable)
- System tray quick access
- Self-timer, Retina downscale, and crosshair-assisted capture
- macOS Screen Recording permission handling

**Beautify**
- Gradient, solid color, or custom image backgrounds
- macOS system wallpapers built-in
- Adjustable padding, rounded corners, drop shadows
- Auto-matched inset borders
- Multiple images with fan layout
- Window chrome and device mockup frames

**Annotate**
- Arrows, rectangles, ellipses, text labels, emoji
- Speech bubbles, spotlight overlays, and numbered callouts
- Blur and pixelate regions for privacy
- Drag, resize, rotate any element
- Full undo/redo history

**Export**
- PNG, JPEG, WebP with quality control
- 1x, 2x, 3x scale export
- One-click clipboard copy
- OS share sheet integration
- Save/apply reusable presets
- Import/export presets as JSON
- Auto-save projects and reopen recent work

**Automation**
- Full CLI for batch processing, annotation, privacy, and export
- All commands support an optional `--preset` flag for beautification
- Manage presets: create, copy, edit, inspect
- See [CLI Reference](#cli-reference) below

## Install

Download the latest release for your platform:

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | [.dmg](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_2.0.4_aarch64.dmg) |
| macOS (Intel) | [.dmg](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_2.0.4_x64.dmg) |
| Windows | [.msi](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_2.0.4_x64_en-US.msi) |
| Linux (AppImage) | [.AppImage](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_2.0.4_amd64.AppImage) |
| Linux (deb) | [.deb](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_2.0.4_amd64.deb) |

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

## CLI Reference

OpenShots includes a CLI (`openshots-cli`) for batch processing and automation. After building from source, the binary is at `src-tauri/target/debug/openshots-cli` (or `release/` for production builds).

### Presets

Presets define the beautification style: background, padding, corner radius, shadow, and inset border. 7 built-in presets ship with OpenShots. User presets are stored in `~/.openshots/presets.json`.

```bash
# List all available presets
openshots-cli list-presets

# Show full config of a preset
openshots-cli show-preset ocean

# Copy a built-in preset for customization
openshots-cli copy-preset ocean --new-name my-ocean

# Create a new preset from scratch
openshots-cli create-preset my-brand

# Open presets file in your $EDITOR
openshots-cli edit-presets
```

### Beautify

Apply a preset to one or more screenshots. Adds background, padding, corner radius, shadow, and inset border.

```bash
# Single image
openshots-cli beautify --preset ocean --input screenshot.png --output ./out --format png

# Batch process with glob
openshots-cli beautify --preset clean-dark --input "screenshots/*.png" --output ./out --format png

# Export as WebP
openshots-cli beautify --preset vibrant-sunset --input shot.png --output ./out --format webp --quality 85
```

### Annotate

Add text annotations to images. Use `--preset` to also apply beautification.

```bash
# Text on raw image
openshots-cli annotate --input shot.png --output annotated.png \
  --text "Draft" --text-x 50 --text-y 50 --font-size 48 --color "#ff0000"

# Text + preset beautification
openshots-cli annotate --input shot.png --output styled.png \
  --text "v2.0" --text-x 20 --text-y 20 --font-size 32 --color "#ffffff" \
  --preset ocean
```

### Privacy

Pixelate regions to hide sensitive content. Coordinates are `x,y,width,height`. Use `;` to separate multiple regions.

```bash
# Pixelate a region
openshots-cli privacy --input shot.png --output redacted.png \
  --regions "100,100,300,200" --intensity 20

# Multiple regions + preset
openshots-cli privacy --input shot.png --output styled.png \
  --regions "100,100,300,200;500,50,150,100" --intensity 25 \
  --preset clean-dark
```

### Export

Convert format, adjust quality, or scale. Use `--preset` to beautify during export.

```bash
# Convert PNG to WebP
openshots-cli export --input shot.png --output shot.webp --format webp --quality 80

# Export at 2x scale
openshots-cli export --input shot.png --output shot@2x.png --format png --scale 2

# Convert + beautify
openshots-cli export --input shot.png --output styled.webp --format webp --quality 85 --preset ocean
```

### Render

Render an `.openshots` project file to an image.

```bash
openshots-cli render --input project.openshots --output final.png --format png --quality 90
```

## Community

Join the [TraceKit Discord](https://discord.gg/huSuJ94k) for questions, feedback, and discussion.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](LICENSE)

---

<p align="center">
  Built by <a href="https://github.com/Tracekit-Dev">TraceKit</a>
</p>
