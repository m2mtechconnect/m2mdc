# Official documentation comparison

Retrieval date: 2026-08-17 (UTC). Sources: the platform integration documentation set supplied with this workspace (integrations introduction, app user connectors, security, admin controls) and the App User Connector helper specification delivered to this project.

| Documented behavior | AURA implementation | Verdict |
|---|---|---|
| Per-user provider data requires an App User Connector, not workspace App connector credentials | managed-user-* functions use the app-user flow exclusively | Match |
| Start consent server-side via POST /api/v1/app-users/oauth2/authorize with credentials_configuration.scopes | Implemented exactly; scopes nested inside credentials_configuration | Match |
| app_user_id must be the auth provider's opaque user id, never client-supplied | Derived from the verified JWT (user.id) | Match |
| Redirect returns a one-time code; exchange it server-side via /api/v1/app-users/oauth2/exchange | Implemented in managed-user-oauth-complete | Match |
| Connection key (lovack_*) must be stored encrypted, keyed by user and connector | AES-GCM via APP_USER_CONNECTION_KEY_SECRET into app_user_connections | Match (code path; not yet exercised) |
| Provider calls must run server-side with callAsAppUser; never from the browser | managed-connector-invoke is the only provider path | Match |
| Disconnect must call the gateway before deleting the stored row | disconnectAppUser is called first and a gateway failure returns 502 without deleting | Match |
| A credential is bound to one connector; reuse across connectors is rejected | Exchange result is compared with the binding gateway key | Match |
| The workspace client must register the gateway callback https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback | Not verifiable - no client exists yet | Not verifiable |
| Client with allow_offline_access disabled issues no connection key | Return route handles a missing code, but the offline_access_allowed=false branch is not distinguished | Mismatch - minor, remediate after linkage |
| Client API key env var <CONNECTOR_ID>_APP_USER_CONNECTOR_CLIENT_API_KEY is synced by linking the client | Env var name matches; value absent | Not verifiable until linked |
