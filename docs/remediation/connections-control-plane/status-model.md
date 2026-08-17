# Status model

Lifecycle: DRAFT, CONFIGURATION_REQUIRED, CREDENTIAL_REQUIRED, READY_TO_TEST, TESTING,
CONNECTED_NO_DATA, HEALTHY, SYNCING, DEGRADED, FAILED, DISABLED, NOT_DEPLOYED, UNSUPPORTED, BLOCKED.

Derivation order (`deriveConnectionStatus` in `src/connections/model.ts`):
1. not enabled -> DISABLED
2. connector not deployed -> NOT_DEPLOYED
3. unsupported implementation -> UNSUPPORTED
4. implemented but no runtime adapter wired -> BLOCKED (reason shown verbatim)
5. missing configuration -> CONFIGURATION_REQUIRED
6. credential required and no reference -> CREDENTIAL_REQUIRED
7. never tested -> READY_TO_TEST
8. last check failed -> FAILED
9. records rejected or mapping failures -> DEGRADED
10. check passed and zero records received -> CONNECTED_NO_DATA
11. check passed with accepted records -> HEALTHY / SYNCING

"Available" and "ready" are not usable statuses. A passed health check never implies telemetry.
