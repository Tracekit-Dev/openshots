---
status: complete
phase: 02-canvas-editor
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md
started: 2026-04-09T16:00:00Z
updated: 2026-04-09T16:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Drag-and-Drop Image Import
expected: Drag an image file from Finder onto the canvas. Image appears centered with rounded corners and drop shadow.
result: issue
reported: "no nothing happened"
severity: major

### 2. Upload Image via File Picker
expected: Click "Upload" in the toolbar. Native file dialog opens filtered to image types. Select an image — it appears on the canvas.
result: pass

### 3. Background Type Switching
expected: In the right sidebar Background panel, switch between Solid, Linear Gradient, Radial Gradient, and Image. Each type renders immediately on the canvas behind the screenshot.
result: pass

### 4. Gradient Angle Control
expected: With a linear gradient background selected, drag the angle slider (0-360). The gradient direction updates live on the canvas.
result: pass

### 5. Image Background with Blur
expected: Select Image background type, upload/select a background image. Increase the Blur slider — the background image blurs progressively.
result: issue
reported: "blur doesn't work"
severity: major

### 6. Padding Control
expected: With an image on canvas, adjust the Padding slider in the Style panel. Space between the image edges and canvas edges increases/decreases uniformly.
result: issue
reported: "Padding doesn't work"
severity: major

### 7. Corner Radius
expected: Adjust the Corner Radius slider in the Style panel. The screenshot's corners become more or less rounded in real-time.
result: pass

### 8. Drop Shadow Toggle and Blur
expected: Toggle shadow on in Style panel. A drop shadow appears under the screenshot. Adjust blur slider — shadow softness changes. Adjust offset — shadow shifts vertically.
result: issue
reported: "drop shadow no"
severity: major

### 9. Inset Border with Auto-Match Color
expected: Toggle inset border on in Style panel. A border appears around the screenshot. The border color auto-matches the dominant color of the image edges.
result: issue
reported: "inset also no"
severity: major

### 10. Flip Horizontal / Vertical
expected: With an image selected, click "Flip H" — image mirrors horizontally. Click "Flip V" — image mirrors vertically. Both are undoable.
result: pass

### 11. Aspect Ratio Presets
expected: Click different aspect ratio presets in the left sidebar (16:9, 1:1, 9:16, etc.). The canvas resizes to match the selected ratio.
result: pass

### 12. Fan Layout
expected: Place 2+ images on the canvas. Click the fan layout button in Style panel. Images arrange in a fan pattern with slight rotation offsets.
result: pass

### 13. Undo / Redo
expected: Make a change (e.g., move an image). Press Cmd+Z — change is undone. Press Cmd+Shift+Z — change is redone.
result: issue
reported: "no, also no visual control for this"
severity: major

### 14. Draw Arrow Annotation
expected: Select Arrow tool (press A or click in tool panel). Click and drag on the canvas. An arrow appears from start to end point.
result: issue
reported: "click and drag no, after clicking several times I see something to rotate it but still can't drag"
severity: major

### 15. Draw Rectangle Annotation
expected: Select Rectangle tool (press R). Click and drag on canvas. A rectangle shape appears with fill and stroke.
result: pass

### 16. Draw Ellipse Annotation
expected: Select Ellipse tool (press E). Click and drag. An ellipse appears.
result: pass

### 17. Add Text Annotation
expected: Select Text tool (press T). Click on canvas. A text label appears at the click position.
result: issue
reported: "yes but I can't edit, also same quality issue as other annotations"
severity: minor

### 18. Annotation Selection and Transform
expected: Click on an existing annotation. Transformer handles appear (resize corners, rotation). Drag to resize — shape updates. Press Delete — annotation is removed.
result: issue
reported: "works partially on most shapes except text and arrow. Text goes back to initial size when let go. Same for emoji. Also only one emoji (thumbs up)"
severity: major

### 19. Blur Privacy Region
expected: Select Blur tool (press B). Click and drag over a screenshot area. A blurred region appears over that part of the image on the canvas.
result: issue
reported: "can see the shape but doesn't work, can drag but can't resize, doesn't blur anything"
severity: blocker

### 20. Pixelate Privacy Region
expected: Select Pixelate tool (press P). Click and drag over a screenshot area. A pixelated region appears over that part of the image.
result: issue
reported: "same as blur - shape visible but doesn't pixelate anything"
severity: blocker

### 21. Tool Switching via Keyboard
expected: Press V (select), A (arrow), R (rect), E (ellipse), T (text). The active tool in the left sidebar highlights to match each keypress.
result: pass

### 22. Delete Selected Element
expected: Select any element (image or annotation). Press Delete or Backspace. The element is removed from the canvas.
result: pass

### 23. Shortcuts Modal
expected: Click the "?" button in the toolbar. A modal appears showing all keyboard shortcuts grouped by category (Tools, Canvas, Capture).
result: pass

### 24. Export Image
expected: With a styled screenshot on canvas, open the Export panel in the right sidebar. Choose format (PNG/JPEG/WebP), scale, and quality. Click export — native save dialog appears. File saves correctly.
result: pass

### 25. Clipboard Copy
expected: Click the clipboard/copy button in the Export panel. The canvas content is copied to the system clipboard. Paste in another app to verify.
result: pass

### 26. Save and Apply Preset
expected: Style a screenshot (background, padding, shadow, etc.). Save as a preset in the Preset panel. Reset styling, then apply the saved preset — all settings restore.
result: pass

## Summary

total: 26
passed: 13
issues: 11
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Drag an image file onto the canvas and it appears centered"
  status: failed
  reason: "User reported: no nothing happened"
  severity: major
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Image background blurs progressively when Blur slider is increased"
  status: failed
  reason: "User reported: blur doesn't work"
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Padding slider adjusts space between image edges and canvas edges"
  status: failed
  reason: "User reported: Padding doesn't work"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Drop shadow appears under screenshot with adjustable blur and offset"
  status: failed
  reason: "User reported: drop shadow no"
  severity: major
  test: 8
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Inset border appears with auto-matched dominant color"
  status: failed
  reason: "User reported: inset also no"
  severity: major
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Undo/redo via Cmd+Z and Cmd+Shift+Z works, with visual controls"
  status: failed
  reason: "User reported: no, also no visual control for this"
  severity: major
  test: 13
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Arrow annotation created by click-and-drag on canvas"
  status: failed
  reason: "User reported: click and drag no, after clicking several times I see something to rotate it but still can't drag"
  severity: major
  test: 14
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Text annotation can be edited inline after creation"
  status: failed
  reason: "User reported: yes but I can't edit, also same quality issue as other annotations"
  severity: minor
  test: 17
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Transformer resize works on all annotation types including text and emoji"
  status: failed
  reason: "User reported: text goes back to initial size when let go, same for emoji, only one emoji (thumbs up)"
  severity: major
  test: 18
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Blur privacy region blurs the screenshot area under it"
  status: failed
  reason: "User reported: can see shape but doesn't work, can drag but can't resize, doesn't blur anything"
  severity: blocker
  test: 19
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Pixelate privacy region pixelates the screenshot area under it"
  status: failed
  reason: "User reported: same as blur - shape visible but doesn't pixelate anything"
  severity: blocker
  test: 20
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
