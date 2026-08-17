# Phase 1 - audit baseline

- Canonical host: https://auradc.m2mtechconnect.com (published bundle `assets/index-CCUS0faN.js`, HTTP 200 at audit time)
- Surface actually exercised: local build of the same revision at `http://localhost:8080` (the published host could not be driven with an authenticated session from the harness) - BLOCKED_UNVERIFIED for published-host interaction evidence
- Git revision exposed in bundle: not exposed
- Route declarations parsed from source: 24 public + 78 authenticated = 102 declarations, 24 aliases (`route-inventory.json`)
- Routes actually navigated: 85 concrete desktop URLs (parameterised routes substituted with sample ids), 17-route sample at 1920x1080, 1024x768 and 390x844
- Roles tested: Administrator (injected session, admin console visible) and Anonymous (public routes). Engineer and Pilot roles NOT tested - BLOCKED_UNVERIFIED
- Dataset modes: production default (legacy-synthetic) on all 85 routes; `?dataset=nvidia-dsx-reference` on the 17-route sample
- Browser: headless Chromium (Playwright), software renderer. No GPU claim is made from this run.
- Test date: 2026-08-17 (UTC)
- Evidence: `evidence/sweep.json`, `evidence/summary.json`, `evidence/sweep.log`
- Screenshots: NOT captured (harness screenshot step failed) - `screenshots/` is empty, BLOCKED_UNVERIFIED
