# Pitfalls Research

**Domain:** Screenshot beautifier / image editor desktop app (Tauri 2.x + React/TypeScript)
**Researched:** 2026-04-09
**Confidence:** HIGH (Tauri-specific pitfalls), MEDIUM (canvas/rendering), HIGH (cross-platform)

---

## Critical Pitfalls

### Pitfall 1: Tauri IPC Becomes a Bottleneck for Large Image Payloads

**What goes wrong:**
Image data passed between the Rust backend and the React frontend over Tauri's IPC layer serializes as JSON by default. Even 3 MB of image data takes ~200 ms to transfer. A full-resolution screenshot at 4K can easily be 30–50 MB, which makes round-trips for every image operation feel sluggish or completely frozen.

**Why it happens:**
Developers naturally reach for `invoke()` to call Rust commands and receive results, not realizing IPC payloads are serialized strings under the hood. The pattern that works fine for small JSON objects breaks badly when image buffers are involved.

**How to avoid:**
Use Tauri's raw binary IPC (Tauri 2.x supports raw `ArrayBuffer` payloads via `invoke` with `rawHeaders`). For read-heavy paths (loading an image into the canvas), use the `convertFileSrc()` helper to serve files over the asset protocol — this bypasses IPC entirely. For write paths (exporting processed images from Rust), write to a temp file and return the path. Reserve IPC `invoke` for metadata and small control messages only.

**Warning signs:**
- Export or filter operations taking >500 ms on a modern machine
- Profiler shows long serialization/deserialization time in IPC calls
- Memory spikes when loading large screenshots

**Phase to address:**
Foundation / Core Architecture phase — establish the IPC pattern before any image processing commands are written. Retrofitting this is expensive.

---

### Pitfall 2: Canvas Blurriness on High-DPI / Retina Screens

**What goes wrong:**
The canvas element is sized in CSS pixels but rendered at device pixels. On a Retina display with `devicePixelRatio = 2`, a 1000×700 CSS canvas actually needs 2000×1400 physical pixels. Without accounting for this, every element drawn on canvas — screenshots, annotations, borders — appears visibly blurry when users zoom in or export.

**Why it happens:**
Developers size the canvas in CSS and assume the browser handles scaling. The canvas bitmap dimensions must be set separately to `width * devicePixelRatio` and `height * devicePixelRatio`, then scaled back down via CSS. Missing this one setup step causes permanent blurriness.

**How to avoid:**
At canvas initialization:
```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = cssWidth * dpr;
canvas.height = cssHeight * dpr;
ctx.scale(dpr, dpr);
```
For export operations, render to an offscreen canvas at 2× or higher resolution regardless of `devicePixelRatio`, and let users pick export resolution independently of the preview canvas.

**Warning signs:**
- Text or screenshot edges look soft/blurry in the editor preview
- Exported images look worse than the source screenshot
- Users on MacBooks report the preview looking less sharp than their display

**Phase to address:**
Canvas foundation phase. Set this up in the first canvas component — changing it later requires auditing every draw call.

---

### Pitfall 3: Global Shortcuts Do Not Work on Linux Wayland

**What goes wrong:**
Tauri's `tauri-plugin-global-shortcut` relies on X11's global hotkey mechanism. Wayland — the default display server on most modern Linux distros (Ubuntu 22.04+, Fedora, Pop!_OS) — intentionally blocks apps from intercepting keyboard events when the app is not focused. Global shortcuts silently fail or cause crashes in libX11 when the compositor is Wayland.

**Why it happens:**
This is a deliberate Wayland security decision, not a bug. Wayland's design prevents any app from eavesdropping on input for other apps. Tauri's global shortcut library explicitly disables itself on Wayland because it cannot function safely there. No workaround exists without OS-level daemon integration (e.g., KDE's KWin scripting, `ydotool`).

**How to avoid:**
- Document the limitation clearly in the Linux install guide
- Provide an alternative activation method that does not require a global shortcut: system tray icon click, a CLI invocation (`screenshots capture`), or a launchable companion helper
- Detect Wayland at startup (`WAYLAND_DISPLAY` env var) and show an informational banner rather than silently failing
- Do not block the Linux release on this — provide tray + CLI as first-class activation paths

**Warning signs:**
- Running on Ubuntu with Wayland session and pressing the capture hotkey does nothing
- No error is thrown — the shortcut is simply never registered

**Phase to address:**
Screenshot capture phase. Make capture possible via multiple paths from day one; don't design the UX around the global shortcut being the only entry point.

---

### Pitfall 4: macOS Screen Recording Permission Breaks on App Update

**What goes wrong:**
macOS requires the Screen Recording entitlement for any app that captures screen content. This permission is granted by the user once. However, after an app update (new binary hash), macOS invalidates the previously granted permission and prompts the user again — or worse, silently fails to capture and shows a black screen. This is a known macOS behavior affecting all screen capture apps.

**Why it happens:**
macOS ties Screen Recording permission to the code-signed binary identity. When the binary changes (every update), the OS treats it as a new app for permission purposes. This is an OS-level security mechanism, not a Tauri bug.

**How to avoid:**
- Request Screen Recording permission at first launch with a clear explanation of why it is needed
- Add a permission check before every capture attempt and show a recovery UI (deep link to System Preferences) if permission is denied
- Add automated UI tests that verify the permission prompt flow
- In the macOS entitlements file, ensure `com.apple.security.cs.allow-jit` is present (required for WebView JIT compilation) and `com.apple.security.device.audio-input` is not mistakenly added (triggers unnecessary permissions)

**Warning signs:**
- Screenshots come back as black images or zero-byte files
- No error is thrown by the capture API — macOS silently blocks without an exception in some cases
- Users report it "stopped working after the update"

**Phase to address:**
Screenshot capture phase. Build the permission check and recovery UI alongside the first capture implementation, not as a polish step.

---

### Pitfall 5: Undo/Redo History Exhausts Memory with Image-Heavy State

**What goes wrong:**
Naive undo/redo implementations snapshot the full canvas state (including all image pixel data) on every operation. A composition with a 4K background image plus several annotations can be 15–40 MB per snapshot. With 50 undo steps, that is 750 MB–2 GB of RAM held in the undo stack — which crashes the app on memory-constrained machines or causes severe slowdowns.

**Why it happens:**
Developers copy canvas editor undo/redo examples from the web that serialize the full canvas bitmap via `toDataURL()`. This works for small demos but is catastrophic for real images.

**How to avoid:**
Store structural state only — the object model (image paths, position, scale, crop rect, annotation list, filter parameters) — not pixel data. Pixel data can be recomputed from the model. Image files stay on disk; the undo stack stores references. Use a command pattern (not snapshot pattern) for undo. Cap history at 50–100 steps and evict oldest entries.

**Warning signs:**
- RAM usage climbs continuously as the user edits
- Undo/redo slows down after many operations
- App crashes or becomes unresponsive on machines with <8 GB RAM

**Phase to address:**
Canvas editor foundation phase. The undo architecture must be decided before annotation tools are built — changing it later requires rewriting all mutation paths.

---

### Pitfall 6: Cross-Platform CSS Rendering Inconsistency Breaks the UI

**What goes wrong:**
Tauri uses three completely different rendering engines: WebKit (macOS), WebView2 / Chromium-based (Windows), and WebKitGTK (Linux). Visual properties — fonts, blur effects, `backdrop-filter`, `box-shadow`, CSS filters including `drop-shadow` — render differently or not at all across platforms. Specifically:
- `backdrop-filter: blur()` does not work in WebKitGTK on Linux without workarounds
- WebKitGTK renders `font-weight` ~100 units heavier than specified (a documented bug)
- CSS `filter: drop-shadow()` has known bugs in Safari/WebKit when combined with animation

**Why it happens:**
Developers build and test primarily on macOS (WebKit), ship the app, and discover the Linux/Windows rendering is broken. The three rendering engines are not feature-equivalent.

**How to avoid:**
- Test on all three platforms before every release (set up CI with platform matrix)
- Avoid CSS effects that have known WebKitGTK bugs: `backdrop-filter`, complex `filter` chains
- For `backdrop-filter` glass effects in the UI chrome, provide a solid fallback for Linux
- Normalize font weights in the global CSS: `font-weight` values should be set 100 lighter than the target weight on Linux, or use variable fonts with explicit render hints
- Shadow and blur effects used in the canvas editor should be implemented via Canvas 2D API, not CSS, to ensure pixel-perfect consistency across platforms and in exports

**Warning signs:**
- Fonts look bold/heavy on Linux
- Frosted-glass UI elements render as opaque on Linux
- Drop shadows look different on Windows vs macOS
- Tests pass on dev machine (macOS) but fail on Linux CI

**Phase to address:**
UI foundation phase. Establish cross-platform CSS baseline and testing matrix before building the editor UI.

---

### Pitfall 7: Background Removal Model Size and First-Run Latency

**What goes wrong:**
On-device background removal requires an ML model. Common models (RMBG-1.4, MODNet, U2Net) are 40–170 MB. Bundling the model in the installer violates the <20 MB binary target. Downloading on first use works but creates a jarring experience — the user clicks "Remove Background" and waits 30–60 seconds on a slow connection with no feedback. Worse, if the download fails silently, the feature appears broken.

**Why it happens:**
Background removal is typically added late in development after the core editor is working. By then, the download-on-demand flow is an afterthought with no proper loading state, progress tracking, or offline fallback.

**How to avoid:**
- Separate the model download from the feature button — offer a one-time "Download AI features" option during onboarding or in Settings
- Show a progress indicator with estimated time
- Cache the model to the app's data directory (`$APPDATA` / `~/Library/Application Support`) after download
- Verify model file integrity with a checksum before use
- Provide graceful degradation: if the model is not downloaded, the button is disabled with a "Download required" tooltip

**Warning signs:**
- Installer grows beyond 20 MB after bundling the model
- First activation of Background Removal causes a UI freeze
- No progress feedback during model download

**Phase to address:**
Background removal phase (dedicated phase). Implement the download-and-cache infrastructure first, then the inference integration.

---

### Pitfall 8: Export Produces Black Transparent Areas in JPEG Mode

**What goes wrong:**
When exporting to JPEG from a canvas that has transparent regions (e.g., a screenshot on a transparent background before a background color/gradient is applied), `canvas.toBlob('image/jpeg')` fills transparent pixels with black. JPEG has no alpha channel, so the browser composites against black by default. The result looks like corrupted output.

**Why it happens:**
JPEG does not support transparency. Developers call `toBlob()` with `image/jpeg` without first compositing the canvas onto a white (or user-specified) background. The same bug appears on Firefox for transparent PNGs when JPEG is requested.

**How to avoid:**
Before exporting to JPEG, always draw a background rectangle the size of the canvas using the export background color (white by default) on an offscreen canvas, then draw the main canvas on top, then call `toBlob()`. For PNG and WebP, compositing is not needed. Add an automated visual regression test that exports a known composition to JPEG and checks for black pixels.

**Warning signs:**
- JPEG exports have black rectangles where transparent regions were
- Export looks correct for PNG but broken for JPEG
- Users report "corrupted" exports

**Phase to address:**
Export phase. Write the export pipeline with format-specific compositing from the start, not as a hotfix.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Serialize full canvas state for undo | Simple to implement | Memory exhaustion at scale; undo becomes slow | Never — use structural state from day one |
| Use CSS `filter` for drop shadows instead of Canvas API | Faster to style | Export doesn't capture CSS effects; cross-platform inconsistency | Only for UI chrome, never for canvas content |
| Load images via `invoke()` with base64 | Easy to start | IPC bottleneck for large images | Never — use `convertFileSrc()` or asset protocol |
| Bundle ML model in binary | No download step | Binary exceeds 20 MB limit; violates size constraint | Never — download on demand |
| Test only on macOS during development | Fast iteration | Rendering bugs discovered late; expensive to fix | Acceptable for first week only; CI must cover all platforms by phase 2 |
| `toDataURL()` instead of `toBlob()` for export | Simple one-liner | Entire image held in memory as string; OOM on large exports | Never for user-facing exports; acceptable for thumbnails |
| Global shortcut as only capture entry point | Clean UX on macOS | Silently broken on Linux Wayland | Never — always provide tray + CLI alternatives |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Tauri `invoke` + image data | Passing raw pixel bytes as JSON | Use raw binary payloads or write to temp file and pass path |
| macOS Screen Recording entitlement | Assuming permission persists across updates | Check permission at every app launch and before every capture |
| Tauri auto-updater + sidecar binaries | Adding sidecars to `externalBin` breaks notarization | Sign sidecars separately before bundling; verify against Apple's requirements |
| Canvas 2D `shadowBlur` | Using on every draw call (extremely expensive) | Pre-render shadows to an offscreen canvas; apply once |
| `devicePixelRatio` scaling | Reading once at startup | Listen for `window.matchMedia` changes (user moves app to different monitor) |
| WebKitGTK on Linux | Using `backdrop-filter` for glass UI elements | Detect WebKitGTK and fall back to solid backgrounds |
| ONNX Runtime Web (background removal) | Loading model synchronously on first use | Lazy-load with progress tracking; cache in app data directory |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-rendering React components on every canvas mouse move | UI thread jank during drag operations | Separate canvas state from React state; use refs + direct canvas API for hot paths | Any mouse interaction with the canvas |
| `shadowBlur` on main canvas every frame | CPU spikes, dropped frames | Render shadows to offscreen canvas once; composite when needed | When any annotated element has a shadow |
| Calling `toDataURL()` for history snapshots | RAM grows unboundedly | Store object model (JSON), not pixel data | After ~10 undo steps with large images |
| Re-applying all filters on every edit | Latency stacks multiplicatively | Apply filters lazily; cache intermediate renders | When 3+ filters are active simultaneously |
| Background gradient re-rendering on every prop change | Noticeable flicker | Memoize gradient computation; re-render only on gradient parameter changes | Any time a non-gradient property changes |
| Exporting via main thread `toBlob` for large images | UI freezes during export | Export in a Web Worker or offscreen canvas; show progress | Images > 4 MP or export resolution > 2× source |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Enabling `dangerouslyAllowedFiles` broadly in Tauri capabilities | Arbitrary file system access from webview | Use scoped filesystem permissions; whitelist specific directories only |
| Accepting image paths from URL params without validation | Path traversal if combined with file reading | Validate paths are within expected directories before passing to Rust |
| Telemetry or crash reporting that includes screenshot content | Privacy violation — user screenshots contain sensitive data | This project is offline-first; ensure no crash reporter uploads image data; audit third-party dependencies for network calls |
| Clipboard access reading more than the user expects | Privacy breach (macOS 16 adds clipboard access alerts) | Request clipboard access only on explicit user action (Paste button), not on focus or background |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Only one way to trigger screenshot capture (global shortcut) | Linux Wayland users cannot use the app's core feature | Provide system tray click, CLI command, and in-app manual import as additional entry points |
| No visual feedback during background removal (10–30 s operation) | User thinks app is frozen; force-quits | Show spinner with estimated time; allow cancellation |
| Exporting overwrites without warning | Users lose original file | Save to a new filename by default; add overwrite confirmation |
| Canvas preset names are not editable | Users can't tell presets apart after creating several | Allow rename in-place on the preset card |
| Blur/pixelate brush has no size preview cursor | Users apply blur in wrong area, must undo | Show a circle cursor sized to the brush radius before click |
| No keyboard shortcut for Undo/Redo shown in UI | Users rely on muscle memory and discover it by accident | Show shortcut hints in toolbar tooltips and menu bar |
| Export quality slider has no preview | Users export at wrong quality and must re-export | Show file size estimate and a small preview crop as quality changes |

---

## "Looks Done But Isn't" Checklist

- [ ] **Screenshot capture:** Works on macOS — verify Screen Recording permission recovery flow works after simulated app update
- [ ] **Global shortcuts:** Work on macOS and Windows — verify on Linux X11 and document graceful degradation on Wayland
- [ ] **High-DPI canvas:** Looks sharp on MacBook Retina — verify on a 1× monitor and on a 3× HiDPI Windows display
- [ ] **JPEG export:** Produces correct output for opaque compositions — verify transparent regions do not produce black fill
- [ ] **Undo/redo:** Works for 10 steps — verify memory usage is stable after 100 steps with a large image
- [ ] **Background removal:** Works when model is cached — verify download flow, progress tracking, checksum validation, and failure recovery
- [ ] **Cross-platform rendering:** Looks correct on macOS — verify fonts, shadows, and blur effects on Linux and Windows in CI
- [ ] **Auto-updater:** Updates successfully in CI — verify permission re-request flow on macOS after update
- [ ] **CLI batch processing:** Works for single file — verify it handles paths with spaces, non-ASCII characters, and directories with 100+ files
- [ ] **Canvas preset save/load:** Saves successfully — verify presets persist across app restarts and include all canvas parameters

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| IPC bottleneck discovered after all Rust commands built | HIGH | Audit every `invoke` call; migrate image data paths to asset protocol or temp files; may require restructuring Rust command signatures |
| Canvas blurriness discovered after UI is built | MEDIUM | Add DPR scaling to canvas init + audit all hardcoded sizes; test on Retina and 1× simultaneously |
| Undo memory leak discovered in production | MEDIUM | Replace snapshot store with command store; requires rewriting all mutation hooks but does not change the UI |
| Wayland global shortcut broken at launch | LOW | Add tray click alternative and document limitation; no code change to existing capture logic needed |
| JPEG export black-fill bug reported | LOW | Wrap export with background compositing; isolated to the export module |
| Background removal model bundled in installer | HIGH | Move to download-on-demand; requires new infrastructure (download manager, progress UI, caching); rebuild distribution |
| macOS permission breaks after first update | MEDIUM | Add permission check + recovery UI to startup sequence; no Rust changes needed |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Tauri IPC image data bottleneck | Phase 1: Foundation / Architecture | Benchmark: 10 MB image round-trip completes in <100 ms |
| Canvas high-DPI blurriness | Phase 1: Canvas foundation | Visual test: canvas looks sharp on Retina and 1× monitor simultaneously |
| Linux Wayland global shortcuts | Phase 2: Screenshot capture | Manual test on Ubuntu Wayland session; tray activation works as fallback |
| macOS Screen Recording permission reset | Phase 2: Screenshot capture | Simulate update: delete old binary, re-install, verify permission prompt appears |
| Undo/redo memory exhaustion | Phase 3: Canvas editor | Memory profiler: RAM stable after 100 operations with 10 MB image |
| Cross-platform CSS rendering | Phase 3: UI foundation | CI runs on Linux and Windows; screenshot diff tests pass |
| Background removal model size | Phase 4: Background removal | Installer binary < 20 MB without model; download flow tested on slow network |
| JPEG export black fill | Phase 5: Export pipeline | Automated test: export a transparent composition to JPEG, verify no black pixels |

---

## Sources

- [Tauri IPC Raw Binary Payloads — GitHub Discussion #5690](https://github.com/tauri-apps/tauri/discussions/5690)
- [Tauri IPC Performance Analysis — Medium](https://medium.com/@srish5945/tauri-rust-speed-but-heres-where-it-breaks-under-pressure-fef3e8e2dcb3)
- [Tauri IPC ArrayBuffer Support — GitHub Issue #13405](https://github.com/tauri-apps/tauri/issues/13405)
- [Global Shortcut Wayland Support — GitHub Issue #3578](https://github.com/tauri-apps/tauri/issues/3578)
- [Global Hotkey Wayland — GitHub Issue #28](https://github.com/tauri-apps/global-hotkey/issues/28)
- [macOS Screen Recording Permission — GitHub Issue #7647](https://github.com/tauri-apps/tauri/issues/7647)
- [tauri-plugin-macos-permissions — crates.io](https://crates.io/crates/tauri-plugin-macos-permissions)
- [Cross-Platform Layout/Rendering Differences — GitHub Discussion #12311](https://github.com/tauri-apps/tauri/discussions/12311)
- [WebKitGTK Font Weight Bug — Medium](https://medium.com/@dasunnimantha777/fonts-render-too-bold-in-rust-tauri-wails-on-linux-a-webkitgtk-bug-and-how-to-fix-it-8b6a0b27b613)
- [CSS drop-shadow WebKit bugs — MDN Browser Compat Data #17726](https://github.com/mdn/browser-compat-data/issues/17726)
- [Tauri backdrop-blur Tailwind fix — GitHub Gist](https://gist.github.com/FOREVEREALIZE/c2ad46c2b7f800a3e2221c03855b44d1)
- [High DPI Canvas — web.dev](https://web.dev/articles/canvas-hidipi)
- [Canvas High DPI Retina — kirupa.com](https://www.kirupa.com/canvas/canvas_high_dpi_retina.htm)
- [Konva Memory Leak Prevention — Konva Docs](https://konvajs.org/docs/performance/Avoid_Memory_Leaks.html)
- [Konva Undo/Redo — Konva Docs](https://konvajs.org/docs/react/Undo-Redo.html)
- [Konva All Performance Tips](https://konvajs.org/docs/performance/All_Performance_Tips.html)
- [Optimizing Canvas — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [Canvas Performance — web.dev](https://web.dev/articles/canvas-performance)
- [HTMLCanvasElement.toBlob — MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
- [ONNX Runtime Web Background Removal — Webkul Blog](https://webkul.com/blog/browser-based-background-remover-using-onnx/)
- [Tauri macOS Code Signing and Notarization — Tauri Docs](https://v2.tauri.app/distribute/sign/macos/)
- [Shipping Tauri with notarization and Homebrew — DEV Community](https://dev.to/0xmassi/shipping-a-production-macos-app-with-tauri-20-code-signing-notarization-and-homebrew-mc3)
- [macOS 16 Clipboard Privacy Protection — 9to5Mac](https://9to5mac.com/2025/05/12/macos-16-clipboard-privacy-protection/)

---
*Pitfalls research for: Screenshot beautifier desktop app (Tauri 2.x + React/TypeScript)*
*Researched: 2026-04-09*
