# Compact marketing UX

## Goal
Reduce page length and scanning effort across the public AURA marketing pages while preserving the current hero formatting, brand system, accessibility, routes, calculations, forms, and truth labels.

## Home page
- Replace the four simultaneous buying-outcome cards with an accessible role selector and one focused outcome panel.
- Keep the selected role's owner, decision points, target metric, and relevant next action visible in one compact section.
- Preserve all four existing outcomes and their factual copy, with keyboard-operable controls and a mobile-friendly horizontal selector.
- Consolidate the separate business-case content into this buyer-guided section where it duplicates finance and procurement messaging.

## Architecture page
- Keep the four-step architecture overview visible as the primary mental model.
- Replace the repeated four-area detail grid with a single-open accordion so visitors reveal only the technical detail they need.
- Keep the truth statement and primary actions permanently visible.

## Blueprint estimator
- Keep the specification fields and four headline results visible at all times.
- Group PUE build-up, annual cost build-up, reference comparison, assumptions, and scenario event details into accessible expandable sections.
- Keep scenario selection and run action visible; collapse the event timeline only after a run exists.
- Preserve every calculation, lead field, submission path, and simulated-output label unchanged.

## Demo request
- Keep the short form as-is because its current one-column flow is already compact and clear.

## Validation
- Verify keyboard interaction, expanded/collapsed states, text wrapping, and no horizontal overflow on phone, tablet, and desktop.
- Run focused tests, typecheck, lint, and production build. Do not publish.

## Technical details
- Reuse the existing accessible accordion and button components.
- Use semantic design tokens and the existing AURA graphite/green visual language.
- Add only presentation state. No API, backend, authentication, routing, schema, or deployment changes.
