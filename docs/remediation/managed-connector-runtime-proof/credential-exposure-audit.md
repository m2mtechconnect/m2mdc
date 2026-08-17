# Credential exposure audit

Method: static inspection of client bundle sources, edge functions, table grants and RLS. No live session existed, so browser storage and network capture were not exercised.

| Surface | Protected values found | Notes |
|---|---|---|
| Client JavaScript / src | None | No provider host, token, client secret or gateway key is referenced in src/ |
| Browser storage | Not exercised | No authorization has been completed |
| Network responses to the browser | None by design | Start returns only authorization_url; complete returns { ok, status, correlation_id } |
| Console logs | None | Managed-user functions log no credential material |
| Client-readable tables | None | app_user_connections has no anon/authenticated grants; managed_user_connections exposes non-secret fields only |
| Audit event payloads | None | evidence carries connector id and scopes only |
| Error messages | None | Errors are error_code + safe_message + correlation_id |
| Evidence files | None | This directory contains no ciphertext, handle or key |

Residual risk: the exchange response handling is untested at runtime, so the no-exposure claim for the live path is provisional.
