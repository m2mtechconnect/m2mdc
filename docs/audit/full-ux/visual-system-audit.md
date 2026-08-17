# Phase 8 - visual system audit

Measured across 85 routes:

- Typography: sub-11px text present on 81/85 routes (8 shared-chrome elements per page). The project standard is >=12px body and >=11px labels, so this is a standing violation of the design system.
- Colour: 82/85 routes use hardcoded `text-white`/`text-black`/`bg-white`/`bg-black` utilities that bypass the semantic tokens and dark/light theming.
- Target size: 80/85 routes contain controls under 24x24 px.
- Structure: heading levels skip on 76/85 routes; exactly one `main` per page everywhere (good).
- Not measured programmatically: contrast ratios, radius/shadow/spacing consistency, icon source consistency, badge density, skeleton and empty-state consistency - BLOCKED_UNVERIFIED.

Token violation inventory: `token-violations.json`. Nothing was modified.
