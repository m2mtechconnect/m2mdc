# Facility classification

Defined in `src/data/dsxReference/facilities.ts`, enforced by
`src/data/dsxReference/__tests__/referenceBaseline.test.ts`.

## REFERENCE

- **NVIDIA DSX Reference AI Factory - Evaluation Baseline** (default
  demonstration facility after cutover), source configuration `virginia-gb300`.
- **Virginia Reference Site**, **New Mexico Reference Site**, **Sweden
  Reference Site** - the three sites NVIDIA actually publishes. They are never
  merged into one fictional facility.

Mandatory disclosures on every surface: NVIDIA DSX blueprint sample; dataset
version; reference configuration; not a real facility; not commissioned; not
connected to telemetry; for evaluation; source link; licence status.

## DERIVED_SCENARIO

- **Montreal DSX-Aligned AI Factory Scenario** (was "Montreal Sovereign AI DC").
  AURA-authored, simulated, not commissioned, not connected, not measured. Its
  historical record and prior simulation lineage are preserved. Eight inputs
  (climate, electricity tariff, grid carbon intensity, water availability, land
  and building information, commissioned power, cooling design, network and
  storage configuration) are declared **Not supplied** and must never be filled
  from a Virginia, New Mexico or Sweden reference record.

## OPERATIONAL

Reserved. **Zero** facilities currently qualify. Requires real facility records,
CAD/BIM/OpenUSD, commissioned equipment, connected telemetry, tariffs,
measurements and audit evidence.

## Isolation rule

`countsTowardOperationalTotals` is `false` for every facility in the portfolio,
and `operationalFacilities()` returns an empty list. Reference and derived
facilities can never contribute to an operational rollup.
