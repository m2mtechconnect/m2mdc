# Omniverse Kit environment configuration

Phase 1A.1, item 9.

The application communicates with an NVIDIA Omniverse Kit REST endpoint for
scene health/telemetry and, separately, with a WebRTC signalling host for
the live viewport stream. Both are **opt-in** and **disabled by default** in
all shipped builds so that no browser instance attempts to connect to any
third-party or private infrastructure without explicit operator
configuration.

## Variables

All variables are Vite-injected (`VITE_*` prefix) and read once at build
time. Values are consumed exclusively by
`src/integrations/omniverseKit/config.ts`; do not read them elsewhere.

### `VITE_OMNIVERSE_STREAM_ENABLED`

- Type: boolean string (`"true"` / `"false"`).
- Default: `"false"`.
- Behaviour when `"false"` (or unset): the app runs in local demonstration
  mode. `useOmniverseKit()` yields `connection: "disabled"`, the
  `<OmniverseStreamViewer>` displays the "Kit disabled by configuration"
  banner, and every KPI card renders as `demo` — never `live`.
- Behaviour when `"true"`: `fetchStatusValidated()` polls the REST endpoint
  and the WebRTC signalling handshake is attempted.

### `VITE_OMNIVERSE_KIT_URL`

- Type: absolute URL, `https://` in production or `http://localhost:*` in
  local development.
- Default: **unset**. When `VITE_OMNIVERSE_STREAM_ENABLED=true` and this
  variable is missing or invalid, `useOmniverseKit()` yields
  `connection: "unavailable"` and the UI shows the "Kit unavailable"
  banner. The application will not attempt any network request.
- Validation rules (enforced in `config.ts`):
  - Must parse as a WHATWG URL.
  - Must NOT contain user-info, query, or fragment components.
  - Must resolve to a routable host in production. Public IP fallbacks are
    rejected.
- **Never commit a real endpoint.** The tracked source tree contains no
  hard-coded Kit URL (verified by grep on this commit); the previous
  placeholder was removed in Phase 0.

### `VITE_OMNIVERSE_SIGNALING_HOST`

- Type: hostname (no scheme) used by the WebRTC signalling client.
- Default: **unset**. When absent, the viewport falls back to the local
  demonstration scene regardless of `VITE_OMNIVERSE_STREAM_ENABLED`.
- Validation rules: hostname must be non-empty, must not be a public IP
  literal, must not include a port range fallback. Only DNS names or
  `localhost` are accepted.

## Local development example

Add the following to `.env.local` (never `.env`, which is tracked):

```dotenv
# Off by default — set to true only for a local kit you run yourself.
VITE_OMNIVERSE_STREAM_ENABLED=false
VITE_OMNIVERSE_KIT_URL=http://localhost:8211
VITE_OMNIVERSE_SIGNALING_HOST=localhost
```

The tracked `.env` MUST remain empty of Kit values. This document does not
expose the current developer's `.env.local`.

## Production requirements

- `VITE_OMNIVERSE_STREAM_ENABLED=true` MUST be paired with both
  `VITE_OMNIVERSE_KIT_URL` and `VITE_OMNIVERSE_SIGNALING_HOST`. When either
  is missing the build passes but the UI renders "Kit unavailable" at
  runtime.
- Endpoints MUST be reachable from the browser origin (CORS + TLS).
- Endpoint hostnames MUST be scoped to infrastructure the deploying party
  owns. No public-IP fallback is provided or accepted.
- The Kit REST endpoint MUST respond to `GET /status` with a payload that
  passes `KitStatusSchema` (see `src/integrations/omniverseKit/schema.ts`).
  Payloads that fail validation are redacted and rendered as "Kit response
  invalid".

## Failure behaviour matrix

| Environment state | `useOmniverseKit()` connection | Banner | KPI provenance |
| --- | --- | --- | --- |
| `STREAM_ENABLED=false` | `disabled` | "Kit disabled by configuration" | `demo` |
| Enabled, URL missing/invalid | `unavailable` | "Kit unavailable" | `demo` / `unavailable` |
| Enabled, endpoint 5xx/timeout | `unavailable` | "Kit unavailable" | `demo` / `unavailable` |
| Enabled, endpoint returns invalid payload | `unavailable` | "Kit response invalid" | `demo` / `unavailable` |
| Enabled, endpoint returns valid payload | `connected` | (hidden) | `live` |
| Enabled, WebRTC signalling down but REST healthy | `connected` (REST) | "Omniverse stream degraded" | `live` |

## REST status vs. WebRTC stream

The Kit REST endpoint provides polled scene health that maps to
`ProvenancedMetric<T>` values with `live` provenance. The WebRTC stream is
purely visual: it never sources operational KPIs. A degraded stream
therefore does NOT downgrade KPI provenance; conversely, an invalid REST
payload downgrades KPIs to `demo`/`unavailable` even if a placeholder
viewport is still shown.

## Confirmation

Running

```
rg -n "omniverse" src public .github supabase | rg -v "VITE_OMNIVERSE|src/integrations/omniverseKit|__tests__|docs"
```

on this commit reveals no residual hard-coded Kit endpoint. The former
placeholder is fully absent from tracked source and configuration files.
