# AURA marketing brand style guide - NVIDIA-aligned

Scope: the public AURA DC marketing landing page (`.aura-marketing`).
The authenticated workspace keeps the Salesforce x NVIDIA hybrid system
(`.aura-v2`) described in the repository visual direction. Nothing in this
guide changes routing, auth, data or runtime behaviour.

## 1. Brand hierarchy

- Product brand: **AURA**. The AURA node mark is the only product logo.
- Parent brand: **M2M**. Plain legal / operator attribution only. Never
  rendered as the product logo.
- No vendor logo, wordmark or product name is used as an AURA endorsement.
  NVIDIA-style refers to a visual language, not to an integration claim.

## 2. Colour

| Role | Token | Value | Use |
|---|---|---|---|
| Technical accent | `--aura-green` | `hsl(82 100% 36%)` (#76B900 family) | Primary CTA fill, active technical state, accent hairlines |
| Accent on graphite | `--aura-green-bright` | `hsl(82 78% 58%)` | Green text and eyebrows on dark bands |
| Accent deep | `--aura-green-deep` | `hsl(82 100% 21%)` | Green text on light surfaces, focus ring, white-text buttons |
| Graphite | `--aura-graphite` | `hsl(220 7% 12%)` (#1E1E1E) | Technical bands, header, visualisation frames |
| Graphite deep | `--aura-graphite-deep` | `hsl(220 9% 4%)` | Closing CTA band |
| Graphite line | `--aura-graphite-line` | `hsl(220 7% 26%)` | Hairline rules on dark |
| Canvas | `--background` | light cool neutral | Editorial sections between dark bands |

Remapped shadcn tokens on this surface: `--accent`, `--primary`,
`--success`, `--ring` all resolve to the green ramp;
`--accent-foreground` is near-black (#0A0A0A) for text on green fills.

**Retired:** M2M gold (#FFCC00) is no longer a marketing accent. The
`--m2m-gold*` aliases are remapped to the green ramp inside
`.aura-marketing` so no legacy class reintroduces gold.

### Colour semantics

- Green: active technical emphasis, capability markers, primary action.
  Green never implies LIVE, measured or verified state.
- Blue: informational links and secondary telemetry.
- Amber: watch / estimated / simulated labelling.
- Red: genuine failure only.

## 3. Typography

- Display and headings: the existing `font-display` family, uppercase for
  section eyebrows and section titles, tight leading, generous tracking
  (`0.16em`-`0.28em`) on small uppercase labels.
- Body: Inter, 14-16px minimum. Secondary text 12-14px minimum.
- Monospace: reserved for indices, stat values, IDs and timestamps.
- No em dashes. Use hyphens.

## 4. Surfaces and layout

- Alternate light editorial sections with graphite technical bands.
  Dark is for hero, pillars, walkthrough, stats and closing CTA.
- Square corners (`rounded-none`) on buttons, frames and cards.
  Hairline 1px borders instead of shadow-heavy cards.
- Left-aligned editorial headers with a numbered monospaced index.
- Screenshots sit in hairline graphite frames at their native aspect
  ratio; no crops that alter what the platform actually shows.

## 5. Contrast and accessibility

- On graphite: primary text #F5F7FA, secondary #C9CDD3, tertiary no darker
  than #AEB4BC. Body copy >= 4.5:1, large text and icons >= 3:1.
- Green text on graphite uses `--aura-green-bright`; green text on light
  uses `--aura-green-deep`.
- Focus ring is the green ramp and must stay visible on every surface.
- Never place medium grey body text on a dark surface.

## 6. Truth in copy

- Factual platform capability statements only. No fabricated metrics,
  customers, press or outcomes.
- Simulated output is labelled as simulated. Configured is not connected,
  connected is not healthy, simulated is not measured.

## 7. Implementation

- Tokens: the `.aura-marketing` block at the end of `src/index.css`.
- Applied by the landing page root in `src/pages/DataCentreTwinLanding.tsx`.
- Components consume semantic classes (`bg-accent`, `text-success`,
  `text-accent-foreground`). Do not hardcode hex colour utilities in
  marketing components except for the fixed graphite surface values
  already defined in this guide.
