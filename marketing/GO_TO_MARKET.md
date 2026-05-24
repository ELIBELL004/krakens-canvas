# Krakens Canvas Go-To-Market

## Product Promise

Krakens Canvas is free local software for sketching ideas fast. Download it and get to work.

## Monetization

Primary monetization is optional donation support.

- No paid feature gates.
- No account wall.
- No trial clock.
- No cloud subscription.
- Stripe donations run through a live Stripe Payment Link.

## Stripe Donation Setup

Current live Payment Link:

```text
https://buy.stripe.com/9B6fZgcAodvb0wT5n4ak000
```

Created Stripe objects:

- Product: `prod_UZaImzanrSaPBR`
- Price: `price_1TaR82CK3aVoQtiI4Kjh454i`
- Payment Link: `plink_1TaR82CK3aVoQtiIfDns3uru`

Configuration:

- Pay what you want
- Currency: USD
- Suggested amount: $5
- Minimum: $1
- Maximum: $100
- Hosted Stripe confirmation message after payment

The production link is:

```html
<a id="donateButton" class="button primary" href="https://buy.stripe.com/9B6fZgcAodvb0wT5n4ak000">Donate with Stripe</a>
```

## Website Direction

The site should feel like the app:

- black background
- grey graph/grid lines
- precise spacing
- restrained amber/rose/green accents from ink colors
- minimal text
- product preview first
- subtle liquid/shader motion, never noisy

## Reference Notes

- Liquid Logo: useful inspiration for client-side animated identity and donation-supported free tooling.
- ShaderGradient: useful mood reference for subtle animated depth.
- liquidGL: useful future reference for a refractive glass treatment, but do not add it until the site needs that extra weight.
- UI/taste skill repos: use as taste references, not dependencies.

## Launch Sequence

1. Keep GitHub private while shaping the first public story.
2. Add one real screenshot or GIF to `site/` and README.
3. Package a Windows release or document the current launcher clearly.
4. Flip GitHub repo public.
5. Post a demo showing drawing -> Share/Auto -> Codex interpretation.

## Message

Not "another whiteboard."

Krakens Canvas is a local drawing surface for people who think visually and want those sketches to become usable AI context.
