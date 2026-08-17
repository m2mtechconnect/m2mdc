# AURA DSX claims policy

Enforced in code by `src/config/dsxClaimsPolicy.ts`. Any UI string, marketing
copy or document that describes AURA's relationship to NVIDIA technology must
pass `enforceClaims()`.

## Prohibited, and what to say instead

| Do not say | Say instead | Why |
|---|---|---|
| Full NVIDIA DSX implementation | DSX-aligned architecture | No DSX component is deployed |
| Omniverse-rendered / Omniverse session | AURA Web Runtime | three.js renders approved GLB derivatives |
| RTX streaming | AURA Web Runtime | No streaming session exists |
| SimReady (asset) | OpenUSD-derived geometry | No asset passed SimReady validation |
| NIM-powered | AURA agent logic | No NVIDIA inference microservice runs |
| DSX Exchange connected | Local exchange harness | Official distribution not deployed |
| DSX Flex / DSX Boost / Max-Q enabled | DSX-aligned design variants / simulation | Concept alignment only |
| Live telemetry | Simulated result | Live telemetry sources: 0 |
| Digital twin of your facility | Simulated facility model | Uncalibrated, not bound to a real site |

## Conditionally allowed

- "NVIDIA OpenUSD-derived geometry" - allowed only for assets whose provenance
  chain records an NVIDIA pack source, a checksum and an approval record.
- "OpenUSD canonical asset" - allowed only when `openUsdCanonical` is true for
  the capability.
- "SimReady validated" - allowed only when a capability reaches
  `SIMREADY_VALIDATED`. `simReadyClaimants()` currently returns an empty list.

## Enforcement points

- `validateRegistry()` fails a capability that claims a status without evidence.
- `findClaimViolations()` reports the offending phrase and its replacement.
- `src/config/__tests__/dsxClaimsPolicy.test.ts` locks each prohibition in place.
- The admin registry page at `/admin/dsx-capabilities` surfaces violations to
  administrators only; no claim status is exposed to unauthenticated users.