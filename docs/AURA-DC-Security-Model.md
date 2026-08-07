# AURA DC — Security Model

Status: PLANNED, with Phase 0 containment applied.

## Principles
1. Identity is established server-side. The browser never asserts a role.
2. Authorization is permission-based, evaluated in one place.
3. Every tenant-owned table has RLS derived from the caller's tenant memberships.
4. Privileged mutations happen in server code only.
5. Consequential actions require approval by a different identity.
6. All security-relevant events are recorded in an append-only audit log.

## Open release blockers
| ID | Issue | Impact |
|---|---|---|
| B-01 | Two conflicting role systems | Authorization outcome depends on which hook a component uses |
| B-04 | No `tenant_id` on most entities | Cross-tenant access cannot be prevented |
| B-05 | Self-approval permitted | No separation of duties |

## Closed in Phase 1 (evidence: `docs/evidence/phase-1/`)
| ID | Issue | Resolution |
|---|---|---|
| B-02 | `has_role(uuid, app_role)` type mismatch | `user_roles.role` converted to `app_role`; 15 policies rebuilt; helper EXECUTE revoked from `PUBLIC`/`anon` |
| B-03 | Anonymous read of `sites`, `dc_blueprint_templates`, `agent_definitions` | `anon` default-deny across `public`; only lead-capture INSERT retained; verified 401/42501 |
| B-06 | Browser-side privileged role writes | `user_roles` is read-own; all mutations via audited SECURITY DEFINER RPCs |

## Phase 1 target
- Single `has_permission(user_id, tenant_id, permission)` security-definer function
  with `SET search_path = public`, typed correctly against the role enum.
- `user_roles` remains a separate table (never a column on `profiles`).
- Deny-by-default: no table is reachable without an explicit policy and GRANT.
- `anon` GRANTs only for genuinely public marketing content.

## Phase 0 containment already applied
- `rag-test` no longer returns fabricated answers, citations or token counts.
- `rag-upload` no longer accepts and silently discards uploaded bytes.

## Phase 1 containment already applied
- One canonical role type: `public.app_role`, enforced by the column type.
- Every authorization helper is `SECURITY DEFINER` with `SET search_path = pg_catalog, public`,
  honours `expires_at`, and is not executable by `anon` or `PUBLIC`.
- Role changes are auditable by construction: no write path exists outside the
  admin RPCs, each of which appends to `role_change_audit`.
- Self-escalation and self-lockout are refused inside the RPCs, not in the UI.
