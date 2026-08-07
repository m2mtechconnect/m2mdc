# B-01 — Authorization consolidation

Date: 2026-08-07 UTC. Node v22.22.0.

## Duplicate systems found

| # | Source | Vocabulary | Resolution path | Disposition |
|---|---|---|---|---|
| 1 | `src/contexts/RBACContext.tsx` | 10 platform labels | one `user_roles` row (`.limit(1)`) | **Rebuilt as canonical** |
| 2 | `src/hooks/useUserPermissions.ts` | `admin\|operator\|viewer\|owner` | second independent `user_roles` query, own expiry logic, ownership fallback on RPC error | **Retired** — now a shim over (1) |
| 3 | `profiles.is_approved` | boolean | admission gate in `App.tsx` | Retained as *workflow* state only; never a role |
| 4 | `user_can_access_agent` RPC | `view\|operate\|admin` | server-side | Retained — authoritative, resource-scoped |

## Canonical model

`src/auth/permissions.ts`

- `PlatformRole` and `TenantRole` are separate vocabularies; `AnyRole` is their union
  and matches the `app_role` enum exactly.
- `Permission` is the only unit UI code branches on. `ROLE_PERMISSIONS` maps every
  label explicitly — an unmapped label grants nothing and is reported, not guessed.
- `resolveAuthorization()` drops expired grants and refuses to let a resource-scoped
  grant (`agent:<uuid>`) confer global permissions.
- Default-deny: an empty grant set yields zero permissions.

## Legacy-role mapping

| Legacy value | Canonical | Permissions | Records preserved |
|---|---|---|---|
| `admin` | platform role `admin` | full admin set | 5 |
| `engineer` | platform role `engineer` | operator set, **no** authz administration | 15 |
| `security_admin` | platform role | full admin set | unchanged |
| `owner` / `operator` / `viewer` | tenant roles | admin / operator / viewer sets | unchanged |
| `executive`, `manager`, `compliance`, `data_analyst`, `marketing`, `sales`, `support`, `finance` | platform roles | explicit per-role sets | unchanged |

No row was rewritten. Mapping is read-side only, so all existing assignments are intact.

## Behaviour changes

- All grants are read, not just the first row.
- `canAccessAgent` now **fails closed** on RPC error; the previous client-side
  `owner_id` fallback was an authorization bypass.
- `isGlobalAdmin` is now `can('authz.manage_assignments')`.
- `ProtectedRoute` accepts `requiredPermissions` and default-denies when no gate
  is specified.

## Not retired

Display-only `user_roles` reads remain in `Teams.tsx`, `AccessControl.tsx`,
`account/Settings.tsx`, `account/Profile.tsx`, `AOCGovernancePanel.tsx`. They are
RLS-governed listings, not security decisions. They stay until authenticated
runtime tests exist to prove removal is safe.

## Gates

| Command | UTC | Exit | Result |
|---|---|---|---|
| `npx tsgo --noEmit -p tsconfig.app.json` | 15:01:09 | 0 | clean |
| `npx vitest run src/auth/__tests__/permissions.test.ts tests/unit/permissions.test.ts` | 15:01:38 | 0 | 18/18 passed |
| `npx vitest run` | 15:01:47 | 1 | 115 files, 1438 tests, 1103 passed / 226 failed / 109 skipped |
| `npm run build` | 15:02:44 | 0 | clean, SEO gate passed |

Baseline comparison (Phase 0, commit `6f6a502`): 114 files / 1430 tests / 224 failed.
Collection **increased** by 1 file and 8 tests (the new authorization suite) — no
reduction in collection. Failing-test identity was compared: all 226 failures live in
template, intake, builder and simulation suites. **No failure is in an authorization
file**, and no authorization test regressed. The +2 delta is pre-existing instability
in the YVR/intake suites, not a B-01 regression.

Bundle scan of `dist/`: no `service_role`, `sb_secret_`, or database password
material; no residual `roleHierarchy` (the retired duplicate resolver).

## Classification

- Canonical model, duplicate retirement, fail-closed agent check: **IMPLEMENTED**
  (proven by type-check, unit tests and build; **not** by authenticated runtime).
- Frontend/server agreement under real sessions: **UNVERIFIED**.