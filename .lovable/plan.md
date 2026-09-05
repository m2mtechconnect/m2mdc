# Responsive marketing site and image interactions

## Scope
- Audit the public AURA pages at phone, tablet, laptop, and wide-desktop widths.
- Correct overflow, cramped navigation, fixed-width content, uneven spacing, and controls that do not fit their containers.
- Preserve the hero headline, line structure, wording, type treatment, and visual hierarchy exactly as they are now.
- Keep the existing semantic colour roles, accessibility contrast, routes, forms, and application behaviour unchanged.

## Images
- Keep the hero video behaviour unchanged because it is already deferred and motion-aware.
- Lazy-load every below-the-fold marketing image with asynchronous decoding and stable dimensions.
- Keep only genuinely first-view imagery eager if any is introduced or identified.
- Add a shared image presentation treatment: subtle scale, contrast, border and green-highlight response on pointer hover and keyboard focus.
- Disable motion-heavy effects when reduced motion is requested and avoid hiding content on touch devices.

## Responsive implementation
- Use existing breakpoints and semantic design tokens.
- Make image frames, architecture blocks, forms, tables, buttons, footer groups, and page headers reflow without horizontal overflow.
- Keep long labels and translated Quebec French copy readable through wrapping and flexible minimum widths.

## Validation
- Check `/`, `/architecture`, `/blueprint-estimator`, and `/request-demo` at representative mobile, tablet, and desktop sizes.
- Verify no horizontal overflow, clipped text, overlapping content, or inaccessible focus states.
- Run focused tests, type checks, lint, and the production build. Do not publish.
