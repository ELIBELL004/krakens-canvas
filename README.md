# Krakens Canvas

A small local whiteboard prototype for pressure-sensitive tablet drawing.

## What it does

- Black drawing surface with adjustable grey grid lines.
- Wacom/stylus pressure controls stroke width, opacity, and ink spill.
- Mouse fallback uses a fixed active pressure, so the prototype still works without a tablet.
- Pen and eraser tools.
- Infinite pan/zoom canvas.
- Journal-style page tabs.
- Undo, redo, clear, and PNG export.
- Adjustable stroke smoothing.
- Customizable quick color palette.
- Autosaves locally in the app/browser.
- Focus mode that hides controls until the top edge is used.
- Shape assist: hold `Shift` while finishing a rough line, circle, or box.
- Live pressure meter so tablet/browser pressure support is easy to verify.

## Run it as a local app

Double-click `Start Inkboard.cmd`. It opens the board as a native local app window.

## Keep It On Top

Click `Pin` inside Krakens Canvas to keep the window above other apps. Click it again to unpin. You can also run `Toggle Always On Top.cmd` from the project folder.

## Share Sketches With Codex

Click `Share` to save the visible canvas to `shared/latest-canvas.png`. Turn on `Auto` to refresh that file after drawing. After sharing, ask Codex to look at the latest canvas.

## App icon

Krakens Canvas uses `assets/icon.png` for its favicon/app icon. Save the mascot image there, then reopen the local app window.

## Run it in a browser

Open `index.html` in a browser, or serve the folder with any static web server if you want a normal browser tab.

For Wacom tablets on Windows, keep Windows Ink enabled if browser pressure is not showing up. The app uses the browser Pointer Events pressure value.

## Notes from quick research

- MDN documents `PointerEvent.pressure` as a normalized value from `0` to `1`.
- 7P Drawing Tablets lists several HTML canvas stylus resources, including `pressure-sensitive-canvas`.
- ComfyUI-Olm-Sketch is a nearby project with stylus support and notes that Chrome pressure may fail when Windows Ink is disabled.
