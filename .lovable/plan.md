
# M2M Tech Brand Style Guide Implementation Plan

## Brand Analysis

Based on the uploaded logo, the M2M Tech brand colors are:
- **Primary Brand Color**: Bright Yellow/Gold (`#FFCC00` or similar - the circle background)
- **Text Color**: Black (`#000000` - "M2M TECH" text)
- **Secondary Text**: Lighter gray or muted text ("CODE AI")
- **Accent Icon**: Black lightning bolt

This is a significant shift from the current Cyan/Teal (`#00BCD4`) brand identity currently in the design system.

---

## Current State

The design system currently uses:

| Token | Current Value | Description |
|-------|---------------|-------------|
| `--primary` | `186 100% 42%` (Cyan) | Main brand color |
| `--accent` | `48 96% 53%` (Yellow/Gold) | Already partially set for accent! |
| `--ring` | Cyan | Focus rings |
| `--dc-teal` | Cyan | Data centre accents |
| `--m2m-gradient` | Cyan → Blue | Brand gradient |

The **accent** color (`48 96% 53%`) is already yellow/gold but isn't used as the primary brand color.

---

## Implementation Strategy

### Option A: Yellow as Primary Brand (Full Rebrand)
Make yellow/gold the **primary** brand color across all UI:
- Change `--primary` from cyan to gold (`48 96% 53%`)
- Update all CTA buttons, links, focus rings to gold
- Keep data centre operational colors (green/amber/red status) unchanged
- Risk: Yellow on light backgrounds has contrast issues for text

### Option B: Yellow Accent with Neutral Primary (Recommended)
Keep yellow/gold as the prominent **accent** for CTAs and highlights, but use a neutral/dark primary:
- `--primary`: Dark slate/charcoal (for text/containers)
- `--accent`: Yellow/gold (`#FFCC00`) - for CTAs, highlights, brand moments
- `--secondary`: Cyan/teal - for data centre operational indicators
- Maintains WCAG contrast compliance

### Option C: Dual-Color Brand System
Yellow for external-facing (landing, marketing) and Cyan for internal data centre operations:
- Landing page, auth, CTAs use yellow/gold
- Dashboard, simulation, monitoring keep cyan/teal for operational clarity

---

## Recommended Changes (Option B)

### 1. Update Logo Asset
Replace `src/assets/m2m-logo.png` with the new uploaded logo (`M2M_Logo_v2.png`)

### 2. Update CSS Design Tokens (`src/index.css`)

```css
/* New M2M Brand Palette */
--m2m-gold: 48 100% 50%;           /* #FFCC00 - Primary brand gold */
--m2m-gold-light: 48 100% 60%;     /* Lighter variant */
--m2m-gold-dark: 45 100% 42%;      /* Darker for contrast */
--m2m-black: 0 0% 0%;               /* Black for text on gold */

/* Update accent to match logo */
--accent: 48 100% 50%;              /* M2M Gold */
--accent-foreground: 0 0% 0%;       /* Black text on gold */

/* Primary remains dark for text contrast */
--primary: 222 47% 11%;             /* Dark slate */
--primary-foreground: 0 0% 100%;    /* White on dark */

/* Brand gradient update */
--m2m-gradient: linear-gradient(135deg, hsl(48 100% 50%) 0%, hsl(45 100% 42%) 100%);
```

### 3. Update Tailwind Config (`tailwind.config.ts`)
Add M2M brand color tokens:
```ts
'm2m': {
  'gold': 'hsl(var(--m2m-gold))',
  'gold-light': 'hsl(var(--m2m-gold-light))',
  'black': 'hsl(var(--m2m-black))',
}
```

### 4. Update Component Colors

| Component | Current | New |
|-----------|---------|-----|
| Landing CTA buttons | `bg-accent` | `bg-m2m-gold text-black` |
| Header "Get Started" | Cyan-ish accent | Yellow/gold |
| Auth page glow orbs | Purple/Blue mix | Gold/Yellow/Black |
| Focus rings | Cyan | Gold |
| Brand gradient text | Cyan → Blue | Gold gradient |

### 5. Files to Update

**Core Design System:**
- `src/index.css` - CSS variables
- `tailwind.config.ts` - Color definitions
- `src/assets/m2m-logo.png` - Replace with new logo

**Landing Pages:**
- `src/components/landing/TwinHeader.tsx` - CTA button colors
- `src/components/landing/TwinHero.tsx` - Hero CTA, gradient text
- `src/components/landing/TwinCTASection.tsx` - Bottom CTA section
- `src/components/landing/TwinFooter.tsx` - Footer brand colors

**Auth Pages:**
- `src/pages/Auth.tsx` - Background orbs, particles
- `src/components/auth/BackgroundGrid.tsx` - Particle colors, grid accent
- `src/components/auth/AuthLayout.tsx` - Feature highlight dots

**Main App:**
- `src/components/Layout.tsx` - Logo display

---

## Technical Considerations

### Contrast Compliance
Yellow on white fails WCAG AA. Solutions:
- Use dark text (`text-black`) on yellow backgrounds
- For hover states: darken to `--m2m-gold-dark`
- Avoid yellow text on light backgrounds

### Data Centre Operational Colors
Keep separate from brand colors:
- Status: Green (healthy), Amber (warning), Red (critical)
- Thermal: Blue (cold) → Red (hot)
- These should remain unchanged for operational clarity

### Dark Mode
In dark mode, gold/yellow works well as an accent but may need slight saturation adjustment for visual comfort.

---

## Estimated Scope

| Category | Files | Effort |
|----------|-------|--------|
| Core tokens | 2 | Low |
| Logo replacement | 1 | Low |
| Landing components | 5 | Medium |
| Auth components | 3 | Medium |
| Layout | 1 | Low |
| **Total** | ~12 files | ~30 min |

---

## Summary

The plan involves:
1. Replacing the logo asset with the new yellow M2M logo
2. Updating design tokens to establish gold/yellow as the brand accent
3. Keeping data centre operational colors (green/amber/red/cyan) for system status
4. Updating approximately 12 files to reflect the new brand identity
5. Ensuring WCAG contrast compliance with black text on gold backgrounds
