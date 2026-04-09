---
phase: 01-foundation-and-capture
plan: 02
status: complete
completed: 2026-04-09
one_liner: "Full capture pipeline: fullscreen/region/window capture with window hiding, tray menu, global hotkeys, settings, and Wayland fallback"
---

## What was delivered

All Plan 01-02 must-haves achieved. Users can capture screenshots via system tray, global hotkeys, or in-app buttons. All three capture modes work (fullscreen, region, window).

## Key artifacts

| File | Status |
|------|--------|
| `src-tauri/src/commands/capture.rs` | xcap fullscreen/window capture with Rust-side window hide/show, JPEG data URL encoding, HEIC wallpaper conversion |
| `src-tauri/src/lib.rs` | System tray (right-click menu), global shortcut registration, hotkey update IPC |
| `src/hooks/useCaptureFlow.ts` | Orchestrates capture flow: permission check → IPC capture → canvas add |
| `src/components/capture/RegionOverlay.tsx` | Shows captured fullscreen as background, user draws selection, client-side crop |
| `src/components/capture/WindowPicker.tsx` | Modal listing all capturable windows via xcap |
| `src/components/shell/WaylandBanner.tsx` | Informational banner when Wayland detected |
| `src/components/shell/SettingsPage.tsx` | Hotkey configuration with macOS symbol display (⌘⇧3) |
| `src/App.tsx` | Main layout with toolbar, sidebars, empty state, upload, capture integration |

## Deviations from plan

- Region capture does NOT use a separate fullscreen transparent Tauri window. Instead: Rust hides the app → captures fullscreen → shows app → displays captured image in an in-app overlay → user draws selection → client-side crop. This is simpler and avoids transparent window issues.
- Images transferred as data URLs (JPEG base64) not temp file paths. The `asset://` protocol was broken on macOS WKWebView in dev mode. Data URLs work reliably.
- Added image upload via Tauri file dialog (not in original plan).
- Added macOS system wallpaper browser with HEIC→JPEG conversion via sips.
- Added canvas zoom (scroll wheel + controls).
- Full UI redesign: Apple/Linear.app aesthetic with zinc palette, custom range inputs, clean typography. Original plan had no design spec.
- App renamed from "Screenshots" to "OpenShots".
- Custom app icon generated (dark blue viewfinder, no purple).

## Must-haves verification

| Must-have | Status |
|-----------|--------|
| Full screen capture from tray → appears in window | ✅ Works via Rust hide/capture/show |
| Region capture with selection overlay | ✅ Pre-captured screenshot + client-side crop |
| Window picker → captured window appears | ✅ xcap window capture by ID |
| System tray on all platforms | ✅ Right-click menu with all capture modes |
| Hotkey settings with immediate effect | ✅ Settings page + runtime re-registration |
| Wayland banner + tray fallback | ✅ Banner shown, hotkeys disabled on Wayland |
| macOS Screen Recording permission check | ✅ Test capture before each operation |
