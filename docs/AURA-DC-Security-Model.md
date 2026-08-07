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
| B-02 | `has_role(uuid, app_role)` type mismatch | 10 RLS policies never evaluate to true |
| B-03 | Anonymous read of `sites`, `dc_blueprint_templates` | Data exposure via publishable key |
| B-04 | No `tenant_id` on most entities | Cross-tenant access cannot be prevented |
| B-05 | Self-approval permitted | No separation of duties |
| B-06 | Browser-side privileged writes | Client can bypass intended server checks |

## Phase 1 target
- Single `has_permission(user_id, tenant_id, permission)` security-definer function
  with `SET search_path = public`, typed correctly against the role enum.
- `user_roles` remains a separate table (never a column on `profiles`).
- Deny-by-default: no table is reachable without an explicit policy and GRANT.
- `anon` GRANTs only for genuinely public marketing content.

## Phase 0 containment already applied
- `rag-test` no longer returns fabricated answers, citations or token counts.
- `rag-upload` no longer accepts and silently discards uploaded bytes.
