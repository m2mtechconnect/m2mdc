# Phase 1B.0 — Baseline Anchor

Status: **RECORDED**. No source code was modified in Phase 1B.0.

This document is the immutable reference the Phase 1B slices must diff against.
Any later claim of "no regression" is only defensible if it re-runs the exact
commands below against this anchor.

## 1. Repository anchor

| Field | Value |
|---|---|
| HEAD commit SHA | `7dd20d2044d6fd902b8b946f71e7f11f07c12cc2` |
| Working tree | clean (`git status --porcelain` → 0 lines) |
| Tracked source files (`src/**/*.{ts,tsx}`) | 962 |
| Source-tree fingerprint (SHA-256 of sorted per-file SHA-256) | `9cf1b2b7f8d3b6163997acddaecb6a5c4cf863c58ee82ae883695355365c99ef` |
| `docs/remediation/**` fingerprint (same method) | `7715037345fadfea26d485a4c4db6c06cd09c1902d775e2bc672798005de01c0` |
| `package.json` SHA-256 | `f2339eafb2ca8eb96c11ed8f0f377861f482ae693d9e63955a1370d9991df447` |
| `package-lock.json` SHA-256 | `719b3f71e68414b8dde00e24fa87a1b93842a5decac7b16e672a92d9eec330cd` |

Reproduce:

```bash
git rev-parse HEAD
git status --porcelain | wc -l
find src -type f \( -name '*.ts' -o -name '*.tsx' \) | sort | xargs sha256sum | sha256sum
find docs/remediation -type f | sort | xargs sha256sum | sha256sum
sha256sum package.json package-lock.json
```

## 2. Toolchain

| Tool | Version |
|---|---|
| Node.js | v22.22.0 |
| npm | 10.9.4 |
| TypeScript | 5.8.3 |
| Vitest | 4.0.6 |
| ESLint | 9.32.0 |
| Playwright | 1.56.1 |

Vitest 4.x rejects `--minWorkers` / `--maxWorkers` / `--poolOptions.*` on the
CLI; determinism knobs must be set in `vitest.config.ts` or via the supported
flags `--pool=forks --no-file-parallelism`. Phase 1A.3.g.1's flag string is
**not portable** to Vitest 4 and must be re-recorded in the plan.

## 3. Authoritative quality-gate commands

These are the ONLY commands whose results are considered baseline in Phase 1B.

```bash
# Typecheck (authoritative — see ADR-0002)
npx tsc -p tsconfig.app.json --noEmit

# Production build (also runs SEO gate)
npm run build

# Vitest full suite, deterministic
npx vitest run --pool=forks --no-file-parallelism --reporter=json --outputFile=vitest.json

# ESLint
npx eslint . --format json -o eslint.json

# Playwright truth-in-UI suite (requires Nix chromium libs — see phase-1a3-report §9)
npx playwright test --config=playwright.truth.config.ts

# Evidence integrity
cd docs/remediation/evidence/phase-1a3 && sha256sum -c SHA256SUMS.txt
```

## 4. Anchored gate results

| Gate | Result | Notes |
|---|---|---|
| `tsc -p tsconfig.app.json --noEmit` | **PASS** (0 errors) | authoritative type gate |
| `npm run build` | **PASS** | verified in Phase 1A.3.g.1 |
| Vitest full suite | 907 passed / 236 failed / 103 skipped across 197 suites | deterministic across two runs (Phase 1A.3.g.1) |
| ESLint | **1467 problems** — 1331 errors + 136 warnings across 421 files, 17 rules | net −4 vs Phase 0 (Phase 1A.3.g.1) |
| Playwright truth-in-UI | 47/47 PASS | recorded Phase 1A.3.g.1 under Nix-provided Chromium |
| Evidence checksums | 27/27 OK | `docs/remediation/evidence/phase-1a3/SHA256SUMS.txt` |

## 5. Machine-readable manifests

Sanitized (no payloads, tokens, endpoints, UUIDs, or user data):

- `docs/remediation/evidence/phase-1b/vitest-failures.txt` — 236 failing tests
  grouped by file, with full test titles.
- `docs/remediation/evidence/phase-1b/eslint-summary.txt` — violation counts by
  rule and severity, plus top-100 files.
- `docs/remediation/evidence/phase-1b/playwright-tests.tsv` — 39 truth-in-UI
  `test(...)` declarations by file:line. Runtime count of 47 in Phase 1A.3.g.1
  reflects `test.describe.parallel` expansion; identity-level runtime dump is a
  Phase 1B.1 deliverable.
- `docs/remediation/evidence/phase-1b/screenshot-checksums.txt` — copy of the
  Phase 1A.3.f `SHA256SUMS.txt` (27 files, 27 checksums verified).

## 6. Known non-provable claims

Phase 0 was recorded without a commit SHA in `baseline.md`. Consequently, an
identity-level diff of today's 236 failing tests against the original Phase 0
failure set **cannot be produced**. Phase 1B.0 anchors the current tree so
that all future phases can identity-diff against `7dd20d2…`. Re-establishing a
Phase 0 anchor is out of scope for Phase 1B and remains an accepted gap.