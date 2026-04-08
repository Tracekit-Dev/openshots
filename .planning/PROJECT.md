# Screenshots

## What This Is

An open-source, cross-platform desktop app for capturing and beautifying screenshots. Built with Tauri (Rust backend + React/TypeScript frontend), it lets users take screenshots, add beautiful backgrounds, annotate with arrows/shapes/text, compose multiple images, blur sensitive areas, remove backgrounds, and export polished visuals — all offline, all free. A TinyShots alternative that runs on Mac, Windows, and Linux.

## Core Value

Users can turn raw screenshots into polished, shareable visuals in seconds — without leaving the app.

## Current Milestone: v1.0 Initial Release

**Goal:** Ship a fully functional screenshot beautifier that matches TinyShots' core features and adds cross-platform support.

**Target features:**
- Screenshot capture with global shortcuts
- Beautiful backgrounds (gradients, solid colors, custom images)
- Annotations (arrows, shapes, text, emojis)
- Multi-image compositions
- Privacy tools (blur/pixelate sensitive areas)
- Background removal
- Crop, flip, rotate
- Drop shadows and borders
- Export to PNG, JPEG, WebP
- Canvas presets
- CLI for batch processing

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Screenshot capture via system tray with global hotkeys
- [ ] Canvas editor with drag-and-drop image placement
- [ ] Background system (gradients, solid colors, custom uploads)
- [ ] Annotation tools (arrows, rectangles, ellipses, text, emojis)
- [ ] Multi-image composition with auto-layout
- [ ] Blur/pixelate regions for privacy
- [ ] Background removal (on-device)
- [ ] Crop overlay, flip horizontal/vertical
- [ ] Drop shadows (even and directional)
- [ ] Auto color-matched inset borders
- [ ] Export to PNG, JPEG, WebP with quality controls
- [ ] Copy to clipboard
- [ ] Reusable canvas presets
- [ ] CLI for batch processing
- [ ] Keyboard shortcuts throughout

### Out of Scope

- Cloud storage/sync — privacy-first, fully offline
- Subscription model — free and open source
- Video/GIF recording — focus on static screenshots for v1
- Mobile apps — desktop-first

## Context

- **Competitor:** TinyShots ($39, Mac-only, closed source) — we're building a free, cross-platform, open-source alternative
- **Target users:** Developers, indie hackers, content creators, anyone who shares screenshots regularly
- **Tech stack:** Tauri 2.x (Rust) + React + TypeScript + Canvas/WebGL for rendering
- **Privacy:** Fully offline, no telemetry, no data leaves the machine
- **Distribution:** GitHub releases, Homebrew, winget, AUR

## Constraints

- **Tech stack**: Tauri 2.x + React + TypeScript — cross-platform requirement drives this choice
- **Offline**: All processing must happen locally, no network calls for core features
- **Performance**: Image operations must feel instant (<100ms for common operations)
- **Binary size**: Target <20MB installer (Tauri advantage over Electron)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri over Electron | Smaller binary, better performance, Rust backend for image processing | — Pending |
| React + TypeScript for UI | Largest contributor pool for OSS, rich canvas libraries available | — Pending |
| Canvas API for rendering | GPU-accelerated, handles complex compositions, well-documented | — Pending |
| Cross-platform from day one | Core differentiator vs TinyShots (Mac-only) | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 after initialization*
