# Qualification diagnostic — HEAD a448801c (read-only)

No files were changed, nothing was deployed, published, migrated, or mutated. All findings below come from reading the repository, re-running the verifier locally, and read-only queries against the connected backend.

## 1. Exact failing command and assertions

**Command:** `node scripts/schema-truth/verify-schema-truth.mjs` (invoked by `bun run verify:schema-truth`, which is step 4 of `verify:fast`). Exit code `1`.

**Verdict payload:**

```text
"verdict": "FAIL",
"failures": [
  "generated type checksum drift",
  "generated function count drift",
  "generated function name drift"
]
```

**Files involved:**
- `src/integrations/supabase/types.ts` (generated types, the measured artifact)
- `docs/architecture/schema-truth/exact-head-manifest.json` (frozen baseline)
- `scripts/schema-truth/verify-schema-truth.mjs` (comparator, lines 53, 56, 59)

**Expected vs actual:**

| Check | Baseline (manifest) | Actual at HEAD | Result |
|---|---|---|---|
| `generatedTypesSha256` | `ee3dab1916cc697bd7c60776b2095067be466530d5c2831f80cc58daeccb8b78` | `c35d8dbbb2fec0916f24470691d0fa89d62dbf88587c0e60bb73fc9fa3da0295` | FAIL |
| `functionCount` | 50 | 49 | FAIL |
| `functionNamesSha256` | `ed84c98579e5a803bf42c80c26cc2d4a7a384380ee6167fbe57559ef6296f01e` | mismatch | FAIL |
| `tableCount` / `tableNamesSha256` | 140 / `559fcae…` | 140 / identical | PASS |
| `viewCount` / `viewNamesSha256` | 5 / `d655e183…` | 5 / identical | PASS |
| `migrationCount` / `migrationsSha256` / `migrationContentsSha256` | 87 / `b4e4e066…` / `cb6ec78b…` | identical | PASS |

**Exact delta:** one RPC name. `create_facility_setup` is present in the baseline function list and absent from the current generated types. No other function was added or renamed.

**The single related unit failure:** `tests/unit/schema-truth-layer-contract.test.ts > Schema Truth Layer > matches the exact repository baseline` (line 30) asserts `expect(result.verdict).toBe('PASS')`. It shells out to the same verifier, so it is the same failure surfaced twice, not an independent defect. The other 4 tests in that file pass.

**Second failing file (not schema related):** `tests/unit/test-harness-safety.test.ts` fails at collection with `UnsafeTestBackendError: Test backend configuration rejected: only loopback hosts are permitted`. That is the sandbox `.env` pointing at a remote backend host; the guard is working as designed and it reports "no tests", not a failed assertion.

## 2. Is it pre-existing at base 0ff3f071?

Yes, byte-for-byte identical.

- `src/integrations/supabase/types.ts` at `0ff3f071` hashes to `c35d8dbb…` — the same hash as at `a448801c`.
- The baseline manifest at `0ff3f071` already declared `functionCount: 50` and `ee3dab19…`.
- Therefore the verifier fails identically at the base commit; the Builder change did not introduce or worsen it.
- `git diff 0ff3f071..a448801c` touches only 7 files: `src/lib/builder/buildKind.ts`, `src/lib/builder/templateToBlueprint.ts`, `src/services/builderService.ts`, `src/stores/wizardBuilderStore.ts`, and 3 test files. No generated types, no migrations, no manifest, no Edge Functions.

**Origin:** commit `f39e4e74` ("Work in progress", 2026-09-01 03:57:48 UTC, gpt-engineer-app bot) deleted the 16-line `create_facility_setup` block from `types.ts` and did not update the baseline manifest. That commit predates the Builder work.

## 3. Harmless drift or material mismatch?

It is **two separate facts**, and they point in opposite directions.

**The type drift itself is not harmless-but-cosmetic — the generated types are the accurate side.** Read-only queries against the connected backend `psfvrskpnwcshvajzeix`:

- `create_facility_setup` does **not** exist in `pg_proc` for schema `public` (only `active_org_id` returned from the two-name probe).
- `supabase_migrations.schema_migrations` has 83 recorded migrations, latest `20260826233511`, and **no row for `20260825013000`** — the migration `supabase/migrations/20260825013000_facility_setup_truth_contract.sql` that defines the function was never applied to this backend.

So the regenerated `types.ts` correctly reflects a backend that lacks the function. The stale artifact is `exact-head-manifest.json`.

**The material problem is upstream of the gate:** `src/facilities/api.ts:42` calls `rpc('create_facility_setup', …)`, reached from `src/pages/manage/Facilities.tsx:111`. Against the current backend that RPC call will fail at runtime, because the function does not exist there. The repository also carries 87 migration files while the backend records 83, and reports 144 public tables / 4 public views live versus 140 / 5 in the generated types — the repo and this backend are not at the same schema point.

The Schema Truth gate is doing exactly its job: fail closed on a repo-vs-backend divergence. Its failure message names the symptom (checksum/count/name drift) rather than the cause (an unapplied migration).

## 4. Smallest safe remediation

Two candidate remediations, in increasing scope. **Do not simply refresh the manifest to make the gate green** — that would encode the divergence as truth and weaken the control point.

**Option A (recommended first step, diagnostic-preserving):** treat the unapplied migration as the defect. Apply `20260825013000_facility_setup_truth_contract.sql` to the backend through the approved migration path, regenerate `types.ts`, then regenerate `exact-head-manifest.json` from the post-migration artifact and confirm `functionCount` returns to 50 with `create_facility_setup` present.
- Affected: backend schema, `src/integrations/supabase/types.ts`, `docs/architecture/schema-truth/exact-head-manifest.json`.
- Rollback: the migration's own down path plus `git revert` of the types/manifest commit.
- Requires explicit migration authorization; out of scope for this diagnostic.

**Option B (repo-only, if the facility-setup contract is intentionally retired):** remove or gate the `create_facility_setup` caller in `src/facilities/api.ts` and `src/pages/manage/Facilities.tsx`, retire the migration file, and re-freeze the manifest against the regenerated types with an ADR note recording why the function count dropped 50 → 49.
- Affected: those two source files, `supabase/migrations/20260825013000_facility_setup_truth_contract.sql`, `exact-head-manifest.json`, plus an ADR entry.
- Rollback: single `git revert`; no backend state touched.

**Not recommended:** editing only `exact-head-manifest.json`. It turns the gate green while leaving the live `create_facility_setup` call broken, which is precisely the failure mode the Schema Truth Layer exists to catch.

For `test-harness-safety.test.ts`, the remediation is environmental (run the unit suite with a loopback test backend), not a code change.

## 5. Can the Builder fix be qualified independently?

Yes, without weakening release policy, because the two concerns do not overlap.

- The Builder change is frontend-only and touches no generated type, migration, manifest, Edge Function, route, or policy. The verifier's inputs are byte-identical at `0ff3f071` and `a448801c`.
- Evidence already collected at HEAD: focused tests 40 passed across `builder-build-kind-contract`, `builder-url-type-contract`, `blueprint-converters`, `template-url-loading`; `tests/unit` 1175 passed / 1 failed, the single failure being the schema-truth baseline assertion; typecheck clean; lint clean; architecture governance clean; production build and SEO checks pass.
- The honest position for the release record is that `a448801c` is **not fully qualified** — `verify:fast` is red — but the red is a pre-existing gate failure with an identified cause, carried forward unchanged from the base commit. Qualify the Builder fix on that evidence, and track the Schema Truth failure as its own remediation item rather than bypassing, relaxing, or re-baselining the gate to unblock a merge.

## Technical notes

- Verifier comparator lines: `verify-schema-truth.mjs:53` (checksum), `:56` (function count), `:59` (function names). Baseline path is hard-coded at `:8`.
- The verifier's `deployed` block reports `status: "not-provided"` because no `--deployed=` snapshot was supplied; it never contacts the backend. Repo-vs-backend divergence is therefore invisible to it by design — the backend evidence above came from separate read-only queries.
- Backend facts verified read-only: `public_tables: 144`, `public_views: 4`, `public_functions: 194`, `sovereign_dc_facilities`/`data_centre_locations`/`data_centre_twins` all present, `create_facility_setup` absent, migration `20260825013000` unrecorded.
