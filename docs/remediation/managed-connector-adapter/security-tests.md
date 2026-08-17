# Security test results

Authorization gate: `supabase/functions/_shared/managedConnectorAuthz.ts`, mirrored for UI
explanation in `src/connections/managedConnectors.ts`. Suite:
`src/connections/__tests__/managedConnectors.test.ts` (16 cases, all passing).

| Requirement | Test | Result |
| --- | --- | --- |
| Linked connector does not imply user access | not_managed_shared / binding_not_linked | PASS |
| Unauthorized user cannot invoke | role_not_permitted | PASS |
| Authorized user can perform an allowed read | authorized | PASS |
| Write requires approval | approval_required | PASS |
| Expired approval rejected | approval_expired | PASS |
| Approved, unexpired write allowed | authorized | PASS |
| Cross-tenant access rejected | tenant_scope_violation | PASS |
| Facility scope enforced | facility_scope_violation | PASS |
| Revocation fails closed | connection_revoked | PASS |
| Rate ceiling enforced | rate_limited | PASS |
| Unsupported / unlinked connector not selectable | isRuntimeSelectable | PASS |
| Build-chat connector never runtime-connected | isRuntimeSelectable BUILD_CHAT_ONLY | PASS |
| No prohibited provider name in customer-facing labels | terminology assertion | PASS |
| External authorization disclosure is honest | notice assertion | PASS |

Static gates verified by inspection:

- No provider token, gateway key or connector secret exists in browser storage or in the
  client bundle. `LOVABLE_API_KEY` and the connection key are read only through `Deno.env`
  inside `managed-connector-invoke`.
- No token readback endpoint exists. `managed-connector-capabilities` returns eligibility
  evidence only, never `gateway_connector_key`.
- The caller never supplies a URL, host or port; the gateway base and connector key are
  server-owned.
- Every invocation attempt (allowed, denied, blocked, failed) writes a
  `managed_connector_invocations` row with decision, reason code, latency and correlation
  ID. No credential is logged.
- Upstream failures return the provider status and a truncated body, not a secret.

Not tested at runtime in this phase: two users connecting separate personal accounts, and
one user being unable to read another's provider data. No per-user connector client is
configured for this project, so the flow cannot be exercised. Recorded as NOT TESTED, not
as passing.
