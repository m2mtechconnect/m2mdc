# AURA Demo Interactive Connections — Phase D5

## Purpose

Allow a presenter or approved demo user to click **Connect Google** inside the original AURA Connections experience, complete provider authorization, and return to AURA without exposing implementation-platform branding in the AURA UI.

This is a **demo-only** transport accommodation. It is not the production sovereign OAuth architecture.

## D5A supported connector

- AURA capability: Workspace Documents
- Provider authorization: Google Drive
- Scope: `https://www.googleapis.com/auth/drive.readonly`
- Binding class: AURA Managed User Connection
- Browser receives: provider authorization URL and one-time return result only
- Browser never receives: connector gateway credential, connection API key, provider token, refresh token, service-role key

No other provider is enabled by this phase. Slack, Microsoft, Salesforce and other interactive connectors require explicit AURA binding registration, approved scopes and their own qualification before a Connect action is shown.

## Demo-only double gate

The UI control requires:

`VITE_AURA_DEMO_MANAGED_OAUTH=true`

The server independently requires BOTH:

`AURA_RELEASE_ENVIRONMENT=demo`

`AURA_DEMO_MANAGED_OAUTH=true`

A browser build flag cannot enable the server exception. Production or staging cannot satisfy the demo policy merely by rendering a Connect button.

## Authorization boundary

For the demo, AURA may use the existing managed connector authorization transport. The top-level browser destination must be an explicitly allowlisted provider authorization host (`accounts.google.com` for D5A). A direct implementation-gateway browser destination is rejected.

The provider authorization URL can contain implementation callback infrastructure in nested OAuth parameters. A technical user inspecting the full authorization URL may therefore discover the underlying callback. This limitation is accepted for the demo phase only and must not be represented as infrastructure-level white-labeling.

Production strict-white-label validation remains unchanged and rejects authorization URLs containing implementation-platform callback hostnames anywhere in the decoded URL.

## Truth semantics

After successful authorization, AURA may display:

**Connected · read only**

This means only that the user's managed connection was authorized and the opaque connection handle was stored server-side.

It does NOT mean:

- document retrieval has been runtime-verified,
- data is flowing,
- the connector is healthy,
- provider writes are allowed.

Until a live read-only retrieval probe is separately implemented and verified, Workspace Documents content remains clearly labelled **Demo data**.

## Revocation

The demo card exposes Disconnect only after server evidence reports a connected user binding. Revocation must complete at the authorization service before AURA marks the binding revoked. If the upstream revocation fails, AURA reports the failure and does not claim the connection was disconnected.

## Required demo-environment secrets

These are server-side only and must be provisioned through approved secret management, never Git or `VITE_` variables:

- `GOOGLE_DRIVE_APP_USER_CONNECTOR_CLIENT_API_KEY`
- the managed connector transport credential required by the demo authorization service

## Production replacement

Phase 7B replaces the demo transport with M2M/AURA-owned provider OAuth applications and callbacks under an AURA/M2M domain. The D5 exception must remain disabled in that environment.
