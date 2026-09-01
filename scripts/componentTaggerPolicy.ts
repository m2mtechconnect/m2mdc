/**
 * Component-tagger activation policy.
 *
 * `lovable-tagger` instruments EVERY JSX element in development by attaching
 * a callback `ref` — including plain function components, which cannot hold
 * refs. React 18 then emits "Function components cannot be given refs" via
 * `console.error`, once per unique JSX call site, flooding any automated run
 * that asserts console cleanliness (proven on head 0371589a: 74,044 entries
 * in one DSX sweep, thousands per deep-linked route, pageerror 0).
 *
 * Policy, in one place so it is unit-testable and cannot drift:
 *   - The tagger runs ONLY in development mode (unchanged behavior).
 *   - Automated runs (Playwright web servers asserting console cleanliness)
 *     opt out explicitly via `AURA_DISABLE_COMPONENT_TAGGER`. Fail-closed:
 *     ANY non-empty value disables the tagger — a typo like "ture" or "yes"
 *     must never silently re-enable instrumentation inside a qualification
 *     gate.
 *   - Normal interactive development (flag unset or empty) keeps the tagger
 *     and its Lovable preview ergonomics.
 *
 * This is an environment-policy correction, NOT console filtering: no
 * warning text is suppressed, no assertion is relaxed. The console-
 * cleanliness assertions in tests/truth-in-ui remain byte-identical.
 */

export const COMPONENT_TAGGER_DISABLE_FLAG = 'AURA_DISABLE_COMPONENT_TAGGER';

export function shouldEnableComponentTagger(
  mode: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (mode !== 'development') return false;
  const raw = env[COMPONENT_TAGGER_DISABLE_FLAG];
  return raw === undefined || raw.trim() === '';
}
