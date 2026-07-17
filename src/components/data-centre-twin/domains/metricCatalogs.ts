/**
 * Domain-view metric catalogs (Phase 1A.3.c.1).
 *
 * These catalogs enumerate every visible KPI, status pill, score, and
 * chart series on each domain view, with an individual provenance
 * classification. They drive `<MetricProvenanceManifest>` and are the
 * enumeration source used by provenance regression tests.
 *
 * Attribution rule: fixture-backed values (from
 * `sovereignDataCenter/mockData`) are `AURA demonstration fixture`.
 * Third-party frameworks (Uptime Institute, ASHRAE, ISO 27001…) are
 * cited only in the optional `reference` field.
 */

import { defineCatalog } from '@/lib/provenance/metricCatalog';

const FIXTURE = 'AURA demonstration fixture';

export const POWER_METRICS = defineCatalog('power', [
  { id: 'power.total-draw',       label: 'Power Draw',      provenance: 'demo',   source: FIXTURE,
    description: 'Instantaneous facility power draw, kW.' },
  { id: 'power.utilization-pct',  label: 'Utilization %',   provenance: 'derived', source: 'facility.currentPowerDrawKw ÷ facility.totalPowerCapacityKw',
    description: 'Derived ratio of draw to capacity.' },
  { id: 'power.ups-health',       label: 'UPS Health',      provenance: 'demo',   source: FIXTURE,
    description: 'Average battery health across UPS banks.' },
  { id: 'power.redundancy-level', label: 'Redundancy',      provenance: 'static', source: 'facility.powerUps.kpis.redundancyLevel (configured)',
    description: 'Configured redundancy topology, e.g. N+1 or 2N.' },
  { id: 'power.buses',            label: 'Power Buses',     provenance: 'static', source: 'facility.powerUps.busways.length (configured)',
    description: 'Count of configured power buses.' },
  { id: 'power.ups-bank-list',    label: 'UPS Bank Status', provenance: 'demo',   source: FIXTURE,
    description: 'Per-bank fixture readings.' },
]).metrics;

export const COOLING_METRICS = defineCatalog('cooling', [
  { id: 'cooling.avg-supply-temp', label: 'Avg Supply Temp',   provenance: 'demo',    source: FIXTURE },
  { id: 'cooling.avg-return-temp', label: 'Avg Return Temp',   provenance: 'demo',    source: FIXTURE },
  { id: 'cooling.chiller-count',   label: 'Active Chillers',   provenance: 'static',  source: 'facility.cooling configuration' },
  { id: 'cooling.crah-count',      label: 'CRAH Units',        provenance: 'static',  source: 'facility.cooling configuration' },
  { id: 'cooling.efficiency',      label: 'Cooling Efficiency', provenance: 'derived', source: 'derived from fixture load/temperature' },
]).metrics;

export const THERMAL_METRICS = defineCatalog('thermal', [
  { id: 'thermal.avg-inlet-temp',  label: 'Average Inlet Temp',  provenance: 'demo',    source: FIXTURE,
    reference: 'ASHRAE TC 9.9 recommended envelope (18–27 °C)' },
  { id: 'thermal.hot-spot-count',  label: 'Hot Spot Count',      provenance: 'demo',    source: FIXTURE },
  { id: 'thermal.rack-inlet-map',  label: 'Rack Inlet Heatmap',  provenance: 'demo',    source: FIXTURE },
  { id: 'thermal.snapshot-mode',   label: 'Snapshot mode toggle', provenance: 'static', source: 'UI control state' },
]).metrics;

export const NETWORK_METRICS = defineCatalog('network', [
  { id: 'network.throughput-gbps', label: 'Aggregate Throughput', provenance: 'demo',   source: FIXTURE },
  { id: 'network.latency-p99',     label: 'P99 Latency',          provenance: 'demo',   source: FIXTURE },
  { id: 'network.link-health',     label: 'Link Health',          provenance: 'demo',   source: FIXTURE },
  { id: 'network.topology',        label: 'Network Topology',     provenance: 'static', source: 'facility network configuration' },
]).metrics;

export const FACILITY_METRICS = defineCatalog('facility', [
  { id: 'facility.name',           label: 'Facility Name',    provenance: 'static', source: 'facility.name (configured)' },
  { id: 'facility.location',       label: 'Location',         provenance: 'static', source: 'facility.location (configured)' },
  { id: 'facility.tier',           label: 'Uptime Tier',      provenance: 'static', source: 'facility.tier (configured)',
    reference: 'Uptime Institute Tier classification' },
  { id: 'facility.total-racks',    label: 'Total Racks',      provenance: 'static', source: 'facility.totalRacks (configured)' },
  { id: 'facility.power-capacity', label: 'Power Capacity',   provenance: 'static', source: 'facility.totalPowerCapacityKw (configured)' },
  { id: 'facility.current-pue',    label: 'Current PUE',      provenance: 'demo',   source: FIXTURE },
]).metrics;

export const WORKLOAD_METRICS = defineCatalog('workload', [
  { id: 'workload.active-gpu-count', label: 'Active GPUs',       provenance: 'demo', source: FIXTURE },
  { id: 'workload.gpu-utilization',  label: 'GPU Utilization',   provenance: 'demo', source: FIXTURE },
  { id: 'workload.job-queue-depth',  label: 'Job Queue Depth',   provenance: 'demo', source: FIXTURE },
  { id: 'workload.jobs-running',     label: 'Jobs Running',      provenance: 'demo', source: FIXTURE },
]).metrics;

/**
 * Sovereignty & Compliance is mixed: some tiles are configured facts
 * (jurisdiction, legal entity), some are engine-computed assessments
 * that are not backed by real audit evidence (unavailable), and the
 * framework list is an illustrative example set (demo).
 */
export const SOVEREIGNTY_METRICS = defineCatalog('sovereignty', [
  { id: 'sovereignty.score',              label: 'Sovereignty Score',   provenance: 'unavailable',
    source: 'sovereignty engine (no audit evidence)',
    description: 'Rule-engine output not backed by third-party audit.' },
  { id: 'sovereignty.data-residency',     label: 'Data Residency',      provenance: 'unavailable',
    source: 'sovereignty engine (no audit evidence)' },
  { id: 'sovereignty.audit-readiness',    label: 'Audit Readiness',     provenance: 'unavailable',
    source: 'sovereignty engine (no audit evidence)' },
  { id: 'sovereignty.cross-border-flows', label: 'Cross-Border Flows',  provenance: 'demo',
    source: FIXTURE, description: 'Example flow set.' },
  { id: 'sovereignty.certified-count',    label: 'Frameworks Certified', provenance: 'demo',
    source: FIXTURE, description: 'Example framework statuses.' },
  { id: 'sovereignty.primary-jurisdiction', label: 'Primary Jurisdiction', provenance: 'static',
    source: 'facility configuration' },
  { id: 'sovereignty.location',           label: 'Site Location',       provenance: 'static',
    source: 'facility.location (configured)' },
  { id: 'sovereignty.legal-entity',       label: 'Legal Entity',        provenance: 'static',
    source: 'facility configuration' },
  { id: 'sovereignty.data-controller',    label: 'Data Controller',     provenance: 'static',
    source: 'facility configuration' },
  { id: 'sovereignty.framework-list',     label: 'Compliance Frameworks (example set)', provenance: 'demo',
    source: FIXTURE, reference: 'ISO 27001 / SOC 2 / GDPR / Law 25 (framework names only)' },
]).metrics;

export const CARBON_METRICS = defineCatalog('carbon', [
  { id: 'carbon.grid-intensity',    label: 'Grid Intensity',     provenance: 'demo',    source: FIXTURE,
    description: 'Fixture-backed regional intensity value.' },
  { id: 'carbon.renewable-mix',     label: 'Renewable Mix %',    provenance: 'demo',    source: FIXTURE },
  { id: 'carbon.scope2-tco2',       label: 'Scope 2 tCO₂e',      provenance: 'derived', source: 'carbon engine from fixture inputs' },
  { id: 'carbon.hourly-emissions',  label: 'Hourly Emissions',   provenance: 'derived', source: 'carbon engine from fixture inputs' },
]).metrics;

export const FINANCIAL_METRICS = defineCatalog('financial', [
  { id: 'financial.monthly-opex',     label: 'Monthly OpEx',       provenance: 'demo',    source: FIXTURE },
  { id: 'financial.energy-cost',      label: 'Energy Cost',        provenance: 'derived', source: 'financial engine from fixture inputs' },
  { id: 'financial.contract-revenue', label: 'Contract Revenue',   provenance: 'demo',    source: FIXTURE },
  { id: 'financial.cost-per-gpu-hr',  label: 'Cost / GPU-hour',    provenance: 'derived', source: 'financial engine from fixture inputs' },
]).metrics;

/** Chart-array catalogs used by IntelligenceDashboard cards. */
export const INTELLIGENCE_CHART_METRICS = defineCatalog('intelligence-charts', [
  { id: 'intelligence.pue-trend-series', label: 'PUE Trend series',
    provenance: 'demo', source: FIXTURE,
    reference: 'Uptime Institute Global DC Survey 2024 (reference range only)' },
  { id: 'intelligence.energy-vs-load-series', label: 'Power vs IT Load series',
    provenance: 'demo', source: FIXTURE,
    reference: 'ASHRAE TC 9.9 (reference range only)' },
]).metrics;

/** InfrastructurePage operational metrics — mixed demo + unavailable. */
export const INFRASTRUCTURE_OPERATIONAL_METRICS = defineCatalog('infrastructure-operational', [
  { id: 'infra.training-gpus',     label: 'Training GPUs',            provenance: 'demo',        source: FIXTURE },
  { id: 'infra.inference-gpus',    label: 'Inference GPUs',           provenance: 'demo',        source: FIXTURE },
  { id: 'infra.edge-devices',      label: 'Edge Devices',             provenance: 'demo',        source: FIXTURE },
  { id: 'infra.ddn-throughput',    label: 'DDN Throughput',           provenance: 'demo',        source: FIXTURE },
  { id: 'infra.twin-freshness',    label: 'Twin Freshness',           provenance: 'unavailable', source: 'no telemetry signal wired' },
]).metrics;