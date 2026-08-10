# 84 — S5A Authenticated Preview Session Harness

Status: IMPLEMENTED / AWAITING SESSION
Scope: unblocks gates S5A-12, S5A-13, S5A-14 (previously BLOCKED_BY_AUTH).

## Components

| File | Role |
| --- | --- |
| `scripts/preview-session.mjs` | Resolves an authenticated session from the sandbox-injected `LOVABLE_BROWSER_SUPABASE_*` variables, or mints one via the publishable-key password grant when `AURA_PREVIEW_EMAIL` / `AURA_PREVIEW_PASSWORD` are exported. Installs it into a Playwright context (cookies + pre-navigation `localStorage`). |
| `scripts/s5a-authenticated-gates.mjs` | Boots the preview signed-in, seeds dismissed guided tours, probes all 35 authenticated routes across desktop (1280), tablet (834) and mobile (390), and writes artifacts 84/85. |

## Gate mapping

- **S5A-13** — deep-link and hard-refresh path stability, no redirect to `/`, no blank render.
- **S5A-12** — zero horizontal overflow, zero blank pages, zero console errors per viewport.
- **S5A-14** — `OperatingStateBar` present and the SIMULATED truth label visible on every authenticated route.

## Run

```bash
node scripts/s5a-authenticated-gates.mjs
```

Exit codes: `0` all gates PASS, `1` at least one gate FAIL, `78` BLOCKED_BY_AUTH (no session available).

## Secret hygiene

Tokens, cookies and credentials are consumed in-process and passed to the browser
context in memory only. Evidence artifacts record the session *source* string
(`injected` / `credentials`) and nothing else. Provider errors are reduced to their
status and error code.

## Current state

Pipeline smoke-verified: 105 probes (35 routes x 3 viewports) executed end to end.
`LOVABLE_BROWSER_AUTH_STATUS=signed_out` at time of writing, so the real gate run
returns exit 78. Sign into the preview (or export the two credential variables) and
re-run to produce artifacts 84/85 with authoritative results.