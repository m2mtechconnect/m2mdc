# Test results

New suite: `src/connections/__tests__/model.test.ts` - 9 tests, all passing. Covers definition vs
instance distinction, lifecycle descriptor completeness, NOT_DEPLOYED precedence, BLOCKED for the
unwired MQTT transport, CONNECTED_NO_DATA instead of HEALTHY at zero records, DEGRADED on
rejections, CREDENTIAL_REQUIRED gating, health-check availability limited to server-owned probes,
platform services excluded from operational data-source counts, and the truthful summary baseline.

Updated: `src/config/__tests__/appNavigation.test.ts` - 15 tests passing after the label rename;
legacy alias assertions unchanged. No test was deleted or weakened.

Typecheck: clean.
