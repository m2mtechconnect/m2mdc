# ADR-0003: Omniverse Kit endpoint hardening and explicit connection state

Status: Accepted (Phase 1A).

## Context

Phase 0 identified a hard-coded IPv4 fallback for the Kit REST base URL in three source files (`vite.config.ts`, `src/integrations/omniverseKit/client.ts`, `src/components/twin-visualization/OmniverseStreamViewer.tsx`). The fallback took effect whenever `VITE_OMNIVERSE_KIT_URL` was unset, causing the app to attempt (and label) a "connected" state against an endpoint the M2M product does not control.

## Decision

All Kit configuration is read from validated environment variables through a single module: `src/integrations/omniverseKit/config.ts`. The consumed envs are:

| Env | Purpose | Behaviour when unset |
|---|---|---|
| `VITE_OMNIVERSE_KIT_URL` | Kit REST base URL | Disable Kit (config `enabled: false`, `reason` populated). |
| `VITE_OMNIVERSE_STREAM_ENABLED` | WebRTC stream feature flag | Default off; stream stays in `disabled` state. |
| `VITE_OMNIVERSE_SIGNALING_HOST` | Override signaling host | Derived from `VITE_OMNIVERSE_KIT_URL` hostname. |

### Fail-closed rules

1. No public-IP fallback. `readKitConfig()` never invents an endpoint. `KIT_BASE_URL` constant removed from the client.
2. Any Kit fetch when `enabled === false` throws `KitDisabledError`. Callers translate this to `unavailable` provenance.
3. `OmniverseStreamViewer` connect button is disabled and labelled "Kit not configured" when `enabled === false` or the stream feature flag is off.
4. Vite dev proxy `/kit-api` is registered only when the env resolves to a valid URL. Requests to `/kit-api/*` in demo mode return the default Vite 404.
5. No test runs against an external endpoint. Schema validation is invoked with in-memory fixtures only.

### Explicit connection-state machine

`SourceConnectionState` is the sole vocabulary for UI status:

```
disabled → connecting → connected
                     ↘ degraded
                     ↘ unavailable
demo (no source attempted)
```

`OmniverseStreamViewer` renders the `StreamStatusBanner` for every state except `connected`; the label reads "Local demonstration scene — Omniverse stream unavailable." in all non-connected states.

## Consequences

- The `.env` file is unchanged (user-owned). Users who want to enable Kit set `VITE_OMNIVERSE_KIT_URL` explicitly.
- Demo mode is honest: it is visibly demo mode.
- The pre-existing IP address remains only in the user's `.env` (out of scope for this repo).