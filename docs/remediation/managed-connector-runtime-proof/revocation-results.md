# Revocation results

Status: BLOCKED_UNVERIFIED - no connection exists to revoke.

Implemented sequence (code-verified, not runtime-verified):
1. Resolve the caller's encrypted handle.
2. Call the gateway DELETE /api/v1/app-users/connection first. A gateway failure returns 502 and the local row is retained, so a local-only delete cannot be mistaken for revocation.
3. Delete the app_user_connections row.
4. Mark managed_user_connections REVOKED with revoked_at, clear granted_scopes.
5. Insert a connection_audit_events row.

Not yet proven at runtime: post-revocation listing fails closed, no cached provider result is presented as current, and the failed invocation is persisted.
