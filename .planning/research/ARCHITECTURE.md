# Architecture Research

**Domain:** Screenshot beautifier desktop app (Tauri 2.x + React/TypeScript)
**Researched:** 2026-04-09
**Confidence:** HIGH (Tauri architecture from official docs; canvas editor patterns from established libraries; background removal from active OSS projects)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER (WebView)                     │
├─────────────┬───────────────┬───────────────┬───────────────────┤
│  UI Shell   │  Canvas Editor │  Tool Panels  │  Export UI       │
│  (System    │  (React Konva  │  (Toolbar,    │  (Format, quality │
│   tray,     │   or Fabric.js)│   properties, │   preset picker) │
│   window)   │               │   annotations)│                  │
├─────────────┴───────────────┴───────────────┴───────────────────┤
│                    STATE LAYER (Zustand stores)                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │  Canvas    │  │  Tool      │  │  History   │  │  App      │  │
│  │  Store     │  │  Store     │  │  Store     │  │  Store    │  │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │
├─────────────────────────────────────────────────────────────────┤
│               IPC BRIDGE (@tauri-apps/api invoke/listen)         │
├─────────────────────────────────────────────────────────────────┤
│                    RUST BACKEND (src-tauri)                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ Screenshot │  │  Image     │  │  File I/O  │  │  CLI      │  │
│  │ Capture    │  │ Processing │  │  & Export  │  │  Handler  │  │
│  │ (xcap)     │  │ (image-rs) │  │  Commands  │  │           │  │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │
├─────────────────────────────────────────────────────────────────┤
│             OS / PLATFORM (TAO + WRY + native APIs)              │
│  System tray   Global hotkeys   File system   Clipboard          │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| UI Shell | Window management, system tray icon, hotkey registration | Tauri window APIs, `tauri-plugin-global-shortcut`, system tray menu |
| Canvas Editor | Render composite image (screenshot + bg + annotations), hit-test for selection | React Konva (stage/layer/node model) or Fabric.js |
| Tool Panels | Expose background, annotation, crop, shadow, border controls to user | React component tree driven by tool store state |
| State Layer | Single source of truth for canvas content, active tool, history | Zustand stores + zundo middleware for undo/redo |
| IPC Bridge | Serialize/deserialize calls between WebView and Rust; binary data as base64 or ArrayBuffer | `@tauri-apps/api` invoke/listen, tauri-specta for type safety |
| Screenshot Capture | Call OS screenshot APIs cross-platform, return raw image bytes | `tauri-plugin-screenshots` (wraps xcap crate), supports window/monitor selection |
| Image Processing | Background removal (ONNX/isnet model), blur/pixelate regions, color analysis for border matching | `ort` (ONNX Runtime Rust), `image-rs`, `imageproc` |
| File I/O & Export | Write final composite to disk as PNG/JPEG/WebP at target quality | Rust image-rs encode, Tauri `tauri-plugin-dialog` for save dialog |
| CLI Handler | Accept paths and flags, apply preset transformations, write output without opening window | Separate binary entry point or `--headless` flag via Tauri CLI args |
| Preset Store | Persist canvas size, background, padding presets as JSON | `tauri-plugin-store` (key-value persistence) |

## Recommended Project Structure

```
screenshots/
├── src/                          # React/TypeScript frontend
│   ├── components/
│   │   ├── canvas/               # Canvas stage, layers, annotation nodes
│   │   │   ├── CanvasStage.tsx   # Root Konva Stage, handles resize
│   │   │   ├── BackgroundLayer.tsx
│   │   │   ├── ScreenshotLayer.tsx
│   │   │   └── AnnotationLayer.tsx
│   │   ├── toolbar/              # Tool palette, mode switcher
│   │   ├── panels/               # Properties panels (bg, shadow, border, export)
│   │   └── shell/                # Window chrome, tray-related UI
│   ├── stores/                   # Zustand stores
│   │   ├── canvas.store.ts       # Layer content, transforms, selection
│   │   ├── tool.store.ts         # Active tool, tool options
│   │   ├── history.store.ts      # Undo/redo via zundo middleware
│   │   └── app.store.ts          # Global app state (window mode, recent files)
│   ├── hooks/                    # Custom React hooks
│   │   ├── useCanvasExport.ts    # Triggers export IPC call
│   │   ├── useScreenshot.ts      # Capture flow via IPC
│   │   └── useHotkeys.ts         # In-app keyboard shortcuts (not global)
│   ├── ipc/                      # Typed wrappers around tauri invoke
│   │   ├── screenshot.ts
│   │   ├── imageProcessing.ts
│   │   └── export.ts
│   ├── lib/                      # Pure frontend utilities
│   │   ├── canvasUtils.ts        # Coordinate math, scaling
│   │   ├── colorAnalysis.ts      # Border color matching from image
│   │   └── presets.ts            # Canvas preset definitions
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs                # App setup, register all commands
│   │   ├── main.rs               # Desktop entry (calls lib::run)
│   │   ├── commands/
│   │   │   ├── screenshot.rs     # capture_screen, list_windows commands
│   │   │   ├── image_processing.rs # remove_background, blur_region commands
│   │   │   └── export.rs         # export_image, copy_to_clipboard commands
│   │   ├── models/               # ONNX model loading and inference
│   │   │   └── background_removal.rs
│   │   └── cli.rs                # CLI argument parsing for batch mode
│   ├── capabilities/             # Permission declarations
│   ├── icons/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── index.html
```

### Structure Rationale

- **src/ipc/:** Isolates all `invoke()` calls into typed wrappers. Frontend components never call `invoke` directly — they call `ipc/screenshot.ts` etc. This makes IPC contracts explicit and testable.
- **src/stores/:** Zustand stores are split by concern, not by view. Canvas content is separate from tool state to avoid unnecessary re-renders — a tool change shouldn't re-render canvas nodes.
- **src-tauri/commands/:** One file per domain (screenshot, image processing, export). Commands are thin: validate input, call into a model/service, return result. Heavy logic lives in models/ or pure Rust functions.
- **src-tauri/models/:** Background removal requires loading a ~50MB ONNX model once at startup and keeping it in memory. Isolated here to manage that lifecycle separately from per-request commands.

## Architectural Patterns

### Pattern 1: Layered Canvas Composition

**What:** The canvas is built from discrete, ordered layers — background, screenshot image, annotations, UI chrome. Each layer maps to a separate Konva `Layer` node. Static layers (background) don't re-render when interactive layers (annotations) change.

**When to use:** Any time the canvas has multiple independently-updating visual planes. This is the pattern Konva, Fabric.js, and Excalidraw all use.

**Trade-offs:** Slightly more complex setup than a single canvas; pays off immediately in performance when annotations are being drawn in real time.

**Example:**
```typescript
// CanvasStage.tsx
<Stage width={canvasWidth} height={canvasHeight}>
  <BackgroundLayer />      {/* re-renders only on bg change */}
  <ScreenshotLayer />      {/* re-renders only on image transform */}
  <AnnotationLayer />      {/* re-renders on every annotation edit */}
  <SelectionLayer />       {/* re-renders on mouse events */}
</Stage>
```

### Pattern 2: IPC Command = Serverless Function

**What:** Every Rust function exposed over IPC is treated like a stateless serverless function: receives typed input, returns typed output, does one thing. State that must persist lives in Tauri's managed state (`Arc<Mutex<T>>`) or in `tauri-plugin-store`, never in command arguments.

**When to use:** Always. This keeps commands testable in isolation and prevents IPC from becoming a dumping ground.

**Trade-offs:** Requires upfront discipline on what is state vs what is input. Pays off when debugging — any command can be exercised from the browser devtools console.

**Example:**
```rust
// commands/export.rs
#[tauri::command]
async fn export_image(
    payload: ExportPayload,       // format, quality, destination path
    app: tauri::AppHandle,
) -> Result<String, String> {    // returns saved path or error message
    let bytes = decode_image_data(&payload.image_data)?;
    let output_path = write_image(bytes, &payload.format, payload.quality, &payload.dest)?;
    Ok(output_path)
}
```

### Pattern 3: Offline-First, Rust-Heavy Processing

**What:** All image processing that would be slow or impossible in JavaScript (background removal, pixelation algorithms, high-quality resize) is implemented in Rust and called via IPC. The frontend only handles canvas composition and UI state — it does not process raw pixel arrays.

**When to use:** Any operation touching raw image bytes, running an ML model, or needing deterministic cross-platform output. The boundary: if it operates on pixel data, it belongs in Rust.

**Trade-offs:** Binary data must be serialized for IPC (base64 or Tauri's byte channel). Adds complexity at the boundary but eliminates WASM size concerns and keeps the WebView thread free.

**Example:**
```typescript
// ipc/imageProcessing.ts
export async function removeBackground(imageBase64: string): Promise<string> {
  return invoke<string>('remove_background', { imageData: imageBase64 })
}
```

## Data Flow

### Screenshot Capture Flow

```
User triggers global hotkey (OS-level)
    ↓
Tauri global-shortcut plugin fires callback (Rust)
    ↓
Rust: capture_screen() → xcap → raw image bytes
    ↓
Emit event to frontend: "screenshot-captured" with base64 payload
    ↓
Frontend: useScreenshot hook receives event
    ↓
canvas.store: setScreenshotImage(imageData)
    ↓
ScreenshotLayer re-renders with new image
    ↓
App focuses main window, user sees editor
```

### Editing / Annotation Flow

```
User interacts with tool panel (e.g., adds arrow annotation)
    ↓
tool.store: setActiveTool('arrow')
    ↓
AnnotationLayer: pointer events create annotation node
    ↓
canvas.store: addAnnotation(node) — triggers history snapshot via zundo
    ↓
Konva re-renders annotation layer only
    ↓
Undo: history.store.undo() → canvas.store reverts to previous snapshot
```

### Export Flow

```
User clicks Export / sets format + quality
    ↓
useCanvasExport hook: stage.toDataURL() — renders composite at full resolution
    ↓
invoke('export_image', { imageData, format, quality, dest })
    ↓
Rust: decode base64 → image-rs encode → write to disk
    ↓
Return: saved file path
    ↓
Frontend: show success toast, optionally open in Finder/Explorer
```

### Background Removal Flow

```
User clicks "Remove Background"
    ↓
ipc/imageProcessing.ts: removeBackground(currentImageBase64)
    ↓
Rust: load ONNX model from memory (pre-loaded at startup)
    ↓
Run inference: isnet model → alpha matte
    ↓
Apply matte to original image → RGBA PNG with transparency
    ↓
Return base64 PNG to frontend
    ↓
canvas.store: replaceScreenshotImage(resultBase64)
    ↓
ScreenshotLayer re-renders with transparent background
```

### State Management

```
Zustand canvas.store (source of truth for canvas content)
    ↓ (zundo temporal middleware wraps all mutations)
    ↓ past states []  ←→  current state  ←→  future states []
    ↓
React components subscribe via selectors (minimize re-renders)
    ↓
Actions: addAnnotation / removeAnnotation / updateTransform / setBg...
    ↓
history.store.undo() calls zundo temporal.undo() → canvas reverts
```

## Component Boundaries

| Boundary | Communication | Direction | Notes |
|----------|---------------|-----------|-------|
| React component ↔ Zustand store | Direct import, selector subscription | Bidirectional | Components read via selectors, write via actions |
| React hook ↔ Tauri IPC | `invoke()` / `listen()` in ipc/ wrappers | Frontend → Backend (invoke), Backend → Frontend (events) | Never invoke directly from components |
| Rust command ↔ Rust model | Direct Rust function call | Synchronous or async within Rust | Commands are thin; models hold the logic |
| Rust ↔ OS | xcap, tauri-plugin-global-shortcut, clipboard APIs | Rust → OS | Platform-abstracted by Tauri plugin layer |
| Canvas layer ↔ Canvas layer | Konva Stage renders each Layer in order | Read-only from Stage's perspective | Layers do not communicate; shared state in Zustand |

## Suggested Build Order

Dependencies drive this order — each phase's components are prerequisites for the next.

1. **Shell + IPC scaffolding** — Window management, system tray, global hotkey registration, IPC type generation (tauri-specta). Nothing else works without the process bridge.

2. **Screenshot capture** — Rust capture command, frontend event listener, basic image display. Provides the source image all other features operate on.

3. **Canvas editor core** — Konva stage, layered canvas, Zustand stores, undo/redo. This is the foundation every editing feature plugs into.

4. **Background system** — Gradient/solid/custom image backgrounds. Low complexity, high visual impact, good milestone for first demo.

5. **Annotation tools** — Arrows, shapes, text, emojis. Builds on canvas layer foundation; complex enough to validate the state management approach.

6. **Image transforms** — Crop, flip, rotate, drop shadow, border. Mix of frontend canvas operations and backend pixel manipulation.

7. **Privacy tools** — Blur/pixelate regions. Requires frontend region selection (canvas) + backend processing (Rust); tests the full IPC data pipeline.

8. **Background removal** — ONNX model loading, inference pipeline. Most technically complex; isolated enough to defer without blocking other work.

9. **Export + presets** — Multi-format export, quality controls, canvas presets, copy to clipboard. Required for v1 but doesn't block editor feature development.

10. **CLI mode** — Batch processing entry point. Reuses Rust commands; frontend-independent; good final phase before release.

## Anti-Patterns

### Anti-Pattern 1: Processing Raw Pixels in the WebView

**What people do:** Use Canvas 2D `getImageData()` / `putImageData()` in TypeScript to run blur, pixelation, or background removal filters.

**Why it's wrong:** JavaScript pixel manipulation on a 4K screenshot (4096 × 2160 × 4 bytes = 33MB) blocks the main thread. Background removal models are hundreds of MB — absurd to ship in WASM. The Rust backend exists precisely for this.

**Do this instead:** Send image data to Rust via IPC, process with `image-rs` / `imageproc` / ONNX Runtime, return the result. Keep the WebView for UI, not pixel math.

### Anti-Pattern 2: Single Flat Zustand Store

**What people do:** Put all state — canvas nodes, active tool, history, window state — into one large Zustand store.

**Why it's wrong:** Every state write triggers all subscribers. A mouse-move updating cursor position causes canvas node components to evaluate their selector. At scale this becomes sluggish.

**Do this instead:** Split by update frequency. Tool/cursor state changes every frame. Canvas node state changes on user action. Window/app state changes rarely. Three stores, three update cadences, minimal cross-store coupling.

### Anti-Pattern 3: Storing Mutable Image Blobs in Zustand

**What people do:** Store `HTMLImageElement` or `Blob` objects directly in Zustand state.

**Why it's wrong:** These are non-serializable. Undo/redo snapshots via zundo serialize state — non-serializable objects break this. Also breaks React DevTools and any persistence layer.

**Do this instead:** Store image URLs (`URL.createObjectURL(blob)`) or base64 strings in state. Manage the blob lifecycle separately with a ref or WeakMap. Revoke object URLs on state cleanup.

### Anti-Pattern 4: One Tauri Command File

**What people do:** Put all `#[tauri::command]` functions in `lib.rs` or a single `commands.rs`.

**Why it's wrong:** Screenshot capture, image processing, and export are entirely different concerns. One file grows to thousands of lines. Compilation errors in export code block the whole backend.

**Do this instead:** `commands/screenshot.rs`, `commands/image_processing.rs`, `commands/export.rs`. Register all in `lib.rs` via `generate_handler![screenshot::capture_screen, ...]`.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend UI ↔ Rust backend | `invoke()` for request/response, `emit()` for Rust-initiated events | Global hotkey triggers use events (backend-initiated); export uses invoke (frontend-initiated) |
| Canvas stage ↔ Export pipeline | `stage.toDataURL()` in frontend, then IPC | Canvas renders the composite; Rust handles encoding. Don't re-implement composition in Rust. |
| ONNX model ↔ Rust command | Direct function call in same process | Model loaded once at startup into `Arc<Mutex<Session>>`; commands borrow it via Tauri managed state |
| System tray ↔ Main window | Tauri window manager, emit events | Tray click can show/hide window; tray menu items emit named events to frontend |

### External Dependencies (all offline, no network calls)

| Dependency | Role | Notes |
|------------|------|-------|
| xcap (via tauri-plugin-screenshots) | Cross-platform screen capture | Abstracts Windows/macOS/Linux capture APIs |
| image-rs | Decode/encode PNG, JPEG, WebP | Pure Rust; no system library dependency |
| ort (ONNX Runtime) | Run background removal model | Bundle the runtime; model weights ship with app (~30-50MB) |
| React Konva | Canvas rendering, hit testing, node management | Wraps Konva.js; battle-tested for editors |
| zundo | Undo/redo middleware for Zustand | <700B; time-travel over Zustand store snapshots |
| tauri-specta | TypeScript type generation from Rust commands | Ensures IPC types stay in sync; catches mismatches at build time |

## Scaling Considerations

This is a desktop app — "scaling" means handling large images and many annotations, not concurrent users.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Small images (<2MP), <20 annotations | Default architecture works; no special handling needed |
| Large images (4K, 8MP+), many annotations | Offscreen canvas for export render; debounce annotation layer redraws; transfer image data via ArrayBuffer not base64 (eliminates 33% overhead) |
| Batch CLI (100+ images) | Process sequentially in Rust; optional rayon parallelism for independent images; no WebView involved |

## Sources

- Tauri architecture concepts: https://v2.tauri.app/concept/architecture/
- Tauri project structure: https://v2.tauri.app/start/project-structure/
- Tauri IPC commands: https://v2.tauri.app/develop/calling-rust/
- Tauri state management: https://v2.tauri.app/develop/state-management/
- tauri-plugin-screenshots (xcap): https://deepwiki.com/ayangweb/tauri-plugin-screenshots
- React Konva (canvas library): https://konvajs.org/docs/react/index.html
- Konva undo/redo pattern: https://konvajs.org/docs/react/Undo-Redo.html
- Excalidraw two-layer canvas architecture: https://deepwiki.com/excalidraw/excalidraw/5.1-canvas-rendering-pipeline
- zundo (Zustand undo/redo): https://github.com/charkour/zundo
- rust-background-removal (ONNX): https://github.com/dnanhkhoa/rust-background-removal
- @imgly/background-removal ONNX + WebGPU: https://img.ly/blog/browser-background-removal-using-onnx-runtime-webgpu/
- OffscreenCanvas export: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/convertToBlob
- tauri-specta type generation: https://github.com/dannysmith/tauri-template

---
*Architecture research for: Screenshot beautifier desktop app (Tauri 2.x + React/TypeScript)*
*Researched: 2026-04-09*
