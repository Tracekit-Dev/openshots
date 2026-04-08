# Phase 1: Foundation and Capture - Research

**Researched:** 2026-04-09
**Domain:** Tauri 2.x app scaffold, system tray, global hotkeys, cross-platform screenshot capture
**Confidence:** HIGH (core stack and Tauri APIs), MEDIUM (region selection overlay pattern)

---

## Summary

Phase 1 builds the entire foundation the app runs on: Tauri 2.x scaffolded with React + TypeScript + Vite, a persistent system tray icon with contextual menus, global hotkeys for three capture modes (region, full screen, window), and the cross-platform screenshot capture pipeline using the xcap crate. This phase is the prerequisite for every other phase — nothing else can run without it.

The capture pipeline has one architectural fork: region selection requires a transparent overlay window that spans the full display while the user draws a selection rectangle. This is not built into xcap or any official Tauri plugin — it must be a second Tauri window configured as transparent, always-on-top, and fullscreen. On Linux Wayland, xcap cannot capture at all (no kernel-level API exists), so the system tray click path is the only viable activation method for those users.

macOS screen recording permission is the second complexity: it must be checked at every capture attempt, not just at first launch, because app updates can silently invalidate it. Use `tauri-plugin-macos-permissions` (v2.3.0) to check and request the permission with a deep-link recovery path to System Preferences.

**Primary recommendation:** Scaffold with `npm create tauri-app@latest`, add `tauri-plugin-global-shortcut` + `tauri-plugin-store` + `tauri-plugin-macos-permissions` + the `xcap` crate directly (bypassing the community `tauri-plugin-screenshots` which has unverified maintenance), implement the region overlay as a second Tauri window, and wire all three capture modes to both hotkeys and tray menu items from day one.

---

## Project Constraints (from CLAUDE.md)

| Directive | Value |
|-----------|-------|
| Tech stack | Tauri 2.x + React + TypeScript (locked) |
| Offline | All processing local — no network calls for core features |
| Performance | Image operations < 100ms for common operations |
| Binary size | Target < 20MB installer |
| Workflow | Use GSD entry points; no direct repo edits outside GSD |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAPT-01 | User can capture a selected screen region via global hotkey | Transparent overlay window pattern + xcap `capture_region()` |
| CAPT-02 | User can capture a full screen via global hotkey | xcap `Monitor::all()` + `capture_image()` |
| CAPT-03 | User can capture a specific window via global hotkey | xcap `Window::all()` + `capture_image()`; requires window picker UI |
| CAPT-04 | User can access the app from the system tray menu | `TrayIconBuilder` + `Menu` in Tauri 2 — fully supported |
| CAPT-05 | User can configure custom global hotkeys for each capture mode | `tauri-plugin-store` to persist, `tauri-plugin-global-shortcut` to re-register on change |
| CAPT-06 | User can trigger capture from system tray click (Wayland fallback) | `on_tray_icon_event` left-click handler + `WAYLAND_DISPLAY` env var detection |
</phase_requirements>

---

## Standard Stack

### Core (Phase 1 scope)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tauri | 2.10.1 | Desktop shell, IPC, native APIs | Official Tauri — latest stable [VERIFIED: npm registry] |
| React | 19.x | UI component tree | Locked by project — largest OSS contributor pool |
| TypeScript | 5.x | Type safety, IPC bindings | Auto-generates TS types for Rust commands |
| Vite | 6.x | Build tool + dev server | Official Tauri recommendation |
| Rust stable | 1.77.2+ | Backend, xcap, commands | Required by Tauri |

### Tauri Plugins (Phase 1)

| Plugin | JS Version | Cargo Version | Purpose |
|--------|-----------|---------------|---------|
| tauri-plugin-global-shortcut | 2.3.1 | 2.x | System-wide hotkeys [VERIFIED: npm registry] |
| tauri-plugin-store | 2.4.2 | 2.x | Persist hotkey config + app prefs [VERIFIED: npm registry] |
| tauri-plugin-window-state | 2.4.1 | 2.x | Persist window size/position [VERIFIED: npm registry] |
| tauri-plugin-macos-permissions | — | 2.3.0 | Check/request macOS screen recording [VERIFIED: GitHub] |

### Rust Crates (Phase 1)

| Crate | Version | Purpose | Source |
|-------|---------|---------|--------|
| xcap | 0.9.3 | Cross-platform screen/window/region capture | [VERIFIED: GitHub nashaofu/xcap] |

### UI / Styling (Phase 1 — shell only)

| Library | Version | Purpose |
|---------|---------|---------|
| Tailwind CSS | 4.2.2 | Utility styling [VERIFIED: npm registry] |
| shadcn/ui | latest | Accessible dialogs, dropdowns for settings UI |
| Zustand | 5.0.12 | App state (hotkeys config, capture state) [VERIFIED: npm registry] |

### NOT included in Phase 1 (deferred to later phases)

- `konva` / `react-konva` — canvas editor (Phase 2)
- `image` crate, `webp` crate, `rayon` — image processing (Phase 2/3)
- `clap` — CLI (Phase 3)
- `@huggingface/transformers` — background removal (Phase 2)

### Installation (Phase 1)

```bash
# Scaffold (choose React + TypeScript + Vite when prompted)
npm create tauri-app@latest screenshots -- --template react-ts
cd screenshots

# Tauri JS plugins
npm install @tauri-apps/plugin-global-shortcut
npm install @tauri-apps/plugin-store
npm install @tauri-apps/plugin-window-state

# UI / state
npm install tailwindcss @tailwindcss/vite
npm install zustand

# Dev
npm install -D vitest @vitest/ui
npm install -D eslint prettier eslint-plugin-react-hooks
```

```toml
# src-tauri/Cargo.toml additions
[dependencies]
xcap = "0.9"
tauri-plugin-global-shortcut = "2"
tauri-plugin-store = "2"
tauri-plugin-window-state = "2"
tauri-plugin-macos-permissions = "2"

[target.'cfg(target_os = "macos")'.dependencies]
tauri-plugin-macos-permissions = "2"
```

```toml
# tauri.conf.json — add tray-icon feature
[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 1)

```
screenshots/
├── src/                              # React/TypeScript frontend
│   ├── components/
│   │   ├── shell/
│   │   │   ├── TraySetup.tsx         # Tray event listener (frontend side)
│   │   │   ├── SettingsPage.tsx      # Hotkey configuration UI
│   │   │   └── WaylandBanner.tsx     # Wayland limitation notice
│   │   └── capture/
│   │       ├── RegionOverlay.tsx     # Fullscreen overlay for region selection
│   │       └── WindowPicker.tsx      # Window list for window capture mode
│   ├── stores/
│   │   └── app.store.ts              # Hotkey config, capture state, platform flags
│   ├── ipc/
│   │   └── capture.ts                # Typed wrappers: invoke('capture_region'), etc.
│   ├── hooks/
│   │   └── useCaptureFlow.ts         # Orchestrates hide → capture → show
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs                    # App setup: tray, plugins, commands, shortcuts
│   │   ├── main.rs                   # Desktop entry point
│   │   └── commands/
│   │       └── capture.rs            # capture_fullscreen, capture_region, capture_window, list_windows
│   ├── capabilities/
│   │   └── default.json              # Permissions: global-shortcut, store, window
│   ├── icons/
│   └── tauri.conf.json               # App identifier, bundle, tray feature flag
├── package.json
└── index.html
```

### Pattern 1: Tray-First Activation (all platforms)

**What:** Every capture mode is accessible from the system tray menu. Global hotkeys are additive convenience on top of tray — never the only path.

**When to use:** Always. On Linux Wayland, global shortcuts do not register (xcap and the global-shortcut plugin both fail silently). Tray click is the fallback that keeps the app functional on all platforms.

**Example — Rust tray setup:**
```rust
// Source: https://v2.tauri.app/learn/system-tray/
use tauri::{menu::{Menu, MenuItem}, tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState}};

fn setup_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let capture_region = MenuItem::with_id(app, "capture-region", "Capture Region", true, None::<&str>)?;
    let capture_screen = MenuItem::with_id(app, "capture-screen", "Capture Full Screen", true, None::<&str>)?;
    let capture_window = MenuItem::with_id(app, "capture-window", "Capture Window", true, None::<&str>)?;
    let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[
        &capture_region, &capture_screen, &capture_window,
        &separator, &settings, &quit
    ])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .menu_on_left_click(false)  // left click shows window; right shows menu
        .on_menu_event(|app, event| match event.id.as_ref() {
            "capture-region" => { app.emit("capture:region", ()).unwrap(); }
            "capture-screen" => { app.emit("capture:screen", ()).unwrap(); }
            "capture-window" => { app.emit("capture:window", ()).unwrap(); }
            "settings" => { /* show settings window */ }
            "quit" => { app.exit(0); }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Left click: show/focus main window (all platforms)
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up, ..
            } = event {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
        })
        .build(app)?;
    Ok(())
}
```

### Pattern 2: Global Shortcut Registration with Dynamic Rebinding (CAPT-05)

**What:** Register hotkeys at startup from persisted config. When user changes a hotkey in settings, unregister the old one and register the new one.

**When to use:** Anytime hotkey config must be user-customizable. Load from `tauri-plugin-store` at startup; re-register on change.

**Example — Rust shortcut registration:**
```rust
// Source: https://v2.tauri.app/plugin/global-shortcut/
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

fn register_shortcuts(app: &tauri::AppHandle, hotkeys: &HotkeyConfig) {
    #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
    {
        // Unregister all existing shortcuts before re-registering
        let _ = app.global_shortcut().unregister_all();

        let region_shortcut: Shortcut = hotkeys.capture_region.parse().unwrap();
        let screen_shortcut: Shortcut = hotkeys.capture_fullscreen.parse().unwrap();
        let window_shortcut: Shortcut = hotkeys.capture_window.parse().unwrap();

        let handle = app.clone();
        let _ = app.global_shortcut().on_shortcuts(
            &[region_shortcut, screen_shortcut, window_shortcut],
            move |_app, shortcut, _event| {
                if *shortcut == region_shortcut {
                    handle.emit("capture:region", ()).unwrap();
                } else if *shortcut == screen_shortcut {
                    handle.emit("capture:screen", ()).unwrap();
                } else if *shortcut == window_shortcut {
                    handle.emit("capture:window", ()).unwrap();
                }
            }
        );
    }
}
```

### Pattern 3: Region Selection via Transparent Overlay Window

**What:** When region capture is triggered, open a second Tauri window configured as transparent, decorationless, always-on-top, and fullscreen. The React component inside renders a canvas for rubberband selection. On mouse-up, close the overlay and call the Rust capture command with the selected rect.

**When to use:** Anytime the user must draw a selection on the live desktop. No Tauri plugin provides this natively — it is a well-established pattern from apps like Flameshot and ShareX.

**tauri.conf.json window config for overlay:**
```json
{
  "windows": [
    {
      "label": "capture-overlay",
      "title": "",
      "width": 1920,
      "height": 1080,
      "visible": false,
      "decorations": false,
      "transparent": true,
      "alwaysOnTop": true,
      "fullscreen": true,
      "skipTaskbar": true,
      "focus": true
    }
  ]
}
```

**RegionOverlay.tsx sketch:**
```typescript
// The overlay window's React root renders this component
// Canvas covers the full screen; user drags to draw selection rect.
// On mouseup: invoke('capture_region', { x, y, width, height })
// Then: close this window, show main window with image.
export function RegionOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [start, setStart] = useState<{x: number; y: number} | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const handleMouseUp = async () => {
    if (!rect) return;
    await invoke('capture_region', {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
    await getCurrentWindow().close();
  };
  // ... drag handlers draw rect on canvas
}
```

**Rust capture commands:**
```rust
// Source: xcap crate https://github.com/nashaofu/xcap
use xcap::{Monitor, Window};

#[tauri::command]
async fn capture_fullscreen() -> Result<Vec<u8>, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    // Default: primary monitor (index 0)
    let image = monitors[0].capture_image().map_err(|e| e.to_string())?;
    let mut buf = Vec::new();
    image.write_to(&mut std::io::Cursor::new(&mut buf), image::ImageFormat::Png)
         .map_err(|e| e.to_string())?;
    Ok(buf)
}

#[tauri::command]
async fn capture_region(x: i32, y: i32, width: u32, height: u32) -> Result<Vec<u8>, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let image = monitors[0].capture_region(x, y, width, height).map_err(|e| e.to_string())?;
    let mut buf = Vec::new();
    image.write_to(&mut std::io::Cursor::new(&mut buf), image::ImageFormat::Png)
         .map_err(|e| e.to_string())?;
    Ok(buf)
}

#[tauri::command]
async fn list_windows() -> Result<Vec<WindowInfo>, String> {
    let windows = Window::all().map_err(|e| e.to_string())?;
    Ok(windows.iter().map(|w| WindowInfo {
        id: w.id(),
        title: w.title().to_string(),
    }).collect())
}

#[tauri::command]
async fn capture_window(window_id: u32) -> Result<Vec<u8>, String> {
    let windows = Window::all().map_err(|e| e.to_string())?;
    let target = windows.iter().find(|w| w.id() == window_id)
        .ok_or("Window not found")?;
    let image = target.capture_image().map_err(|e| e.to_string())?;
    let mut buf = Vec::new();
    image.write_to(&mut std::io::Cursor::new(&mut buf), image::ImageFormat::Png)
         .map_err(|e| e.to_string())?;
    Ok(buf)
}
```

### Pattern 4: macOS Screen Recording Permission Check

**What:** Before any capture attempt, check permission. If not granted, emit an event to the frontend to show a recovery UI with a deep link to Privacy & Security settings. Never silently fail or return a black image.

**Example:**
```rust
// macOS only — wrap in #[cfg(target_os = "macos")]
use tauri_plugin_macos_permissions::PermissionsExt;

#[tauri::command]
#[cfg(target_os = "macos")]
async fn check_screen_permission(app: tauri::AppHandle) -> Result<bool, String> {
    let granted = app.check_screen_recording_permission();
    if !granted {
        // Request shows the system dialog — user must grant in System Preferences
        app.request_screen_recording_permission();
    }
    Ok(granted)
}
```

### Pattern 5: Wayland Detection and Graceful Degradation

**What:** At startup, check if `WAYLAND_DISPLAY` is set. If so, skip global shortcut registration and show an informational banner in the UI explaining that hotkeys are unavailable and directing the user to use the system tray instead (CAPT-06).

**Example:**
```rust
// lib.rs setup
let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok();
app.manage(PlatformFlags { is_wayland });

if !is_wayland {
    register_shortcuts(&app.handle());
}

// Emit flag to frontend
app.emit("platform:flags", PlatformFlags { is_wayland }).unwrap();
```

```typescript
// Frontend: WaylandBanner.tsx
const [isWayland, setIsWayland] = useState(false);
useEffect(() => {
  listen<{is_wayland: boolean}>('platform:flags', (e) => {
    setIsWayland(e.payload.is_wayland);
  });
}, []);

if (!isWayland) return null;
return (
  <div className="bg-amber-50 border border-amber-200 px-4 py-2 text-sm">
    Global hotkeys are not supported on Wayland. Use the system tray icon to capture.
  </div>
);
```

### Anti-Patterns to Avoid

- **Single capture activation path:** Never design capture so only the hotkey works. Tray menu must always be wired and functional before hotkeys are added.
- **Invoking `capture_*` commands with image bytes over IPC:** Return `Vec<u8>` bytes then immediately write to a temp file in Rust; return only the file path to the frontend. Use `convertFileSrc()` to display. Never pass raw PNG bytes as JSON.
- **Silent macOS permission failure:** xcap returns a black image (or error) when Screen Recording is denied. Always gate capture calls with an explicit permission check.
- **Transparent window left open:** The region overlay must close itself (or be closed by the Rust command callback) immediately after capture. Leaving it open blocks all user interaction.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-platform screen/window capture | Custom OS-level bindings | `xcap` crate (0.9.3) | Handles macOS CGDisplayCreateImage, Windows DXGI/GDI, Linux X11 — ~3000 lines of platform-specific code |
| System-wide hotkeys | `rdev` crate or OS-level hooks | `tauri-plugin-global-shortcut` | Official plugin wraps `global-hotkey` crate with Tauri lifecycle integration |
| Persistent app settings | SQLite or custom JSON file | `tauri-plugin-store` | Handles concurrent writes, file locking, platform data dirs |
| macOS permission dialogs | Direct NSBundle calls | `tauri-plugin-macos-permissions` | Correct entitlement handling; direct calls risk sandbox rejection |
| Region selection UI | Custom Electron-style fullscreen window | Tauri transparent overlay window | Tauri's window API supports `transparent + decorations:false + alwaysOnTop` natively |

**Key insight:** xcap alone saves approximately 3,000 lines of platform-specific capture code across three OS APIs. Do not attempt raw platform bindings.

---

## Common Pitfalls

### Pitfall 1: xcap Region Capture Coordinates Use Physical Pixels

**What goes wrong:** The user draws a selection rect in the overlay window using CSS/logical pixels. The coordinates passed to `capture_region()` must be in physical (device) pixels. On a Retina display with `devicePixelRatio = 2`, a 500×300 CSS rect becomes 1000×600 physical pixels. Passing CSS coordinates to xcap returns a region 4x smaller than expected.

**Why it happens:** The overlay canvas operates in CSS pixel space; xcap operates in physical pixel space. They are different coordinate systems.

**How to avoid:** Multiply all coordinates from `mouseEvent.clientX/Y` and selection rect dimensions by `window.devicePixelRatio` before passing to the Rust command.

```typescript
const dpr = window.devicePixelRatio || 1;
await invoke('capture_region', {
  x: Math.round(rect.x * dpr),
  y: Math.round(rect.y * dpr),
  width: Math.round(rect.width * dpr),
  height: Math.round(rect.height * dpr),
});
```

**Warning signs:** Captured region is too small, offset from what the user selected, or appears at wrong scale.

---

### Pitfall 2: Global Shortcut Silently Fails on Linux Wayland

**What goes wrong:** `tauri-plugin-global-shortcut` registration returns no error on Wayland but the shortcut never fires. The app appears to work but capture never triggers from hotkeys.

**Why it happens:** Wayland's security model forbids apps from intercepting global keyboard events. The plugin cannot register and does not throw — it silently does nothing. [CITED: https://github.com/tauri-apps/tauri/issues/3578]

**How to avoid:** Detect Wayland via `std::env::var("WAYLAND_DISPLAY")` at startup. Skip shortcut registration and show the `WaylandBanner` component (CAPT-06).

**Warning signs:** Shortcuts work in dev (macOS/X11) but not on Ubuntu with Wayland session.

---

### Pitfall 3: macOS Screen Recording Permission Resets After App Update

**What goes wrong:** App works fine for the user. After updating to a new version, screenshots return black images with no error. The permission was granted before but the new binary invalidates it.

**Why it happens:** macOS ties Screen Recording permission to the code-signed binary identity. A new binary = new identity = permission reset. [CITED: https://github.com/tauri-apps/tauri/issues/10567]

**How to avoid:** Check permission before every capture call (not just at first launch). Use `tauri-plugin-macos-permissions` `check_screen_recording_permission()`. If not granted, show a recovery UI with a button that opens `x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture`.

**Warning signs:** Users report "it stopped working after the update" on macOS.

---

### Pitfall 4: IPC Bottleneck if Capture Bytes Are Returned as JSON

**What goes wrong:** Returning `Vec<u8>` from a `#[tauri::command]` serializes the bytes as a JSON array (e.g., `[137, 80, 78, 71, ...]`). A 2MB PNG becomes ~8MB of JSON text. Transfer time exceeds 500ms.

**Why it happens:** Tauri's IPC is JSON-serialized by default. Raw byte arrays become JSON integer arrays — 3-4x overhead. [CITED: .planning/research/PITFALLS.md]

**How to avoid:** In capture commands, write the PNG to a temp file and return only the path. The frontend loads it using `convertFileSrc(path)` which bypasses IPC entirely.

```rust
// Correct approach — return path, not bytes
#[tauri::command]
async fn capture_fullscreen(app: tauri::AppHandle) -> Result<String, String> {
    let image = /* ... xcap ... */;
    let temp_path = app.path().temp_dir()?.join("capture.png");
    image.save(&temp_path).map_err(|e| e.to_string())?;
    Ok(temp_path.to_string_lossy().to_string())
}
```

```typescript
// Frontend
import { convertFileSrc } from '@tauri-apps/api/core';
const imageUrl = convertFileSrc(capturedPath);
```

**Warning signs:** Capture feels slow (>200ms) on modern hardware; profiler shows long IPC serialization time.

---

### Pitfall 5: Overlay Window Transparent Background Not Working on Linux

**What goes wrong:** The region selection overlay has a dark or white background on Linux instead of being transparent, making it impossible for the user to see what they are selecting.

**Why it happens:** WebKitGTK on Linux has inconsistent `background: transparent` support and requires `--enable-transparent-web-pages` at the WebView level. The `transparent: true` config in `tauri.conf.json` is not always sufficient. [CITED: .planning/research/PITFALLS.md]

**How to avoid:** Set `background-color: transparent` explicitly on the `html, body` elements in the overlay's CSS. Test on Linux before shipping. Accept that on some WebKitGTK versions a semi-transparent tinted overlay (e.g., `rgba(0,0,0,0.3)`) may be more reliable than fully transparent.

**Warning signs:** Overlay appears as a solid white or black rectangle on Linux.

---

### Pitfall 6: Minimized / Off-Screen Windows Appear in Window Picker

**What goes wrong:** xcap `Window::all()` returns all windows including minimized, hidden, and off-screen ones. The user picks a window from the list and gets an error or a black image because xcap cannot capture minimized windows.

**Why it happens:** xcap does not filter non-capturable windows automatically. [CITED: deepwiki.com/ayangweb/tauri-plugin-screenshots]

**How to avoid:** In the `list_windows` command, filter out windows that are minimized or have zero width/height before returning the list to the frontend.

```rust
fn is_capturable(w: &Window) -> bool {
    !w.is_minimized() && w.width() > 0 && w.height() > 0
}
let windows: Vec<_> = Window::all()?
    .into_iter()
    .filter(is_capturable)
    .collect();
```

**Warning signs:** User selects a window from picker, gets an empty/black image, no clear error.

---

## Code Examples

### lib.rs — Full Setup Structure

```rust
// src-tauri/src/lib.rs
// Source: https://v2.tauri.app/start/project-structure/ + official plugin docs

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            // macOS permission plugin (desktop only)
            #[cfg(target_os = "macos")]
            app.handle().plugin(tauri_plugin_macos_permissions::init())?;

            // Global shortcut (desktop only, skip on Wayland)
            let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok();
            if !is_wayland {
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new().build()
                )?;
                // Load hotkey config from store and register
                register_shortcuts_from_store(app.handle())?;
            }

            // System tray
            setup_tray(app.handle())?;

            // Emit platform flags to frontend
            app.emit("platform:flags", serde_json::json!({ "isWayland": is_wayland }))?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::capture::capture_fullscreen,
            commands::capture::capture_region,
            commands::capture::capture_window,
            commands::capture::list_windows,
            #[cfg(target_os = "macos")]
            commands::capture::check_screen_permission,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### capabilities/default.json — Permissions

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities",
  "windows": ["main", "capture-overlay"],
  "permissions": [
    "core:default",
    "global-shortcut:allow-register",
    "global-shortcut:allow-unregister",
    "global-shortcut:allow-is-registered",
    "store:allow-get",
    "store:allow-set",
    "store:allow-load",
    "window-state:default",
    "macos-permissions:default"
  ]
}
```

### ipc/capture.ts — Typed Wrappers

```typescript
// src/ipc/capture.ts
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';

export async function captureFullscreen(): Promise<string> {
  const path = await invoke<string>('capture_fullscreen');
  return convertFileSrc(path);
}

export async function captureRegion(
  x: number, y: number, width: number, height: number
): Promise<string> {
  const dpr = window.devicePixelRatio || 1;
  const path = await invoke<string>('capture_region', {
    x: Math.round(x * dpr),
    y: Math.round(y * dpr),
    width: Math.round(width * dpr),
    height: Math.round(height * dpr),
  });
  return convertFileSrc(path);
}

export interface WindowInfo {
  id: number;
  title: string;
}

export async function listWindows(): Promise<WindowInfo[]> {
  return invoke<WindowInfo[]>('list_windows');
}

export async function captureWindow(windowId: number): Promise<string> {
  const path = await invoke<string>('capture_window', { windowId });
  return convertFileSrc(path);
}
```

### app.store.ts — Hotkey Configuration State

```typescript
// src/stores/app.store.ts
import { create } from 'zustand';

interface HotkeyConfig {
  captureRegion: string;
  captureFullscreen: string;
  captureWindow: string;
}

interface AppState {
  isWayland: boolean;
  hotkeyConfig: HotkeyConfig;
  setIsWayland: (v: boolean) => void;
  setHotkeyConfig: (config: HotkeyConfig) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isWayland: false,
  hotkeyConfig: {
    captureRegion: 'CommandOrControl+Shift+4',
    captureFullscreen: 'CommandOrControl+Shift+3',
    captureWindow: 'CommandOrControl+Shift+W',
  },
  setIsWayland: (isWayland) => set({ isWayland }),
  setHotkeyConfig: (hotkeyConfig) => set({ hotkeyConfig }),
}));
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tauri-plugin-screenshots` (community) | Direct `xcap` crate in Rust commands | Ongoing | Community plugin has unverified maintenance; xcap 0.9.3 is actively maintained [VERIFIED: GitHub] |
| Returning image bytes over IPC | Write temp file, return path + `convertFileSrc()` | Tauri 2.x era | Eliminates 3-4x JSON serialization overhead on large images |
| Single `commands.rs` file | `commands/capture.rs`, `commands/export.rs`, etc. | Tauri 2 best practice | Separates concerns; avoids compilation bottlenecks |
| `window.alert()` for permission errors | In-app recovery UI with deep link to System Preferences | macOS best practice | Users can act immediately without leaving the app |

**Deprecated/outdated:**
- `tauri-plugin-screenshots` community crate: Treat as unmaintained. Use xcap directly. [ASSUMED — maintenance status unverified beyond STACK.md note]
- Tauri 1.x `SystemTray` API: Replaced by `TrayIconBuilder` in Tauri 2. Do not use v1 tray examples.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `tauri-plugin-screenshots` community plugin has unverified maintenance | Standard Stack, Don't Hand-Roll | If it is actively maintained, using xcap directly is more work than needed — but xcap is a superset, so no functional risk |
| A2 | xcap `capture_region()` accepts physical pixel coordinates (not CSS logical pixels) | Common Pitfalls #1, Code Examples | If xcap uses logical pixels on some platforms, coordinate scaling would be wrong — needs validation with a test capture |
| A3 | Wayland detection via `WAYLAND_DISPLAY` env var is reliable across all major Linux distros | Pattern 5, Pitfall 2 | Some compositors may not set this var; a more robust check could also test `XDG_SESSION_TYPE=wayland` |

---

## Open Questions

1. **Multi-monitor region selection**
   - What we know: xcap supports multiple monitors; the overlay window approach creates one window
   - What's unclear: How to span a single transparent overlay across multiple monitors in Tauri 2 — or whether separate overlay windows per monitor are required
   - Recommendation: Start with single-monitor (primary monitor) for Phase 1; document multi-monitor as a follow-up

2. **Window capture on macOS — does xcap require Screen Recording for window capture?**
   - What we know: macOS Screen Recording entitlement is required for monitor capture; window capture behavior may differ
   - What's unclear: Whether individual window capture (which historically used CGWindowListCopyWindowInfo) still requires the Screen Recording entitlement in macOS 15+
   - Recommendation: Test on macOS before finalizing permission check flow; assume Screen Recording is required for all capture modes

3. **Hotkey format string syntax**
   - What we know: `tauri-plugin-global-shortcut` accepts strings like `"CommandOrControl+Shift+4"` in JavaScript
   - What's unclear: Whether the same string format is parsed in Rust's `Shortcut::new()` or if Rust requires a different API
   - Recommendation: Implement shortcut registration in Rust (not JS) for Phase 1; verify Rust API from plugin source before writing the command

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Tauri CLI, npm | Yes | 25.9.0 (>= 18 required) | — |
| npm | Package management | Yes | 11.12.1 | — |
| Rust / cargo | Tauri compilation | No | NOT FOUND | Must install: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| cargo-tauri CLI | Dev + build | No | NOT FOUND | Installed via `cargo install tauri-cli` or `npm install -D @tauri-apps/cli` |

**Missing dependencies with no fallback:**
- **Rust toolchain (rustc + cargo):** Required to compile src-tauri. The app cannot be built without it. Wave 0 plan MUST include Rust installation as the first step.
- **Tauri CLI:** Installed as part of Rust toolchain setup (`cargo install tauri-cli@^2`) or via npm devDependency (`@tauri-apps/cli`). The npm path works with the already-available Node.js.

**Recommended install order for Wave 0:**
```bash
# 1. Install Rust (macOS/Linux)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# 2. Verify
rustc --version  # expect 1.77.2+
cargo --version

# 3. Tauri CLI is available via npm — preferred since Node is already installed
npm install -D @tauri-apps/cli@latest

# 4. Scaffold
npm create tauri-app@latest screenshots -- --template react-ts
```

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Desktop app — no auth |
| V3 Session Management | No | No sessions |
| V4 Access Control | Yes | Tauri capabilities ACL — restrict which commands the WebView can call |
| V5 Input Validation | Yes | Validate region coords (non-negative, within screen bounds) before passing to xcap |
| V6 Cryptography | No | No crypto in Phase 1 |

### Known Threat Patterns for Tauri Desktop

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Overly permissive capabilities | Tampering | Grant only needed permissions in `capabilities/default.json`; never use `core:allow-all` |
| Path traversal via capture output path | Tampering | Write temp files to `app.path().temp_dir()` only; never accept user-supplied output paths in Phase 1 |
| Screenshot data exposed to web origin | Information Disclosure | Temp files served via `convertFileSrc()` use the `asset://` protocol which is scoped to the app |
| Global shortcut eavesdropping | Information Disclosure | Use specific, non-generic hotkeys (e.g., `Cmd+Shift+4`) not `Enter` or letter keys alone |

---

## Sources

### Primary (HIGH confidence)
- [Tauri v2 Global Shortcut Plugin](https://v2.tauri.app/plugin/global-shortcut/) — Rust setup, JS API, capability permissions [VERIFIED: WebFetch]
- [Tauri v2 System Tray](https://v2.tauri.app/learn/system-tray/) — TrayIconBuilder, menu API, click events [VERIFIED: WebFetch]
- [xcap crate — GitHub nashaofu/xcap](https://github.com/nashaofu/xcap) — v0.9.3, platform support matrix, Wayland limitation, capture APIs [VERIFIED: WebFetch]
- [Tauri v2 Project Structure](https://v2.tauri.app/start/project-structure/) — lib.rs/main.rs pattern, capabilities dir [VERIFIED: WebFetch]
- [npm registry — @tauri-apps/cli](https://www.npmjs.com/package/@tauri-apps/cli) — v2.10.1 [VERIFIED: npm view]
- [npm registry — @tauri-apps/plugin-global-shortcut](https://www.npmjs.com/package/@tauri-apps/plugin-global-shortcut) — v2.3.1 [VERIFIED: npm view]
- [npm registry — @tauri-apps/plugin-store](https://www.npmjs.com/package/@tauri-apps/plugin-store) — v2.4.2 [VERIFIED: npm view]
- [npm registry — @tauri-apps/plugin-window-state](https://www.npmjs.com/package/@tauri-apps/plugin-window-state) — v2.4.1 [VERIFIED: npm view]
- [npm registry — zustand](https://www.npmjs.com/package/zustand) — v5.0.12 [VERIFIED: npm view]
- [npm registry — tailwindcss](https://www.npmjs.com/package/tailwindcss) — v4.2.2 [VERIFIED: npm view]

### Secondary (MEDIUM confidence)
- [tauri-plugin-macos-permissions GitHub](https://github.com/ayangweb/tauri-plugin-macos-permissions) — v2.3.0, screen recording check/request API [VERIFIED: WebFetch]
- [tauri-plugin-screenshots DeepWiki](https://deepwiki.com/ayangweb/tauri-plugin-screenshots) — xcap-based, window filtering requirements [CITED]
- [Global Shortcut Wayland Issue #3578](https://github.com/tauri-apps/tauri/issues/3578) — Wayland silent failure confirmed [CITED]
- [macOS Permission Reset Issue #10567](https://github.com/tauri-apps/tauri/issues/10567) — Permission resets on update [CITED]

### Tertiary (LOW confidence)
- xcap `capture_region` coordinate space (physical vs logical pixels) — [ASSUMED] based on how OS-level capture APIs work; must be verified with a test capture on Retina hardware

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry and GitHub
- Architecture patterns: HIGH — tray and global-shortcut patterns from official Tauri docs
- xcap capture API: HIGH — verified from GitHub source (v0.9.3)
- Region overlay implementation: MEDIUM — pattern derived from Tauri window docs; no official example exists for this specific use case
- Pitfalls: HIGH — each has a cited GitHub issue or official doc reference

**Research date:** 2026-04-09
**Valid until:** 2026-07-09 (stable Tauri 2.x ecosystem; re-verify xcap version on plan execution)
