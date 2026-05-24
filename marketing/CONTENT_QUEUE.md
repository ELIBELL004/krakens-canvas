# Content Queue

## Post 1: Origin

I built Krakens Canvas because I wanted a darker, quieter whiteboard that felt right with a drawing tablet.

It is local, pressure-sensitive, and intentionally minimal: black grid, smooth ink, page tabs, infinite canvas, and a pin mode so it can sit above whatever I am working on.

The weird part is the useful part: it can share the current sketch with Codex.

## Post 2: Codex Bridge

Small workflow experiment:

1. Draw an idea in Krakens Canvas.
2. Click `Share`.
3. Ask Codex what I drew.

The app writes the visible board to a local PNG, and Codex can inspect it. This makes rough diagrams and handwritten notes usable as context without turning the whiteboard into a whole cloud product.

## Post 3: Visual Thinking

I keep noticing that some ideas do not want to start as prose.

They want arrows, boxes, weird little stars, half-words, and pressure-sensitive lines.

Krakens Canvas is basically a local place for that: draw first, explain second.

## Post 4: Feature Clip

Demo beats:

- Open Krakens Canvas.
- Draw beside Discord or code.
- Write "Hello!" and draw a star.
- Click Share.
- Ask Codex: "what did I just write/draw?"
- Show Codex answering correctly.

Caption:

Krakens Canvas lets me sketch ideas into my AI workflow. It is not live magic; it is a local PNG bridge. But it feels surprisingly natural.

## Post 5: Builder Notes

Current stack:

- Electron shell
- HTML canvas renderer
- Pointer Events pressure values
- localStorage autosave
- local PNG bridge for Codex inspection

The next serious step is packaging: one installer, clean app icon, no command prompt window.

## Places To Share

- GitHub README once repo is public.
- X/Twitter short demo clip.
- LinkedIn builder post.
- r/SideProject.
- r/ProductivityApps.
- r/ObsidianMD only if framed as visual thinking/context workflow, not as an Obsidian plugin.
- Indie Hackers project log.

## Do Not Oversell

- Do not call it a full design app.
- Do not imply live AI vision streaming.
- Do not claim cross-platform polish yet.
- Say Windows/local prototype until packaging is improved.
