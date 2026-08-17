# RLS policy before / after

Migration identifier: `20260817201022_96b4f2cf-29b6-4b2e-8044-d62b095a59e1`

## asset_canary_events

| | |
| --- | --- |
| Previous | `SELECT TO authenticated USING (true)` |
| New | `asset_canary_events_admin_read`: `SELECT TO authenticated USING (has_role(admin) OR has_role(owner))` |
| Intended audience | Admins and owners only - asset rollout/rollback evidence with actor IDs |
| Runtime verification | admin identity: 200, 1 row. engineer identity: 200, `[]` |
| Cross-tenant result | n/a (platform-level evidence, not tenant data) |
| Anonymous result | no grant, 401 |

## connector_definitions

| | |
| --- | --- |
| Previous | `SELECT TO authenticated USING (true)` |
| New | Added `publication_status` (`PUBLISHED`/`DRAFT`/`INTERNAL`/`BLOCKED`, CHECK-constrained, default `PUBLISHED`). `connector_definitions_published_read`: `USING (publication_status = 'PUBLISHED')`; `connector_definitions_admin_read_all`: admin/owner |
| Determination | The table has no tenant column and every row is a platform-published catalogue definition. It is a platform catalogue, not a tenant-authored one, so the correct control is publication state, not tenant scope. Draft/internal/blocked definitions are restricted to admins. |
| Intended audience | Signed-in users see published catalogue entries; admins/owners see all states |
| Runtime verification | engineer: 200, published rows only. admin: 200, all rows |
| Anonymous result | no anon grant, 401 |

## connection_data_contracts

| | |
| --- | --- |
| Previous | `SELECT TO authenticated USING (true)` |
| New | Added nullable `tenant_id` (NULL = platform template). Three policies: platform templates `USING (tenant_id IS NULL AND validation_status IN ('VALIDATED','RUNTIME_VERIFIED'))`; tenant contracts `USING (tenant_id IS NOT NULL AND tenant_id = current_tenant_id())`; admin/owner read-all |
| Intended audience | Validated platform templates: all signed-in users. Tenant contracts: that tenant only. Draft/unvalidated platform rows: admin/owner only |
| Runtime verification | See `tenant-isolation-results.md` |
| Anonymous result | no anon grant, 401 |

## agent_suggestions_cache

| | |
| --- | --- |
| Previous | `SELECT USING (expires_at > now())` to `public` (anonymous readable raw `query` text) |
| New | Policy dropped; `anon` and `authenticated` grants revoked; `service_role` retained |
| Intended audience | The `agent-suggestions` edge function only, which already uses the service role |
| Runtime verification | anon: 401. engineer: 403. Function path unaffected |

## contact_expert_logs

| | |
| --- | --- |
| Previous | `INSERT TO authenticated WITH CHECK (true)` - client-supplied `user_id` was trusted and could be NULL |
| New | `contact_expert_logs_self_insert`: `WITH CHECK (user_id = auth.uid() AND is_anonymous = false)`. Added `intake_source`, `is_anonymous`, `correlation_id` |
| Intended audience | Signed-in users writing their own record; anonymous requests only through the server intake |
| Runtime verification | authenticated insert with a spoofed `user_id`: 403 RLS violation |

## onboarding_submissions

| | |
| --- | --- |
| Previous | `INSERT TO anon, authenticated` with only an email-shape check; `anon` held the INSERT grant |
| New | Policy dropped, INSERT revoked from `anon` and `authenticated`; `service_role` granted. Added `correlation_id`, `intake_source`. Admin SELECT policy unchanged |
| Intended audience | Server intake only; admins read |
| Runtime verification | anon direct insert: 401. engineer direct insert: 403. Server intake: 200 |

## public_intake_rate_limits (new)

RLS enabled, single `USING (false) WITH CHECK (false)` policy for `authenticated`, no
`anon` grant, `service_role` granted. Only the intake function can read or write it.

## rag_tokens

Covered in `parallel-google-oauth-quarantine.md`.

## Global

`select count(*) from pg_class ... where not relrowsecurity` in `public` -> **0**.
RLS remains enabled on every public table.
