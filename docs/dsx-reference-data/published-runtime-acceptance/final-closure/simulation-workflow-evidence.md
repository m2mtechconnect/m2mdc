# Simulation to export workflow

Status: **BLOCKED_UNVERIFIED**.

The Simulation surface loads in reference mode with its own identity
(`Simulation Studio`) and 0 console errors on the published host, and the
blocked-scenario contract is unit-asserted (`canaryEndToEnd.test.ts`: missing
inputs listed, no synthetic substitute, no run recorded, disabled controls
explain the blocker).

Not executed on the published host in this phase: an end-to-end
Simulation -> Compare -> Review -> Evidence -> Export run with server-authoritative
persistence, refresh persistence, duplicate-submit rejection and binding
verification. No executable scenario claim is made. NGC `dsx_dataset` v2.1
remains HTTP 401 and is surfaced as terminal-unavailable with no retry and no
substitution.
