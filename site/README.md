# Krakens Canvas Site

First-pass landing page for Krakens Canvas.

Run from the project root:

```powershell
npm.cmd run site
```

Then open:

```text
http://127.0.0.1:4174/site/
```

## Stripe Donations

The donate button currently points to a Stripe test-mode Payment Link.

Before public launch, replace it with a live-mode Payment Link and remove the test-mode note in `site/index.html`.

## Download Button

The download button points to the GitHub `v0.2.0` release ZIP. The repository must be public, or the visitor must have repository access, for the download to work.
