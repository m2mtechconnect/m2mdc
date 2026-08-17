# OAuth architecture audit - managed user connections

Retrieved: 2026-08-17 (UTC)

## Scope inspected
- supabase/functions/managed-user-oauth-start/index.ts
- supabase/functions/managed-user-oauth-complete/index.ts
- supabase/functions/managed-user-disconnect/index.ts
- supabase/functions/managed-connector-invoke/index.ts
- supabase/functions/_shared/appUserConnector.ts, appUserConnections.ts, connectionKeyCrypto.ts, managedUserBindings.ts
- public.app_user_connections, public.managed_user_connections
- src/pages/oauth/ManagedUserReturn (route /oauth/managed-user/return)

## Authorization path, as implemented
1. Client calls managed-user-oauth-start with only { connector_definition_id, origin }.
2. The function verifies the JWT server-side, derives app_user_id from the verified user id, resolves the tenant server-side, reads the client API key from the edge environment, and calls the official gateway endpoint POST /api/v1/app-users/oauth2/authorize.
3. Only authorization_url is returned to the browser.
4. Provider consent redirects to /oauth/managed-user/return with a one-time code.
5. The return route forwards only that code to managed-user-oauth-complete.
6. managed-user-oauth-complete calls exchangeAppUserOAuthCode against POST /api/v1/app-users/oauth2/exchange on the official gateway, checks the returned connector id against the binding, and stores the returned handle encrypted.

## Parallel OAuth check - PASS
No code path calls oauth2.googleapis.com, accounts.google.com/o/oauth2/token, or any provider token endpoint. The only outbound authorization hosts are the official managed connector gateway. GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET exist as project secrets for unrelated Google Cloud service usage and are not referenced by any managed-user function (verified by grep across supabase/functions).

Conclusion: the implementation uses the official managed connector mechanism. AURA_MANAGED_CONNECTOR_RUNTIME_REJECTED_PARALLEL_OAUTH_IMPLEMENTATION does not apply.

## Encrypted-handle rule - PASS by code path
app_user_connections.connection_key_ciphertext receives exactly the value returned as api_key by the gateway exchange (an opaque gateway connection handle). It is AES-GCM sealed with APP_USER_CONNECTION_KEY_SECRET before insert. No provider access token, refresh token, authorization code, client secret, platform key or gateway key is written to any table. The one-time code is never persisted.

Runtime confirmation of the stored shape is deferred until a real authorization exists; no ciphertext was decrypted or printed for this audit.

## Storage and exposure posture
- app_user_connections has no anon/authenticated grants; only the service role reads it.
- managed_user_connections exposes non-secret evidence only (status, scopes, timestamps, correlation id) and is readable solely by the owning user.
- managed_connector_invoke resolves gateway host, path and credentials server-side; the caller supplies neither URL nor key.

## Findings
| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | No Google Drive App User Connector client exists in the workspace; GOOGLE_DRIVE_APP_USER_CONNECTOR_CLIENT_API_KEY is absent from the edge environment | Blocker | Open - owner action required |
| 2 | APP_USER_CONNECTION_KEY_SECRET is provisioned only when an App User Connector is linked, so the encryption path is untested at runtime | Blocker (dependent on 1) | Open |
| 3 | Runtime provider proof, isolation, and revocation tests cannot execute without 1 | Blocker | Open |
