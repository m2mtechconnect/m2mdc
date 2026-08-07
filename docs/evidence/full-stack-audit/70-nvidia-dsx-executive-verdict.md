# NVIDIA / DSX executive verdict (Stage 3)

Official meaning of NVIDIA DSX: an official NVIDIA AI-factory-scale platform brand combining a reference design, Omniverse DSX Blueprint (GA on build.nvidia.com), DSX Exchange, DSX OS, DSX Sim, MaxLPS and Flex. Not a single SKU, not a partner solution, not an M2M name.
NVIDIA components claimed: 23
NVIDIA components statically proven: 0 (1 non-NVIDIA open-source substitute proven: MQTT/Mosquitto)
NVIDIA components runtime-proven: 0
Mock or simulated components: 23
DSX-01 Blueprint/lineage: ARCHITECTURE_ONLY — 2/15 (13%); no executable blueprint, container, manifest or lineage
DSX-02 OpenUSD/SimReady: NOT_IMPLEMENTED — 0 USD files; prim paths are validated strings only; SimReady is an M2M metadata abstraction
DSX-03 Telemetry integration: PARTIALLY_IMPLEMENTED — 9/20 (45%); 5 sources, 0 live-verified, fail-closed boundary is real
DSX-04 Calibrated simulation: UNVALIDATED — 0 calibrated of 19 scenarios; no ground truth; accuracy must not be estimated
DSX-05 Operational validation: PARTIALLY_IMPLEMENTED — 6/14 (43%); 3 executable scenarios, 0 completed human reviews, 0 measured outcomes
Architecture-aligned readiness: 80%
Demo readiness: 92%
Pilot readiness: 24%
Production readiness: 7%
NVIDIA validation/certification status: NONE — no programme application, listing or entitlement exists
Highest defensible customer claim: "A deterministic, fully labelled simulated demonstration of a data-centre digital-twin operations surface, architecturally aligned to NVIDIA Omniverse and OpenUSD conventions, with no NVIDIA software, GPU compute or live facility data in the build."
Claims that must be withdrawn or qualified: C-01 live Omniverse RTX scene; C-02 "Kit 109 • Live Scene" badge; C-03 "connects to the twin running on Kit 109"; C-04 "matching Nvidia Omniverse / Siemens / Schneider / AWS / Azure"; C-05 NVIDIA B3100 and RTX PRO 6000 hardware and "Omniverse what-if engine"; C-07 "Omniverse USD, real-time sync"; C-08 the "DSX Exchange" module name colliding with NVIDIA's published layer
Critical blockers: no OpenUSD stage exists; no NVIDIA software or entitlement; no calibrated model or ground-truth dataset; no live telemetry source; Omniverse client disabled at build level pending a server-mediated transport; F-01 and F-15 security findings remain CRITICAL
Runtime gates blocked: 11 (G-N1 to G-N11, doc 68) — all blocked on environment, hardware, entitlement or fixtures; zero production requests were made
Files added: 11 (60 to 70)
Checksum verification: see command output below
Final NVIDIA/DSX verdict: **CONTROLLED_DEMO_READY**

Production remains **NO-GO**. This stage does not alter the frozen security
conclusions: static/hermetic audit COMPLETE, runtime audit
BLOCKED_BY_ENVIRONMENT, F-01 CRITICAL, F-15 CRITICAL.
