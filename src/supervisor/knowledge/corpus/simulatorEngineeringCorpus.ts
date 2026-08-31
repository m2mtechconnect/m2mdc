/**
 * Simulator / data-centre engineering corpus (v-pinned, original prose).
 *
 * Conceptual engineering guidance for data-centre simulation work. Public
 * simulators and standards are cited as literature only: nothing here claims
 * that any third-party simulator is embedded, running or wired into AURA.
 * Claims of that kind are governed by the evidence guardrails.
 */
import type { EngineeringKnowledgeEntry } from '../engineeringKnowledgeTypes';

export const SIMULATOR_ENGINEERING_CORPUS: EngineeringKnowledgeEntry[] = [
  {
    id: 'se-thermal-power-chain',
    domain: 'simulation-engineering',
    title: 'Power and cooling chain modelling for data-centre twins',
    guidance:
      'Model the electrical chain as an ordered graph from utility intake through switchgear, UPS, ' +
      'distribution units and rack-level feeds, attaching a loss coefficient to each hop so aggregate ' +
      'overhead emerges from the topology instead of a single fudge factor. Treat cooling as a parallel ' +
      'chain (chillers, CRAH or in-row units, economizer hours, supply and return temperature setpoints) ' +
      'whose load follows IT power with a lag term. Keep thermal setpoint guidance aligned with published ' +
      'ASHRAE envelope classes, and expose every assumed coefficient as a reviewable model parameter ' +
      'rather than an embedded constant.',
    keywords: ['power', 'cooling', 'thermal', 'ups', 'chiller', 'crah', 'setpoint', 'topology', 'electrical'],
    citations: [
      {
        label: 'ASHRAE TC 9.9 thermal guidelines for data processing environments',
        locator: 'https://www.ashrae.org/technical-resources/bookstore/datacom-series',
        kind: 'public-specification',
      },
      {
        label: 'Uptime Institute tier classification overview',
        locator: 'https://uptimeinstitute.com/tiers',
        kind: 'public-documentation',
      },
    ],
    restrictedClaimCategories: ['calibration'],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'se-pue-efficiency-metrics',
    domain: 'simulation-engineering',
    title: 'PUE and efficiency metrics: definitions and modelling pitfalls',
    guidance:
      'PUE is total facility energy divided by IT equipment energy, measured over a stated interval and ' +
      'boundary; a spot reading and an annualized figure are different quantities and must never be mixed ' +
      'in one KPI. Companion metrics (WUE for water, CUE for carbon) follow the same boundary discipline. ' +
      'When a twin computes efficiency, label whether the number is a design target, a simulated estimate ' +
      'or a measured value, and keep the three provenances visually distinct. A simulated PUE inherits the ' +
      'uncertainty of its input coefficients, so present it with its assumption set, never as a measurement.',
    keywords: ['pue', 'wue', 'cue', 'efficiency', 'metrics', 'overhead', 'energy', 'boundary'],
    citations: [
      {
        label: 'ISO/IEC 30134-2 power usage effectiveness',
        locator: 'https://www.iso.org/standard/63451.html',
        kind: 'public-specification',
      },
      {
        label: 'The Green Grid data-centre efficiency metrics',
        locator: 'https://www.thegreengrid.org/',
        kind: 'public-documentation',
      },
    ],
    restrictedClaimCategories: ['calibration'],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'se-discrete-event-simulation',
    domain: 'simulation-engineering',
    title: 'Discrete-event simulation for workload and energy studies',
    guidance:
      'Discrete-event simulation advances a virtual clock between scheduled events (job arrival, placement, ' +
      'completion, failure) instead of fixed ticks, which keeps long horizon studies tractable. For ' +
      'data-centre studies, drive the event stream from a workload trace or a documented arrival process, ' +
      'map placements onto a capacity model, and derive power draw from utilization curves per hardware ' +
      'class. Publish the random seed policy and warm-up discard window with every experiment so results ' +
      'replicate. Public research simulators such as OpenDC document these techniques; AURA cites that ' +
      'literature for methodology only and makes no claim of embedding or running any external simulator.',
    keywords: ['discrete', 'event', 'simulation', 'workload', 'scheduling', 'trace', 'seed', 'placement'],
    citations: [
      {
        label: 'OpenDC data-centre simulation research project (literature reference only)',
        locator: 'https://opendc.org/',
        kind: 'public-research',
      },
      {
        label: 'Law, Simulation Modeling and Analysis (5th ed.)',
        locator: 'isbn:9780073401324',
        kind: 'public-research',
      },
    ],
    restrictedClaimCategories: ['integration'],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'se-model-calibration',
    domain: 'simulation-engineering',
    title: 'Calibration methodology: comparing modelled output to measurement',
    guidance:
      'Calibration compares modelled outputs against measured series over a defined window, tunes the ' +
      'declared parameter set to minimize residual error, and then validates on a held-out window that the ' +
      'tuning never saw. Record the acceptance threshold (for example mean absolute percentage error under ' +
      'a stated bound) before tuning begins, and store the comparison record with timestamps and dataset ' +
      'references. A model without such a record must present its outputs as uncalibrated estimates; the ' +
      'calibration claim itself requires a calibration-record artifact under the evidence guardrails.',
    keywords: ['calibration', 'residual', 'validation', 'threshold', 'measured', 'estimate', 'methodology'],
    citations: [
      {
        label: 'Law, Simulation Modeling and Analysis (5th ed.), model validation chapters',
        locator: 'isbn:9780073401324',
        kind: 'public-research',
      },
      {
        label: 'AURA data provenance model (ADR-0004)',
        locator: 'docs/adr/0004-data-provenance-model.md',
        kind: 'repository-artifact',
      },
    ],
    restrictedClaimCategories: ['calibration'],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'se-failure-resilience-modeling',
    domain: 'simulation-engineering',
    title: 'Redundancy and failure modelling limits',
    guidance:
      'Redundancy topologies (N+1, 2N, distributed redundant) change both the failure mathematics and the ' +
      'part-load efficiency of the plant, so a twin must model them structurally, never as a single ' +
      'availability percentage. Use MTBF and MTTR distributions per component class to drive failure ' +
      'events, and report availability as a distribution with confidence bounds rather than a point value. ' +
      'Be explicit about what simulation cannot prove: a simulated failover exercises the model, not the ' +
      'facility, and must never be presented as evidence that the physical plant behaves the same way.',
    keywords: ['redundancy', 'failure', 'availability', 'mtbf', 'mttr', 'failover', 'resilience', 'tier'],
    citations: [
      {
        label: 'Uptime Institute tier classification overview',
        locator: 'https://uptimeinstitute.com/tiers',
        kind: 'public-documentation',
      },
      {
        label: 'AURA truth-in-UI and metric provenance (ADR-0006)',
        locator: 'docs/adr/0006-truth-in-ui-and-metric-provenance.md',
        kind: 'repository-artifact',
      },
    ],
    restrictedClaimCategories: ['production-readiness'],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
];
