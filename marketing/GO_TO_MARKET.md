# Krakens Canvas Go-To-Market

## Product Promise

Krakens Canvas is free local software for sketching ideas fast. Download it and get to work.

## Monetization

Primary monetization is optional donation support.

- No paid feature gates.
- No account wall.
- No trial clock.
- No cloud subscription.
- Stripe donations can be added via a Payment Link.

## Stripe Donation Setup

Current test-mode Payment Link:

```text
https://buy.stripe.com/test_8x2dR89vGaDf6nngcLcwg00
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

Before public launch:

1. Finish Stripe account activation if needed.
2. Create or provide live-mode API keys.
3. Create the same Payment Link in live mode.
4. Replace the test Payment Link in `site/index.html`.
5. Remove the "test mode" note from the donation card.

The final production link should look like:

```html
<a id="donateButton" class="button primary" href="STRIPE_PAYMENT_LINK">Donate with Stripe</a>
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
3. Create a Stripe donation link.
4. Replace donation placeholder.
5. Package a Windows release or document the current launcher clearly.
6. Flip GitHub repo public.
7. Post a demo showing drawing -> Share/Auto -> Codex interpretation.

## Message

Not "another whiteboard."

Krakens Canvas is a local drawing surface for people who think visually and want those sketches to become usable AI context.
