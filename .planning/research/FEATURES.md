# Feature Research

**Domain:** Screenshot beautifier desktop application
**Researched:** 2026-04-09
**Confidence:** HIGH (based on direct product analysis of TinyShots, CleanShot X, Shottr, Xnapper, Skrin, Snagit, ShareX)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete. Every major competitor has these. Ship without them and users will not consider the product credible.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Global hotkey capture | Users expect to trigger capture from any app without switching | LOW | System tray + configurable shortcut. CleanShot X, Shottr, TinyShots all lead with this |
| Capture area selection | Users need to select specific regions, not just full screen | LOW | Marquee selection with crosshair. Visual handles during selection |
| Full-screen and window capture | Baseline capture modes. Every tool has these | LOW | Window capture should optionally include shadow |
| Gradient/solid color backgrounds | The core "beautify" action. Without it, the app is just a screenshot tool | MEDIUM | Need both gradient (linear/radial) and solid options with color picker. TinyShots has 180+ wallpapers; CleanShot X has 10 built-in + upload |
| Padding/spacing control | Users need breathing room around the screenshot on the canvas | LOW | Numeric input + drag handle. Labeled padding values (Xnapper added labels after user feedback) |
| Drop shadow | Makes screenshots pop off the background. Universally expected | LOW | Even shadow and directional shadow both expected. Intensity + blur radius controls |
| Rounded corners on screenshot | Softens raw screenshots. Expected for polished output | LOW | Corner radius slider. Should apply to the embedded image, not just the canvas |
| Annotation: arrows | Most common annotation action for callouts and tutorials | MEDIUM | At minimum: straight and curved arrows with thickness/color control. TinyShots has 3 styles, CleanShot X has 4 |
| Annotation: text | Labels and callouts need text | LOW | Font, size, color controls. Shadow/outline for legibility over screenshots |
| Annotation: rectangles and ellipses | Highlight regions, circle things | LOW | Fill + stroke + corner radius. Opacity control |
| Blur/pixelate regions | Privacy. Users share screenshots containing passwords, emails, personal info | MEDIUM | Both blur and pixelate modes. Intensity control. Used constantly by developers and content creators |
| Crop tool | Users need to trim screenshots before beautifying | LOW | Non-destructive. Aspect ratio lock. Edge-snap |
| Export to PNG | Universal output format. No one should have to guess if it works | LOW | Lossless. Transparency preserved |
| Export to JPEG | For web sharing where file size matters | LOW | Quality slider (0–100) |
| Copy to clipboard | The fastest sharing path. Power users live here | LOW | Instantly paste into Slack, Notion, email, etc. |
| Canvas aspect ratio presets | Users target specific platforms (Twitter, LinkedIn, Product Hunt) | LOW | Landscape 16:9, Square 1:1, Story 9:16, Product Hunt 1270x760 are the common presets |
| Keyboard shortcuts throughout | Pro users and developers refuse to reach for the mouse constantly | MEDIUM | Every action should have a discoverable shortcut. Not just capture — also crop, copy, export |

### Differentiators (Competitive Advantage)

Features that set this product apart. The gap in the market is: no tool does all of these cross-platform, offline, and free. These features either have no open-source equivalent or no cross-platform equivalent.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cross-platform (Mac + Windows + Linux) | Every Mac-only competitor (CleanShot X, Shottr, Xnapper, TinyShots) leaves Windows and Linux users with poor alternatives. ShareX is Windows-only. This is the primary competitive moat | HIGH | The core reason for Tauri. Must work identically on all three platforms |
| Multi-image composition | Place multiple screenshots on one canvas with auto-layout. TinyShots has auto fan-layout; CleanShot X supports drag-and-drop into editor. Most tools require external editors for this | HIGH | Free-form positioning + snap guides + scale + rotate. Auto fan and grid layouts as starting points |
| On-device background removal | One-click removal of screenshot backgrounds (e.g. app window chrome). TinyShots uses Apple Vision framework. No cross-platform open-source equivalent exists | HIGH | Use ONNX Runtime + rembg or similar for cross-platform inference. CPU inference only (no cloud). Slower on non-Apple hardware — manage expectations |
| Auto color-matched inset border | A border that matches the dominant color of the screenshot content. Creates a polished "app presentation" look without manual color picking | MEDIUM | Dominant color extraction + border rendering. TinyShots has this. No other cross-platform tool does |
| CLI for batch processing | Developers and power users want scriptable workflows (CI/CD, marketing asset generation). No other beautifier offers this | HIGH | Tauri Rust binary with CLI subcommand. Apply preset + input file + output path. Batch mode with glob patterns |
| Reusable canvas presets | Save padding, background, shadow, aspect ratio, border settings as a named preset. One click to re-apply | MEDIUM | JSON-serialized preset system. Export/import presets for team sharing |
| Custom background images | Upload your own image as a canvas background. Gradient presets alone feel limiting | LOW | File picker + drag-and-drop. Store in app data directory |
| Flip horizontal/vertical | Common correction (screenshots from mobile often come mirrored) | LOW | Reversible. Non-destructive |
| Export to WebP | Modern web format. Better compression than JPEG at same quality | LOW | Quality slider. Increasingly expected for web publishing |
| Scrolling capture | Capture content longer than the screen (long web pages, Slack threads). Shottr and CleanShot X have this; it's increasingly expected | HIGH | Auto-scroll detection. Requires Rust-level accessibility APIs on each platform |
| Emoji stickers | Quick visual personality. TinyShots supports emoji as stickers. Popular in developer and content creator communities | LOW | OS emoji picker integration + render as canvas element |
| Window chrome decoration | Simulate macOS traffic lights or Windows title bar on screenshots. Skrin and BrandBird offer this. Useful for cross-platform documentation | MEDIUM | SVG-based decoration layer. macOS and Windows styles |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Cloud sync / screenshot library | Users want access anywhere and search across captures | Violates the privacy-first, offline-only core value. Adds server infrastructure, auth, storage costs, and GDPR surface area. Kills the "no data leaves your machine" promise | Let the OS filesystem be the library. Export to a user-chosen folder. Integrate with existing cloud drives (the OS handles sync) |
| Video / GIF recording | Many screenshot tools offer it. Users ask for parity | Massive scope expansion. Video encoding (FFmpeg), buffer management, disk I/O, format support — easily doubles the codebase. Competes with dedicated tools like OBS, Loom, Kap | Stay focused on static screenshots for v1. Explicitly document this as out of scope |
| Subscription / paywalled features | Common monetization model (CleanShot X, Setapp) | Contradicts open-source and free positioning. Alienates developer audience. Adds payment infrastructure complexity | One-time pricing or fully free. GitHub Sponsors for sustainability |
| Built-in screenshot history / catalog | Convenient to browse past captures inside the app | High complexity (indexing, thumbnails, search), storage management, and UI space. Adds little value over the OS file system + Spotlight/Everything | Save exports to a well-named folder. Let OS search handle retrieval |
| AI-powered auto-enhancement / smart crop | "Just make it look great automatically" requests | Requires ML model distribution (large binary), model quality variance across image types, and undermines user control | Manual controls with good defaults. Auto-balance (like CleanShot X's padding auto-balance) for the most common need |
| OCR / text extraction from screenshots | Power feature. Shottr and CleanShot X offer it | Different product goal — this is a capture-and-extract tool, not a beautifier. Adds significant complexity and competes poorly against dedicated OCR tools | Out of scope. Users who need OCR should use a dedicated tool. Document this explicitly |
| Color picker / screen ruler | Developer utilities. Shottr positions itself on these | Scope creep. Separate concern from beautification. Adds UI complexity for non-developer users | Out of scope for v1. May be added as an optional plugin or separate tool |
| S3 / cloud upload destinations | ShareX's defining feature. Heavy power-user demand | Adds server-side configuration complexity, auth handling, and support burden. Contradicts offline-first positioning | Copy to clipboard + export to file. Users can upload manually or via their own scripts |

## Feature Dependencies

```
Screenshot Capture
    └──requires──> System Tray / Menu Bar
    └──requires──> Global Hotkey Registration (OS-level)

Canvas Editor
    └──requires──> Screenshot Capture (or file import)
    └──requires──> Background System
    └──requires──> Padding / Layout Engine

Background System
    └──requires──> Color Picker (for solid/gradient)
    └──enhances──> Custom Background Images (file picker)

Annotation Tools
    └──requires──> Canvas Editor
    └──enhances──> Privacy Tools (blur/pixelate)

Multi-Image Composition
    └──requires──> Canvas Editor
    └──requires──> Drag-and-drop input
    └──enhances──> Auto fan-layout

Background Removal (on-device AI)
    └──requires──> Canvas Editor
    └──requires──> ONNX Runtime (cross-platform ML)
    └──enhances──> Multi-Image Composition (clean subject extraction)

Canvas Presets
    └──requires──> Canvas Editor (all settings must be serializable)
    └──requires──> Background System
    └──requires──> Export System

CLI Batch Processing
    └──requires──> Canvas Presets (presets define the batch template)
    └──requires──> Export System
    └──conflicts──> Interactive canvas (CLI is headless)

Export System
    └──requires──> Canvas Editor
    └──produces──> PNG, JPEG, WebP
    └──produces──> Clipboard copy

Scrolling Capture
    └──requires──> Platform accessibility APIs (each OS separately)
    └──requires──> Screenshot Capture
    └──enhances──> Canvas Editor (feeds a tall image)
```

### Dependency Notes

- **Canvas Presets requires all canvas settings to be serializable:** Padding, background type/value, shadow params, border settings, aspect ratio — all must be representable as a JSON-serializable struct from day one. Retrofitting this later causes breaking changes.
- **CLI requires Presets:** The CLI's value proposition is "apply a saved preset to a file." Without presets, CLI is just a raw export tool with limited value.
- **Background Removal requires ONNX Runtime:** On Mac, TinyShots uses Apple Vision (fast, native). Cross-platform requires a different approach. ONNX Runtime with a quantized background removal model (e.g., rembg/u2net) works on all three OSes but is slower on non-Apple hardware. Consider separate model download on first use to keep installer small.
- **Scrolling Capture is platform-isolated:** Implementation differs per OS (macOS Accessibility API, Windows UIA, Linux AT-SPI). Build platform-specific Rust modules for each. This is a v1.x feature, not v1.0.

## MVP Definition

### Launch With (v1.0)

Minimum viable product — must match TinyShots' core value proposition as a cross-platform free alternative.

- [ ] Global hotkey + system tray capture (fullscreen, area, window) — core trigger
- [ ] Canvas editor with background system (gradients, solid colors, custom image) — the "beautify" action
- [ ] Padding, shadow, rounded corners, aspect ratio controls — baseline polish
- [ ] Annotation tools: arrows, rectangles, ellipses, text, emoji stickers — expected by all users
- [ ] Blur/pixelate regions — privacy is non-negotiable for sharing screenshots
- [ ] Crop, flip horizontal/vertical — basic image correction
- [ ] Drop shadow (even + directional) — visual quality
- [ ] Auto color-matched inset border — the differentiating visual finish
- [ ] Multi-image composition with auto fan-layout — matches TinyShots
- [ ] Background removal (on-device, cross-platform) — key TinyShots feature to match
- [ ] Canvas presets (save/load) — enables CLI and power user workflows
- [ ] Export: PNG, JPEG, WebP with quality controls — complete export surface
- [ ] Copy to clipboard — primary sharing action
- [ ] CLI for batch processing — developer differentiator
- [ ] Full keyboard shortcut coverage — expected by target audience

### Add After Validation (v1.x)

Features to add once core is working and users have given feedback.

- [ ] Scrolling capture — commonly requested but complex. Validate demand first
- [ ] Window chrome decoration (macOS/Windows frames) — useful for cross-platform documentation
- [ ] Additional annotation types: step counters, speech bubbles, spotlights — power user requests
- [ ] Preset import/export (JSON) — team sharing workflow
- [ ] More background packs (themed wallpapers) — content expansion

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Plugin architecture — extensibility for power users
- [ ] Localization — expand beyond English after core is stable
- [ ] Automated layout intelligence (ML-based composition suggestions) — high complexity, uncertain value
- [ ] Image history with thumbnail browser — complex, competes with OS filesystem

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Global hotkey capture | HIGH | LOW | P1 |
| Canvas + background system | HIGH | MEDIUM | P1 |
| Padding / shadow / corners | HIGH | LOW | P1 |
| Annotation tools (arrows, shapes, text) | HIGH | MEDIUM | P1 |
| Blur / pixelate privacy | HIGH | MEDIUM | P1 |
| Crop / flip | HIGH | LOW | P1 |
| Multi-image composition | HIGH | HIGH | P1 |
| Export (PNG/JPEG/WebP) + clipboard | HIGH | LOW | P1 |
| Canvas presets | HIGH | MEDIUM | P1 |
| Background removal (on-device) | HIGH | HIGH | P1 |
| CLI batch processing | MEDIUM | HIGH | P1 (differentiator, no cross-platform alternative) |
| Auto color-matched inset border | MEDIUM | MEDIUM | P1 (differentiator) |
| Window chrome decoration | MEDIUM | MEDIUM | P2 |
| Scrolling capture | MEDIUM | HIGH | P2 |
| Additional annotation types (counters, spotlights) | LOW | MEDIUM | P2 |
| Preset import/export | LOW | LOW | P2 |
| Emoji stickers | MEDIUM | LOW | P1 |
| Custom background images | MEDIUM | LOW | P1 |
| WebP export | MEDIUM | LOW | P1 |

**Priority key:**
- P1: Must have for v1.0 launch
- P2: Should have, target v1.x after launch validation
- P3: Nice to have, v2+ consideration

## Competitor Feature Analysis

| Feature | TinyShots | CleanShot X | Shottr | Xnapper | Skrin | ShareX | Our Approach |
|---------|-----------|-------------|--------|---------|-------|--------|--------------|
| Platform | Mac only | Mac only | Mac only | Mac only | Windows only | Windows only | Mac + Windows + Linux |
| Price | $39 one-time | $29 one-time or Setapp | $8 | $5 | Unclear | Free | Free, open source |
| Background system | 180+ wallpapers + gradients | 10 built-in + custom upload | Gradients + shadows | Preset gradients only | Gradients | Basic effects | Gradients + solid + custom upload |
| Multi-image compose | Yes (auto fan-layout) | Yes (drag into editor) | No | No | No | Image combiner | Yes (auto fan + free position) |
| Background removal | Yes (Apple Vision) | No | No | No | No | No | Yes (ONNX, cross-platform) |
| Auto inset border | Yes | No | No | No | No | No | Yes |
| Annotations | Full suite | Full suite | Full suite | Minimal | No | Full suite | Full suite |
| Blur/pixelate | Yes | Yes | Yes | No | No | Yes | Yes |
| OCR | No | Yes | Yes | No | No | Yes | No (out of scope) |
| Scrolling capture | No | Yes | Yes | No | No | Yes | v1.x |
| Canvas presets | Yes | No | No | No | No | No | Yes |
| CLI | Yes | No | No | No | No | Partial (upload only) | Yes |
| Export formats | PNG, JPEG, HEIF | PNG, JPEG, GIF | PNG, JPEG | PNG, JPEG | PNG, JPEG, WebP, GIF | Many | PNG, JPEG, WebP |
| Offline/no cloud | Yes | Optional (CleanShot Cloud) | Yes (S3 opt-in) | Yes | Yes | Yes | Yes (mandatory) |
| Open source | No | No | No | No | No | Yes | Yes |
| Window chrome decor | No | No | No | No | Yes | No | v1.x |

## Sources

- [TinyShots official site](https://www.tinyshots.app/) — feature list and pricing
- [CleanShot X features page](https://cleanshot.com/features) — full feature breakdown
- [Shottr official site](https://shottr.cc) — feature list including developer tools
- [Xnapper App Store listing](https://apps.apple.com/us/app/xnapper-beautiful-screenshot/id1630178233) — features and reviews
- [Skrin official site](https://skrin.app/) — Windows screenshot beautifier features
- [CleanShot X review 2026 — Tutsflow](https://tutsflow.com/reviews/cleanshot-x/)
- [7 Best CleanShot X Alternatives for Windows and Browser 2026 — NexaSphere](https://nexasphere.io/blog/cleanshot-alternatives-windows-browser-2026)
- [Shottr review 2026 — ScreenSnap](https://www.screensnap.pro/blog/shottr-mac-review)
- [ShareX official site](https://getsharex.com/) — open source Windows tool feature reference
- [TechSmith Snagit features](https://www.techsmith.com/snagit/features/) — enterprise annotation patterns
- [BrandBird screenshot beautifier](https://www.brandbird.app/) — web-based competitor with device mockup features
- [Screenshot Rocks — device mockups](https://screenshot.rocks/) — browser frame and device frame reference

---
*Feature research for: Screenshot beautifier desktop application (cross-platform, open source)*
*Researched: 2026-04-09*
