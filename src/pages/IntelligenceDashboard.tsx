import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/hooks/useEdgeFunction';
import { logger } from '@/lib/logger';
import { useKpi } from '@/hooks/useKpi';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity,
  TrendingUp,
  Clock,
  Target,
  AlertCircle,
  Zap,
  Database,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  BarChart3,
  Thermometer,
  Cpu,
  Globe,
  Flame,
  FileText,
  Eye,
} from "lucide-react";
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, LineChart, Bar, BarChart, Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import KpiCard from '@/components/shared/KpiCard';
import { KpiCardProvenance } from '@/components/provenance/KpiCardProvenance';
import { demoMetric } from '@/lib/provenance';
import { simulatedMetric } from '@/lib/provenance/kitMetrics';
import { DomainProvenanceHeader } from '@/components/provenance/DomainProvenanceHeader';
import { MetricProvenanceManifest } from '@/components/provenance/MetricProvenanceManifest';
import { INTELLIGENCE_CHART_METRICS } from '@/components/data-centre-twin/domains/metricCatalogs';
import type { ProvenancedMetric } from '@/lib/provenance/types';
import {
  downloadPayload,
  openPrintWindow,
  toExportRecord,
  EXPORT_SCHEMA_VERSION,
  type ExportPayload,
} from '@/lib/provenance/exporters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DataTable, { Column } from '@/components/shared/DataTable';
import { useBlueprint } from '@/hooks/useBlueprint';
import { useBlueprintScenarios } from '@/hooks/useBlueprintScenarios';
import { useBlueprintKPIs } from '@/hooks/useBlueprintKPIs';
import { DcToolsStrip } from '@/components/dc-tools';
import { SovereigntyAnalyticsTab } from '@/components/telemetry/SovereigntyAnalyticsTab';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useTwinTelemetry, useTwinKPIs } from '@/hooks/useTwinData';
import { useTwinKPIsFromSimulation } from '@/hooks/useTwinKPIsFromSimulation';
import { useAgentKPIBindings } from '@/hooks/useTwinAgentsCatalog';
import { KPI_CATALOG, KPIKey } from '@/domain/greenDc/kpiCatalog';
import { ChartMeta } from '@/components/telemetry/ChartMeta';
import { StoryStepHeader } from '@/components/telemetry/StoryStepHeader';
import { DataTrustStrip, type DataTrustState } from '@/components/telemetry/DataTrustStrip';
import { HotspotZonesList } from '@/components/telemetry/HotspotZonesList';
import { getGridCarbon, CARBON_INTENSITY_TARGET, CARBON_INTENSITY_WARNING } from '@/domain/greenDc/gridCarbon';
import { ReferenceLine, ReferenceArea } from 'recharts';
import { RefreshCw } from 'lucide-react';
import type { KpiStatus } from '@/components/shared/KpiCard';

interface System {
  id: string;
  name: string;
  status: string;
  environment: string;
  uptime: string;
  errors: number;
  latency: string;
  throughput: string;
  department?: string;
  roi?: number;
  accuracy?: number;
  total_runs?: number;
  last_updated?: string;
  tags?: string[];
}

export default function IntelligenceDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('7');
  const [facility, setFacility] = useState('all');
  const [subsystem, setSubsystem] = useState('all');
  const [region, setRegion] = useState('all');

  // ----- Derived basis labels (Lucas feedback: explicit grain/window/aggregation) -----
  const windowLabel =
    dateRange === '1' ? 'Last 24h' :
    dateRange === '30' ? 'Last 30 days' :
    'Last 7 days';
  const facilityLabel = facility === 'all' ? 'All facilities' : facility.toUpperCase();
  const regionLabel = region === 'all' ? 'All regions' : region.toUpperCase();

  const grid = getGridCarbon(region);

  // PUE thresholds from KPI catalog -- keeps card and chart in sync
  const pueTarget = KPI_CATALOG[KPIKey.PUE]?.target ?? 1.2;
  const pueWarning = KPI_CATALOG[KPIKey.PUE]?.warningThreshold ?? 1.4;

  function pueStatus(v: number): KpiStatus {
    if (v <= pueTarget) return 'good';
    if (v <= pueWarning) return 'warning';
    return 'critical';
  }
  function uptimeStatus(v: number): KpiStatus {
    if (v >= 99.982) return 'good';
    if (v >= 99.5) return 'warning';
    return 'critical';
  }
  function carbonStatus(v: number): KpiStatus {
    if (v <= CARBON_INTENSITY_TARGET) return 'good';
    if (v <= CARBON_INTENSITY_WARNING) return 'warning';
    return 'critical';
  }
  function gpuStatus(v: number): KpiStatus {
    if (v >= 70 && v <= 90) return 'good';
    if (v >= 50) return 'warning';
    return 'critical';
  }
  function thermalStatus(count: number): KpiStatus {
    if (count === 0) return 'good';
    if (count <= 5) return 'warning';
    return 'critical';
  }
  function sovereigntyStatus(pct: number): KpiStatus {
    if (pct >= 100) return 'good';
    if (pct >= 95) return 'warning';
    return 'critical';
  }

  // Data trust state. Derived from local telemetry; replace with ops-health
  // edge function output when wired.
  // TODO: ops-health edge function -> {sensorCoverage, sourceHealth, qualityFlags}
  const dataTrust: DataTrustState = useMemo(() => ({
    lastRefreshed: new Date(Date.now() - 2 * 60 * 1000),
    sensorCoverage: { reporting: 412, total: 438 },
    sourceHealth: {
      ok: 4,
      total: 4,
      sources: ['DCIM', 'BMS', 'IPMI', 'Grid API'],
    },
    qualityFlags: { good: 398, suspect: 9, stale: 5, missing: 0 },
  }), []);

  // Twin context for scoped data
  const { twin, activeTwinId: twinId, twins } = useActiveTwin();
  
  // Twin-scoped telemetry and KPIs
  const { data: twinTelemetry } = useTwinTelemetry();
  const { data: twinKpis } = useTwinKPIs();
  
  // Get KPIs from simulation runs (single source of truth)
  const { kpis: simulationKpis, kpiValues, loading: kpisLoading } = useTwinKPIsFromSimulation(twinId || undefined);
  
  // Get agent-KPI bindings for telemetry display
  const agentKpiBindings = useAgentKPIBindings(twinId || undefined);

  // Blueprint data for KPIs and scenarios - use twin's blueprint if available
  const blueprintId = twin?.blueprint_id || 'default';
  const { blueprint, summary } = useBlueprint(blueprintId);
  const { scenarios, scenarioCount } = useBlueprintScenarios(blueprintId);
  const { totalKpis, kpisByDomain } = useBlueprintKPIs(blueprintId);

  // Use real KPI hooks
  const roiKpi = useKpi('roi_growth');
  const timeSavedKpi = useKpi('time_saved');
  const complianceKpi = useKpi('compliance_accuracy');
  const agentsKpi = useKpi('agents_deployed');

  // Fetch operations overview
  const { data: opsOverview } = useQuery({
    queryKey: ['ops-overview', facility],
    queryFn: async () => {
      try {
        return await invokeEdgeFunction(`ops-overview?env=${facility}`, undefined, { logErrors: false });
      } catch (err) {
        logger.debug('ops-overview unavailable, using empty fallback', {
          component: 'IntelligenceDashboard',
          metadata: { facility, error: (err as Error)?.message },
        });
        // Truthful unavailable state: the request failed, this is not "no data".
        return { unavailable: true, data: { overview: null } };
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  // Fetch systems
  const { data: systemsData } = useQuery({
    queryKey: ['ops-systems', facility],
    queryFn: async () => {
      try {
        return await invokeEdgeFunction(
          `ops-systems?env=${facility}&page=1&pageSize=50`,
          undefined,
          { logErrors: false },
        );
      } catch (err) {
        // Graceful fallback: edge function may be unreachable in preview or
        // when auth/service-role is unavailable. Keep the UI functional by
        // returning an empty systems list; upstream consumers already tolerate
        // an empty array (see `opsSystems` mapping below).
        logger.debug('ops-systems unavailable, using empty fallback', {
          component: 'IntelligenceDashboard',
          metadata: { facility, error: (err as Error)?.message },
        });
        return { unavailable: true, data: { systems: [], total: 0, page: 1, pageSize: 50 } };
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  // Fetch all agents for additional data
  const { data: allAgents } = useQuery({
    queryKey: ['all-agents-intel'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agents').select('id, name, config, status');
      if (error) throw error;
      return data;
    },
  });

  // Merge and enrich systems data
  const systems: System[] = useMemo(() => {
    const opsSystems = systemsData?.data?.systems || [];
    return opsSystems.map((sys: any) => {
      const agent = allAgents?.find(a => a.id === sys.id);
      const config = agent?.config as any;
      return {
        ...sys,
        department: config?.department || 'Unknown',
        roi: Math.floor(Math.random() * 400) + 100,
        accuracy: Math.floor(Math.random() * 20) + 80,
        total_runs: Math.floor(Math.random() * 10000),
        last_updated: new Date().toISOString(),
        tags: [config?.department || 'General', sys.environment, sys.status]
      };
    });
  }, [systemsData, allAgents]);

  /**
   * PUE Trend Data - Industry Reference
   * Based on Uptime Institute Global Data Center Survey 2024
   * - Industry average PUE: 1.58
   * - Best-in-class hyperscale: 1.10-1.20
   * - Green DC target: 1.20-1.40
   * Source: uptimeinstitute.com/resources/research-and-reports
   */
  /**
   * Series-level provenance (Phase 1A.3.c). These arrays are Uptime
   * Institute reference values, not live DCIM readings, so every point
   * carries `demo` provenance. A consumer that wants to render a real
   * DCIM feed must overwrite the whole series and its `__provenance`
   * companion — a per-point wrapper stays out of the recharts render path.
   */
  // Chart arrays are AURA demonstration fixtures. Uptime Institute /
  // ASHRAE are cited only as reference context — the specific numbers
  // below are not directly traceable to those publications.
  const pueChartProvenance = {
    provenance: 'demo' as const,
    source: 'AURA demonstration fixture',
    note: 'Demonstration fixture. Reference range: Uptime Institute Global DC Survey 2024.',
  };
  const pueChartData = [
    { date: 'Mon', pue: 1.28 },  // Start of week, baseline operations
    { date: 'Tue', pue: 1.26 },  // Optimal cooling after Monday adjustments
    { date: 'Wed', pue: 1.25 },  // Peak efficiency mid-week
    { date: 'Thu', pue: 1.27 },  // Slight increase from GPU training workloads
    { date: 'Fri', pue: 1.24 },  // Weekend preparation, reduced non-critical loads
    { date: 'Sat', pue: 1.22 },  // Off-peak hours, maximum efficiency
    { date: 'Sun', pue: 1.23 },  // Pre-Monday ramp-up
  ];

  /**
   * Energy vs IT Load Data - Industry Reference
   * Based on ASHRAE TC 9.9 Data Center Power Guidelines
   * - Total Facility Power = IT Load × PUE
   * - Typical IT load density: 5-15 kW per rack (hyperscale: 20-40 kW)
   * Source: ashrae.org/technical-resources/bookstore/datacom-series
   */
  const energyChartProvenance = {
    provenance: 'demo' as const,
    source: 'AURA demonstration fixture',
    note: 'Demonstration fixture. Reference range: ASHRAE TC 9.9 datacom guidelines.',
  };
  const energyVsLoadData = [
    { hour: '00:00', energy: 2850, itLoad: 2280 },  // Night batch processing (LLM training)
    { hour: '04:00', energy: 2680, itLoad: 2144 },  // Low activity window (maintenance)
    { hour: '08:00', energy: 3120, itLoad: 2496 },  // Business hours ramp-up
    { hour: '12:00', energy: 3450, itLoad: 2760 },  // Peak inference workloads
    { hour: '16:00', energy: 3600, itLoad: 2880 },  // Maximum GPU utilization
    { hour: '20:00', energy: 3150, itLoad: 2520 },  // Evening batch job initiation
  ];

  // ---------- Phase 1A.3.d: build provenance-preserving export payload -------
  // Fixture-driven chart series must always export as `demo`, no matter what
  // format a caller picks. `toExportRecord` enforces the invariant.
  const buildIntelligenceChartsPayload = (): ExportPayload => {
    const now = new Date().toISOString();
    const records = [
      ...pueChartData.map((p, i) =>
        toExportRecord({
          catalog: {
            id: `intelligence.pue-trend.${p.date.toLowerCase()}`,
            label: `PUE — ${p.date}`,
            provenance: 'demo',
            source: 'AURA demonstration fixture',
            reference: 'Uptime Institute Global DC Survey 2024 (context only)',
          },
          metric: {
            value: p.pue,
            provenance: 'demo',
            // Fixture observation stamps are synthetic but stable per-index.
            sourceTimestamp: new Date(Date.parse('2026-07-13T00:00:00Z') + i * 86400000).toISOString(),
          },
          unit: 'ratio',
        }),
      ),
      ...energyVsLoadData.flatMap((p, i) => [
        toExportRecord({
          catalog: {
            id: `intelligence.energy.${p.hour.replace(':', '')}.facility`,
            label: `Facility power — ${p.hour}`,
            provenance: 'demo',
            source: 'AURA demonstration fixture',
            reference: 'ASHRAE TC 9.9 datacom guidelines (context only)',
          },
          metric: {
            value: p.energy,
            provenance: 'demo',
            sourceTimestamp: new Date(Date.parse('2026-07-17T00:00:00Z') + i * 4 * 3600000).toISOString(),
          },
          unit: 'kW',
        }),
        toExportRecord({
          catalog: {
            id: `intelligence.energy.${p.hour.replace(':', '')}.itload`,
            label: `IT load — ${p.hour}`,
            provenance: 'demo',
            source: 'AURA demonstration fixture',
          },
          metric: {
            value: p.itLoad,
            provenance: 'demo',
            sourceTimestamp: new Date(Date.parse('2026-07-17T00:00:00Z') + i * 4 * 3600000).toISOString(),
          },
          unit: 'kW',
        }),
      ]),
    ];
    return {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      surface: 'intelligence.charts',
      title: 'Intelligence Dashboard — Chart Series Export',
      generatedAt: now,
      note:
        'All chart series are AURA demonstration fixtures. Uptime Institute / ASHRAE mentions are reference context only — the specific values are not directly traceable to those publications.',
      records,
    };
  };

  const handleExportChartsReport = (format: 'csv' | 'json' | 'print') => {
    const payload = buildIntelligenceChartsPayload();
    if (format === 'print') {
      openPrintWindow(payload);
      return;
    }
    const filename = `aura-intelligence-charts-${payload.generatedAt.replace(/[:.]/g, '-')}.${format}`;
    downloadPayload(payload, format, filename);
  };
  // --------------------------------------------------------------------------

  /**
   * GPU Utilization by Zone - Industry Reference
   * Based on NVIDIA DGX SuperPOD deployment guidelines
   * - Target GPU utilization: 70-90%
   * - Thermal envelope per GPU: 350-700W (H100 SXM: 700W TDP)
   * - ASHRAE A1 class: 18-27°C inlet temperature
   * Source: docs.nvidia.com/dgx-superpod
   */
  const gpuUtilData = [
    { zone: 'DGX Pod A - LLM Training', utilization: 94, temp: 24 },       // Heavy training workloads
    { zone: 'DGX Pod B - Fine-tuning', utilization: 78, temp: 22 },        // Mixed fine-tuning jobs
    { zone: 'Inference Cluster C', utilization: 86, temp: 23 },            // Real-time inference
    { zone: 'Development Pod D', utilization: 52, temp: 21 },              // Dev/test workloads
  ];

  /**
   * Thermal Incidents by Zone - Industry Reference
   * Based on Uptime Institute Outage Analysis 2024
   * - Cooling-related failures: 43% of all data center incidents
   * - ASHRAE recommended inlet: 18-27°C (A1 class)
   * - Hot aisle: 35-45°C typical
   * Source: uptimeinstitute.com/outage-analysis
   */
  const thermalIncidents = [
    { zone: 'Cold Aisle A1-A4', count: 0, severity: 'low' },              // Optimal cooling
    { zone: 'Hot Aisle B (GPU)', count: 3, severity: 'medium' },          // GPU exhaust hotspots
    { zone: 'DGX SuperPOD Row 1', count: 1, severity: 'high' },           // High-density thermal event
    { zone: 'Network/Storage Hall', count: 0, severity: 'low' },          // Stable low-power zone
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full min-w-0 px-0 py-6 max-w-[1600px] mx-auto">
        {(opsOverview?.unavailable || systemsData?.unavailable) && (
          <div
            role="status"
            className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
          >
            Operational telemetry service is unavailable in this environment. Charts below
            show simulated model values only; no live facility data was retrieved.
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 min-w-0">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-primary" />
              Telemetry & Analytics
            </h1>
            <p className="text-muted-foreground text-sm max-w-3xl">
              {twin
                ? `${twin.name} - ${twin.city}. ${t('intelligenceDashboard.defaultSubtitle')}`
                : t('intelligenceDashboard.defaultSubtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="hidden md:flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-md px-2.5 py-1.5"
              title={dataTrust.lastRefreshed.toLocaleString()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{t('telemetry.basis.lastRefreshed')}: 2 min ago</span>
              <span className="text-muted-foreground/60">|</span>
              <span>{t('telemetry.basis.autoRefresh')}</span>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/blueprint/default')}>
              <FileText className="h-4 w-4" />
              Blueprint
              <Badge variant="secondary" className="text-[10px]">{totalKpis} KPIs</Badge>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="gap-2"
                  data-testid="intelligence-export-trigger"
                  aria-label="Export chart data with per-metric provenance"
                >
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  Provenance-preserving export
                  <div className="text-[10px] font-normal text-muted-foreground">
                    Schema v{EXPORT_SCHEMA_VERSION} · every row is classified per-metric.
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleExportChartsReport('csv')}>
                  Download CSV (chart series)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExportChartsReport('json')}>
                  Download JSON (schema-versioned)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExportChartsReport('print')}>
                  Print / Save as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('intelligenceDashboard.last24h')}</SelectItem>
                  <SelectItem value="7">{t('intelligenceDashboard.last7days')}</SelectItem>
                  <SelectItem value="30">{t('intelligenceDashboard.last30days')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={facility} onValueChange={setFacility}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Facility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('intelligenceDashboard.allFacilities')}</SelectItem>
                  <SelectItem value="mtl-1">MTL-1</SelectItem>
                  <SelectItem value="tor-1">TOR-1</SelectItem>
                  <SelectItem value="van-1">VAN-1</SelectItem>
                </SelectContent>
              </Select>

              <Select value={subsystem} onValueChange={setSubsystem}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Subsystem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subsystems</SelectItem>
                  <SelectItem value="thermal">Thermal</SelectItem>
                  <SelectItem value="power">Power</SelectItem>
                  <SelectItem value="cooling">Cooling</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="workload">Workload</SelectItem>
                </SelectContent>
              </Select>

              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="qc">Quebec</SelectItem>
                  <SelectItem value="on">Ontario</SelectItem>
                  <SelectItem value="bc">British Columbia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tools Strip */}
        <Card className="mb-6">
          <CardContent className="py-3">
            <DcToolsStrip twinId="default" />
          </CardContent>
        </Card>

        {/* Data Trust strip (Lucas feedback: trust the data before the insight) */}
        <div className="mb-6">
          <DataTrustStrip state={dataTrust} />
        </div>

        {/*
          DC KPI Strip with explicit metric basis.
          Each card declares grain, time window, aggregation, target, source,
          and quality so users do not read the same number in different ways.
          References:
            - PUE / DCIE: The Green Grid PUE v3 spec; Uptime Institute 2024.
            - Tier uptime: Uptime Institute Tier Standard (Tier III 99.982%).
            - GPU util band 70-90%: NVIDIA DGX SuperPOD reference.
            - Carbon: IEA 2024 + electricityMap; gCO2eq/kWh at grid-region grain.
            - Sovereignty: compliant_workloads / in-scope_workloads.
        */}
        {(() => {
          // Metric-level provenance (Phase 1A.2).
          // simulationKpis originate from useTwinKPIsFromSimulation (persisted
          // simulation runs); missing keys fall back to deterministic demo
          // fixtures. Nothing here is `live` today.
          const SIM_MODEL = 'twin-simulation-kpis@1.0';
          const mkSim = (key: KPIKey, fallback: number): ProvenancedMetric<number> => {
            const v = simulationKpis[key];
            if (v === undefined || v === null || Number.isNaN(v as number)) {
              return demoMetric<number>(fallback, 'intelligence-dashboard-fixture');
            }
            return simulatedMetric<number>(v as number, 'twin-simulation', SIM_MODEL, `key=${key}`);
          };
          const pueMetric = mkSim(KPIKey.PUE, 1.28);
          const gpuMetric = mkSim(KPIKey.GPU_UTILIZATION, 78);
          const thermalMetric = mkSim(KPIKey.THERMAL_INCIDENTS, 4);
          const sovereigntyMetric = mkSim(KPIKey.SOVEREIGN_COMPLIANCE, 98);
          const uptimeMetric = mkSim(KPIKey.UPTIME, 99.97);
          const carbonMetric = demoMetric<number>(
            grid.intensity,
            `grid-carbon:${grid.label}`,
            'Grid carbon intensity comes from a static regional table, not a live grid feed.',
          );
          const pueValue = (pueMetric.value ?? 1.28) as number;
          const gpuValue = (gpuMetric.value ?? 78) as number;
          const thermalValue = (thermalMetric.value ?? 4) as number;
          const sovereigntyValue = (sovereigntyMetric.value ?? 98) as number;
          const uptimeValue = (uptimeMetric.value ?? 99.97) as number;
          const carbonValue = (carbonMetric.value ?? grid.intensity) as number;
          return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <KpiCardProvenance
                id="pue"
                metric={pueMetric}
                format={(v) => (v as number).toFixed(2)}
                label="PUE"
                unit=""
                grain="Facility"
                window={windowLabel}
                aggregation="Weighted avg"
                source="DCIM · BMS"
                formula="Total facility power / IT equipment power"
                status={pueStatus(pueValue)}
                statusLabel={`Target ≤ ${pueTarget.toFixed(2)}`}
                quality="good"
                change="-2.1%"
                trend="down"
                icon={Zap}
                tooltip="Power Usage Effectiveness over the selected period. Lower is better. Industry avg 1.58 (Uptime Institute 2024)."
                onClick={() => navigate('/data-centre-twin')}
              />
              <KpiCardProvenance
                id="gpu-utilization"
                metric={gpuMetric}
                format={(v) => `${Math.round(v as number)}`}
                label="GPU Utilization"
                unit="%"
                grain="Cluster"
                window={windowLabel}
                aggregation="Avg across selected"
                source="IPMI · Workload scheduler"
                formula="mean(GPU_busy%) over filtered clusters"
                status={gpuStatus(gpuValue)}
                statusLabel="Target 70-90%"
                quality="good"
                change="+5%"
                trend="up"
                icon={Cpu}
                tooltip="Average GPU compute utilization across clusters in scope. Optimal band 70-90% per NVIDIA DGX SuperPOD reference."
                onClick={() => navigate('/data-centre-twin')}
              />
              <KpiCardProvenance
                id="thermal-incidents"
                metric={thermalMetric}
                format={(v) => String(v)}
                label="Thermal Incidents"
                unit="events"
                grain="Event"
                window={windowLabel}
                aggregation="Count"
                source="BMS · Thermal sensors"
                formula="count(threshold_breach) in window"
                status={thermalStatus(thermalValue)}
                statusLabel="Target 0 critical"
                quality="good"
                change="-3"
                trend="down"
                icon={Thermometer}
                tooltip="Active and new thermal threshold breaches in the selected period. ASHRAE A1 envelope 18-27 °C."
                onClick={() => navigate('/data-centre-twin')}
              />
              <KpiCardProvenance
                id="carbon-intensity"
                metric={carbonMetric}
                format={(v) => String(v)}
                label="Carbon Intensity"
                unit="gCO₂/kWh"
                badge={grid.label}
                grain="Grid Region"
                window="Current"
                aggregation="Latest"
                source={grid.source}
                formula="Operational gCO₂eq per kWh at grid region"
                status={carbonStatus(carbonValue)}
                statusLabel={`Target ≤ ${CARBON_INTENSITY_TARGET}`}
                quality="good"
                icon={Flame}
                tooltip="Simulated grid carbon intensity for the selected region. Lower is better. IEA 2024 + electricityMap convention."
              />
              <KpiCardProvenance
                id="sovereignty"
                metric={sovereigntyMetric}
                format={(v) => `${Math.round(v as number)}`}
                label="Sovereignty"
                unit="%"
                grain="Policy"
                window={windowLabel}
                aggregation="Compliant ÷ in-scope"
                source="Policy engine · Workload registry"
                formula="compliant_workloads / in_scope_workloads"
                status={sovereigntyStatus(sovereigntyValue)}
                statusLabel="Target 100%"
                quality="good"
                change="0%"
                trend="neutral"
                icon={Globe}
                tooltip="Share of in-scope workloads meeting data residency and sovereignty policy. CCCS / Bill 25 / GDPR aligned."
                onClick={() => navigate('/compliance')}
              />
              <KpiCardProvenance
                id="uptime"
                metric={uptimeMetric}
                format={(v) => (v as number).toFixed(2)}
                label="System Uptime"
                unit="%"
                grain="Service"
                window={windowLabel}
                aggregation="Uptime ÷ window"
                source="Service monitor · DCIM"
                formula="(window - downtime_minutes) / window"
                status={uptimeStatus(uptimeValue)}
                statusLabel="SLA Tier III 99.982%"
                quality="good"
                change="+0.02%"
                trend="up"
                icon={Activity}
                tooltip="Service availability over the selected period. Tier III SLA 99.982%, Tier IV 99.995% (Uptime Institute Tier Standard)."
              />
            </div>
          );
        })()}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6 min-w-0">
          {/* Horizontal scroll container keeps the six triggers reachable on
              narrow viewports without expanding the document (S6G-02). */}
          <div className="w-full min-w-0 overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="thermal">Thermal Analysis</TabsTrigger>
            <TabsTrigger value="power">Power & Energy</TabsTrigger>
            <TabsTrigger value="workload">GPU & Workload</TabsTrigger>
            <TabsTrigger value="sovereignty">Sovereignty</TabsTrigger>
            <TabsTrigger value="simulation-replay">Simulation Replay</TabsTrigger>
          </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/*
              Overview is structured as a 6-step decision-flow story per Lucas
              feedback. Each numbered band poses an executive question and the
              dashboard answers it with the smallest set of evidence required.
            */}

            {/* Step 1: Are we running efficiently? */}
            <section>
              <StoryStepHeader
                step={1}
                question={t('telemetry.story.step1')}
                description={t('telemetry.story.step1Desc')}
                drillTabLabel={`${t('telemetry.story.drill')} Power & Energy`}
                onDrill={() => {
                  const trigger = document.querySelector<HTMLElement>('[data-state][value="power"], [role="tab"][value="power"]');
                  trigger?.click();
                }}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card data-provenance="demo" data-testid="intelligence-pue-trend-card">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">PUE Trend</CardTitle>
                      <DomainProvenanceHeader
                        provenance={pueChartProvenance.provenance}
                        sourceName={pueChartProvenance.source}
                        description={pueChartProvenance.note}
                        ariaContext="PUE Trend chart data provenance"
                      />
                    </div>
                    <ChartMeta
                      grain="Facility"
                      window={windowLabel}
                      aggregation="Daily weighted avg"
                      source="DCIM · BMS"
                    />
                    <div className="mt-2">
                      <MetricProvenanceManifest
                        domain="intelligence-charts"
                        metrics={INTELLIGENCE_CHART_METRICS}
                        title="Chart series provenance"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={pueChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis domain={[1.1, 1.5]} className="text-xs" />
                        <Tooltip />
                        <ReferenceLine
                          y={pueTarget}
                          stroke="hsl(var(--primary))"
                          strokeDasharray="4 4"
                          label={{ value: `Target ${pueTarget.toFixed(2)}`, position: 'insideTopRight', fontSize: 10 }}
                        />
                        <ReferenceLine
                          y={pueWarning}
                          stroke="hsl(var(--destructive))"
                          strokeDasharray="4 4"
                          label={{ value: `Warning ${pueWarning.toFixed(2)}`, position: 'insideBottomRight', fontSize: 10 }}
                        />
                        <Line type="monotone" dataKey="pue" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card data-provenance="demo" data-testid="intelligence-energy-vs-load-card">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">Power vs IT Load (kW)</CardTitle>
                      <DomainProvenanceHeader
                        provenance={energyChartProvenance.provenance}
                        sourceName={energyChartProvenance.source}
                        description={energyChartProvenance.note}
                        ariaContext="Power vs IT Load chart data provenance"
                      />
                    </div>
                    <ChartMeta
                      grain="Facility"
                      window="Last 24h"
                      aggregation="4-hour interval"
                      source="DCIM"
                    />
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={energyVsLoadData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="hour" className="text-xs" />
                        <YAxis className="text-xs" label={{ value: 'kW', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="energy" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Total facility power" />
                        <Area type="monotone" dataKey="itLoad" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.3} name="IT load" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Step 2: What is driving demand? */}
            <section>
              <StoryStepHeader
                step={2}
                question={t('telemetry.story.step2')}
                description={t('telemetry.story.step2Desc')}
                drillTabLabel={`${t('telemetry.story.drill')} GPU & Workload`}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">GPU Utilization by Zone</CardTitle>
                  <ChartMeta
                    grain="Zone"
                    window={windowLabel}
                    aggregation="Cluster avg"
                    source="IPMI · Scheduler"
                  />
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={gpuUtilData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="zone" className="text-xs" tick={{ fontSize: 11 }} />
                      <YAxis
                        yAxisId="left"
                        className="text-xs"
                        domain={[0, 100]}
                        label={{ value: 'Utilization %', angle: -90, position: 'insideLeft', fontSize: 10 }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        className="text-xs"
                        domain={[15, 35]}
                        label={{ value: '°C', angle: 90, position: 'insideRight', fontSize: 10 }}
                      />
                      <Tooltip />
                      <Legend />
                      <ReferenceArea yAxisId="left" y1={70} y2={90} fill="hsl(var(--primary))" fillOpacity={0.08} label={{ value: 'Recommended 70-90%', fontSize: 10, position: 'insideTopLeft' }} />
                      <Bar yAxisId="left" dataKey="utilization" fill="hsl(var(--primary))" name="Utilization %" />
                      <Bar yAxisId="right" dataKey="temp" fill="hsl(var(--destructive))" name="Inlet °C" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </section>

            {/* Step 3: Is demand creating risk? */}
            <section>
              <StoryStepHeader
                step={3}
                question={t('telemetry.story.step3')}
                description={t('telemetry.story.step3Desc')}
                drillTabLabel={`${t('telemetry.story.drill')} Thermal Analysis`}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Hotspot Zones</CardTitle>
                  <ChartMeta
                    grain="Zone"
                    window="Current"
                    aggregation="Latest inlet temp"
                    source="Thermal sensors"
                  />
                </CardHeader>
                <CardContent>
                  <HotspotZonesList
                    zones={[
                      { zone: 'DGX SuperPOD Row 1', inletTempC: 28.4, events: 1, note: 'High-density cluster' },
                      { zone: 'Hot Aisle B (GPU)', inletTempC: 25.6, events: 3, note: 'GPU exhaust hotspots' },
                      { zone: 'Cold Aisle A1-A4', inletTempC: 21.3, events: 0 },
                      { zone: 'Network/Storage Hall', inletTempC: 22.8, events: 0 },
                    ]}
                  />
                </CardContent>
              </Card>
            </section>

            {/* Step 4: Where should we act first? */}
            <section>
              <StoryStepHeader
                step={4}
                question={t('telemetry.story.step4')}
                description={t('telemetry.story.step4Desc')}
                drillTabLabel="Open AOC"
                onDrill={() => navigate('/aoc')}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Active Events</CardTitle>
                  <ChartMeta
                    grain="Event"
                    window={windowLabel}
                    aggregation="Sorted by severity, then age"
                    source="Incident registry"
                  />
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="py-2 pr-3 font-medium">Zone</th>
                          <th className="py-2 pr-3 font-medium">Severity</th>
                          <th className="py-2 pr-3 font-medium">Age</th>
                          <th className="py-2 pr-3 font-medium">Owner</th>
                          <th className="py-2 pr-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id: 'evt-1', zone: 'DGX SuperPOD Row 1', severity: 'critical', age: '12 min', owner: 'NOC' },
                          { id: 'evt-2', zone: 'Hot Aisle B (GPU)', severity: 'warning', age: '47 min', owner: 'Thermal' },
                          { id: 'evt-3', zone: 'CRAH-04 inlet', severity: 'warning', age: '2 h', owner: 'Cooling' },
                        ].map((e) => (
                          <tr key={e.id} className="border-b border-border/50">
                            <td className="py-2 pr-3 font-medium">{e.zone}</td>
                            <td className="py-2 pr-3">
                              <Badge variant={e.severity === 'critical' ? 'destructive' : 'default'} className="capitalize">
                                {e.severity}
                              </Badge>
                            </td>
                            <td className="py-2 pr-3 text-muted-foreground">{e.age}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{e.owner}</td>
                            <td className="py-2 pr-3 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/aoc?incident=${e.id}`)}
                              >
                                Open
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Step 5: Can we trust the data? */}
            <section>
              <StoryStepHeader
                step={5}
                question={t('telemetry.story.step5')}
                description={t('telemetry.story.step5Desc')}
                drillTabLabel="Connect Health"
                onDrill={() => navigate('/connect/health')}
              />
              <DataTrustStrip state={dataTrust} />
            </section>

            {/* Step 6: Are we compliant and sustainable? */}
            <section>
              <StoryStepHeader
                step={6}
                question={t('telemetry.story.step6')}
                description={t('telemetry.story.step6Desc')}
                drillTabLabel={`${t('telemetry.story.drill')} Sovereignty`}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sovereignty Coverage</CardTitle>
                    <ChartMeta
                      grain="Policy"
                      window={windowLabel}
                      aggregation="Compliant ÷ in-scope"
                      source="Policy engine"
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-foreground mb-1">
                      {Math.round(simulationKpis[KPIKey.SOVEREIGN_COMPLIANCE] ?? 98)}%
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Workloads meeting data residency policy. Exceptions: 2 (under review).
                    </p>
                    <Button variant="outline" size="sm" onClick={() => navigate('/compliance')}>
                      View exceptions
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Carbon Intensity</CardTitle>
                    <ChartMeta
                      grain="Grid Region"
                      window="Current"
                      aggregation="Latest"
                      source={grid.source}
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-foreground">{grid.intensity}</span>
                      <span className="text-sm text-muted-foreground">gCO₂/kWh</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/15 text-accent-foreground border border-accent/30">
                        {grid.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Target ≤ {CARBON_INTENSITY_TARGET} gCO₂/kWh. Quebec hydro grid is among the lowest carbon globally.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>
          </TabsContent>

          {/* Thermal Tab */}
          <TabsContent value="thermal" className="space-y-6">
            <Card className="p-8 text-center">
              <Thermometer className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Thermal Analysis</h3>
              <p className="text-muted-foreground">
                Detailed thermal zone analysis and heatmaps available in the Data Centre Twin Dashboard.
              </p>
              <Button className="mt-4" onClick={() => navigate('/data-centre-twin')}>
                Open DC Twin Dashboard
              </Button>
            </Card>
          </TabsContent>

          {/* Power Tab */}
          <TabsContent value="power" className="space-y-6">
            <Card className="p-8 text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Power & Energy Analytics</h3>
              <p className="text-muted-foreground">
                Detailed power topology and UPS monitoring available in the Data Centre Twin Dashboard.
              </p>
              <Button className="mt-4" onClick={() => navigate('/data-centre-twin')}>
                Open DC Twin Dashboard
              </Button>
            </Card>
          </TabsContent>

          {/* Workload Tab */}
          <TabsContent value="workload" className="space-y-6">
            <Card className="p-8 text-center">
              <Cpu className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">GPU & Workload Analytics</h3>
              <p className="text-muted-foreground">
                Detailed workload scheduling and GPU utilization available in the Data Centre Twin Dashboard.
              </p>
              <Button className="mt-4" onClick={() => navigate('/data-centre-twin')}>
                Open DC Twin Dashboard
              </Button>
            </Card>
          </TabsContent>

          {/* Sovereignty Tab */}
          <TabsContent value="sovereignty" className="space-y-6">
            <SovereigntyAnalyticsTab />
          </TabsContent>

          {/* Simulation Replay Tab */}
          <TabsContent value="simulation-replay" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Recent Simulation Runs</h3>
                <p className="text-sm text-muted-foreground">
                  {scenarioCount} scenarios available from Blueprint
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/data-centre-twin?view=simulation')}>
                <Activity className="h-4 w-4 mr-2" />
                Run New Simulation
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Simulation History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Scenario Name</th>
                        <th className="text-left py-3 px-4 font-medium">Run Time</th>
                        <th className="text-left py-3 px-4 font-medium">Duration</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Triggered By</th>
                        <th className="text-right py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: 'run-001', scenario: 'GPU Spike - Training Job', time: '2 hours ago', duration: '5m 12s', status: 'completed', triggeredBy: 'Manual' },
                        { id: 'run-002', scenario: 'CRAH Failure - Hot Aisle', time: '5 hours ago', duration: '6m 45s', status: 'completed', triggeredBy: 'Scheduled' },
                        { id: 'run-003', scenario: 'UPS Battery Degradation', time: '1 day ago', duration: '4m 30s', status: 'completed', triggeredBy: 'Manual' },
                        { id: 'run-004', scenario: 'Cross-Border Data Violation', time: '2 days ago', duration: '3m 15s', status: 'completed', triggeredBy: 'Alert Trigger' },
                        { id: 'run-005', scenario: 'Grid Outage - Generator Failover', time: '3 days ago', duration: '7m 00s', status: 'completed', triggeredBy: 'Scheduled' },
                      ].map((run) => (
                        <tr key={run.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4 font-medium">{run.scenario}</td>
                          <td className="py-3 px-4 text-muted-foreground">{run.time}</td>
                          <td className="py-3 px-4 font-mono text-muted-foreground">{run.duration}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {run.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{run.triggeredBy}</td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/data-centre-twin?view=simulation&runId=${run.id}`)}
                            >
                              Open in Simulation
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
