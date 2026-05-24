# Krakens Canvas Launch Kit

## Positioning

Krakens Canvas is a local black-grid whiteboard for people who think better with a pen.

It is built around pressure-sensitive stylus input, a minimalist dark canvas, always-on-top pinning, and a Codex sharing bridge that lets sketches become conversational context.

## One-Liner

A local pressure-sensitive black-grid canvas for sketching ideas directly into your AI workflow.

## Short Description

Krakens Canvas is a minimalist local whiteboard for stylus-first thinking: dark grid, pressure-sensitive ink, infinite canvas, journal pages, always-on-top mode, and a one-click way to share your current sketch with Codex.

## Longer Description

Krakens Canvas started as a personal thinking surface: a black-grid board that feels good with a drawing tablet. It supports pressure-sensitive ink, adjustable smoothing and spill, infinite pan and zoom, page tabs, autosave, focus mode, and shape assist.

The niche twist is the Codex bridge. Click `Share` or turn on `Auto`, and Krakens Canvas writes the visible board to `shared/latest-canvas.png`, so Codex can inspect what you drew and respond to diagrams, handwritten notes, or rough visual ideas.

It is local-first, lightweight, and intentionally not a giant design suite.

## Audience

- Tablet users who think visually.
- Developers who diagram while coding.
- Students who explain ideas faster with sketches than paragraphs.
- AI power users who want visual context without leaving their workflow.
- People who like dark, quiet tools that stay out of the way.

## Core Differentiators

- Built for pressure-sensitive pen input.
- Minimal black-grid aesthetic instead of a bright whiteboard.
- Always-on-top pinning for side-by-side thinking.
- One-click sketch sharing with Codex.
- Local-first Electron app.
- Small, personal, and hackable.

## Feature Bullets

- Pressure-sensitive ink for drawing tablet input.
- Black canvas with adjustable grey grid.
- Infinite pan and zoom.
- Journal-style page tabs.
- Pen, eraser, smoothing, ink spill, and custom palette slots.
- Focus mode hides the toolbar until needed.
- Shape assist for rough lines, boxes, and circles.
- Autosave.
- PNG export.
- Always-on-top `Pin` mode.
- `Share` and `Auto` modes for Codex sketch inspection.

## Tagline Options

- Draw the thought before it becomes a sentence.
- A black-grid canvas for tablet-first thinking.
- Sketch ideas into your AI workflow.
- Local ink for visual thinkers.
- A quiet canvas for loud ideas.

## GitHub Repository Description

Local pressure-sensitive black-grid whiteboard with pressure-sensitive ink, always-on-top pinning, and Codex sketch sharing.

## GitHub Topics

```text
electron
whiteboard
stylus
canvas
drawing
stylus
pressure-sensitive
productivity
ai-workflow
local-first
```

## Social Posts

### Short

Built a tiny local app called Krakens Canvas.

Black-grid whiteboard, pressure-sensitive ink, infinite canvas, always-on-top mode, and a button that lets Codex inspect what I just drew.

It is weirdly exactly how I wanted to think.

### Demo-Focused

Krakens Canvas is my local sketch surface for AI-assisted thinking:

- pressure-sensitive pressure-sensitive ink
- black-grid infinite canvas
- always-on-top pinning
- autosave + pages
- share current sketch with Codex

The goal: explain ideas by drawing them, then have the AI actually see the sketch.

### Builder Post

Made a personal whiteboard app because I wanted something darker, quieter, and more drawing-tablet-native than a normal web whiteboard.

The fun part: it saves the visible canvas as `latest-canvas.png`, so Codex can look at my diagrams or handwriting when I ask what I drew.

### Casual

I may have accidentally built my favorite little thinking tool.

It is called Krakens Canvas. It is basically a black-grid drawing tablet whiteboard that can pin above Discord/code/etc and let Codex read my sketches.

## Product Hunt / Indie Hackers Blurb

Krakens Canvas is a local-first sketching app for visual thinkers. It gives you a pressure-sensitive black-grid canvas, infinite pan and zoom, page tabs, always-on-top pinning, and a one-click bridge for sharing your current sketch with Codex. It is intentionally small: a quiet place to draw ideas, diagrams, notes, and rough shapes without opening a full design suite.

## README Hero Copy

```md
# Krakens Canvas

Draw the thought before it becomes a sentence.

Krakens Canvas is a local pressure-sensitive black-grid whiteboard for tablet-first thinking. It supports pressure-sensitive ink, infinite canvas pages, always-on-top pinning, and a Codex sharing bridge so your sketches can become conversational context.
```

## First Launch Checklist

- [ ] Decide whether the GitHub repo should become public.
- [ ] Add a screenshot or short GIF to the README.
- [ ] Add GitHub repo description and topics.
- [ ] Create a first release tag.
- [ ] Package a Windows build with `electron-builder` or keep the shortcut/npm launch for now.
- [ ] Post one demo clip showing: write on canvas -> click Share -> ask Codex what was drawn.
- [ ] Mention that the project is experimental/local-first.

## Demo Script

1. Open Krakens Canvas.
2. Click `Pin` so it stays above another app.
3. Write: "network flow?" and draw a tiny diagram.
4. Toggle `Auto` or click `Share`.
5. Ask Codex: "what did I just draw?"
6. Show Codex reading the sketch from `shared/latest-canvas.png`.

## Caveats To Be Honest About

- Current build is Windows-focused.
- Native app uses Electron.
- Stylus pressure depends on the OS/browser stack; Windows Ink may matter.
- The Codex bridge works by writing a local PNG, not live streaming.
- The app is a prototype, not a polished commercial release yet.
