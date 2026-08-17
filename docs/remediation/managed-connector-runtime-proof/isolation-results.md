# Authorization and isolation results

No live managed user connection exists, so every runtime case is BLOCKED_UNVERIFIED. Static posture is recorded separately and is not counted as passing.

| Case | Runtime result | Static posture |
|---|---|---|
| User A can read User A's connected Drive | BLOCKED_UNVERIFIED | Handle lookup is keyed by verified user id |
| User B cannot see User A's binding | BLOCKED_UNVERIFIED | RLS: managed_user_connections select limited to user_id = auth.uid() |
| User B cannot invoke User A's connector | BLOCKED_UNVERIFIED | Invocation resolves the handle from the verified caller only |
| Tenant B cannot see or invoke Tenant A's connection | BLOCKED_UNVERIFIED | RLS uses public.current_tenant_id(); invoke resolves tenant server-side |
| Client-supplied tenant/user/connection ids cannot override identity | BLOCKED_UNVERIFIED | Request body carries no identity fields that are trusted |
| Administrator cannot silently impersonate User A | BLOCKED_UNVERIFIED | No admin override path exists in the managed-user functions |
| Shared bindings cannot substitute for user bindings | BLOCKED_UNVERIFIED | binding_class is checked; not_managed_shared / binding_not_linked deny codes |
| Write operations denied | BLOCKED_UNVERIFIED | approval_required / operation_not_allowlisted enforced pre-dispatch |
| Unauthorized operations audited | BLOCKED_UNVERIFIED | Every attempt writes managed_connector_invocations |
| Rate ceilings enforced | BLOCKED_UNVERIFIED | rate_limited deny code with HTTP 429 |
| Every attempt has a correlation id | BLOCKED_UNVERIFIED | correlation_id generated per request in all four functions |
