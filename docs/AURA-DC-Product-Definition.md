# AURA DC — Product Definition (corrected)

AURA DC is the enterprise application and operational control plane around NVIDIA DSX.
NVIDIA DSX supplies the digital twin, OpenUSD scene graph, simulation runtime and
visualization. AURA DC supplies identity, tenancy, asset management, telemetry,
workflows, grounded AI assistance, approvals, auditability and observability.

## What is true today
- A production-quality React portal with design system, i18n, tours and
  provenance-labelled evidence workspaces.
- Supabase authentication with admin approval and role provisioning.
- A deterministic, seeded in-browser simulation engine behind a provider boundary.
- Truth-in-UI infrastructure: provenance badges, evidence boundaries, a11y and
  focus regression suites, zero-egress Playwright harness.

## What is not true today
- No live data-centre telemetry ingestion.
- No connected Omniverse or DSX runtime; the Kit transport is disabled.
- No document retrieval or grounded AI; RAG endpoints return honest 501 failures.
- No MCP protocol implementation; the connector catalogue is a UI catalogue.
- No tenancy isolation, workflow engine, time-series store or object storage.

## Non-negotiable claims policy
Marketing, UI copy and documentation must describe only capabilities that exist and
are proven by an executed test. Planned capability is labelled PLANNED. Simulated
data is labelled as simulated wherever it is displayed.
