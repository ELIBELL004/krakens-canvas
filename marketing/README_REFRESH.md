# Suggested README Refresh

Use this when you are ready for the GitHub repo to read less like internal notes and more like a public project.

```md
# Krakens Canvas

Draw the thought before it becomes a sentence.

Krakens Canvas is a local pressure-sensitive black-grid whiteboard for tablet-first thinking. It supports pressure-sensitive ink, infinite canvas pages, always-on-top pinning, and a Codex sharing bridge so your sketches can become conversational context.

## Highlights

- Pressure-sensitive pen input for stylus/tablet drawing.
- Minimal black canvas with adjustable grey grid.
- Infinite pan and zoom.
- Journal-style page tabs.
- Pen, eraser, smoothing, ink spill, and custom palette slots.
- Focus mode for hiding the toolbar.
- Shape assist for rough lines, boxes, and circles.
- Autosave and PNG export.
- Always-on-top `Pin` mode.
- `Share` and `Auto` modes for Codex sketch inspection.

## Why

Sometimes the fastest way to explain an idea is to draw it. Krakens Canvas is built for that moment: sketch the thought, keep it pinned beside your work, and let Codex inspect the current canvas when words are slower than a diagram.

## Run

```powershell
cd "C:\Users\esafi\OneDrive\Documents\New project 5"
.\Start Inkboard.cmd
```

If dependencies are missing, the launcher runs `npm.cmd install` first.

## Codex Sharing

Click `Share` to write the visible canvas to:

```text
shared/latest-canvas.png
```

Turn on `Auto` to refresh that file after drawing and view changes. Codex can inspect that image when you ask what you drew.

## Status

Prototype. Local-first. Windows-focused.
```
```
