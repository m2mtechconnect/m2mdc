# AURA demo integrations

This document defines the demo-only integration presentation for the original AURA application.

## Enablement

The demo surface is opt-in:

```text
VITE_AURA_DEMO_INTEGRATIONS=true
```

Keep the flag `false` for ordinary builds unless the environment is intentionally prepared for an AURA demonstration.

## Customer-facing contract

The demo UI uses AURA product terminology only. External provider names such as Google Search Console, Google Drive and Slack may be shown because they are the systems the user is evaluating. Implementation infrastructure, upstream gateway hosts, credentials and protocol plumbing are not shown.

## Truth states

- **Live · read only** — shown only when server-derived capability evidence, strict white-label gateway readiness and an enabled AURA connection instance all permit the live path.
- **Demo data** — an explicit synthetic/example dataset. It must never be represented as provider data.
- **Unavailable** — a live attempt was blocked or failed. The UI shows sanitized AURA-safe copy and does not fall back silently to simulated live data.

## Initial demo connectors

### Search Analytics

Provider presentation: Google Search Console.

Allowed live operation in this demo phase:

- `search_analytics.sites.list`
- `GET /webmasters/v3/sites`

No write operation is exposed.

### Workspace Documents

Provider presentation: Google Drive.

Current demo state: demo data only until an approved demo runtime account is connected and independently verified.

### Team Collaboration

Provider presentation: Slack.

Current demo state: preview/demo data only. No external message is sent.

## Security rules

1. No interactive user OAuth flow is shown in this demo phase.
2. The browser never receives gateway tokens or provider credentials.
3. Live reads use the existing AURA managed-connector authorization and audit path.
4. Demo data is static presentation data and carries no production/customer records.
5. Live failures do not expose upstream hostnames, stack traces or implementation-platform branding.
6. The white-label customer-surface regression test covers the demo component.

## Promotion boundary

This demo feature does not authorize production enablement. Production integration requires the normal AURA connection lifecycle, runtime verification, independent security review and the Phase 7B OAuth requirements where per-user authorization is needed.
