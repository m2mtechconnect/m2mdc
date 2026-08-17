# Agent tool policy

Four separate things, never merged:

1. Build-time assistant (MCP) connectors - available to the builder during development only.
   Excluded from the connector manifest, so they can never appear as an operational AURA
   integration or as a runtime-connected source.
2. The platform project-management MCP server - a build tool. It is not, and must not be
   described as, an AURA data-centre operations service.
3. AURA runtime agent tools - not implemented in this phase.
4. AURA published as an MCP server - not implemented in this phase.

Before any runtime agent tool ships, all of the following must exist and be evidenced:
authentication, tenant isolation, facility scope, tool allowlist, input validation,
read-only default, human approval for writes, rate limiting, timeouts, spend limits, audit
records with correlation IDs, revocation, and cross-tenant tests. The first release must be
read-only.

No HTTP endpoint is labelled "MCP" until protocol initialization, negotiation, tool
discovery and invocation have each been proven by an executed test. That proof does not
exist today, so no MCP claim is made.
