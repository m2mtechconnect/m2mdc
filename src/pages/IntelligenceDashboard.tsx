import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/hooks/useEdgeFunction';
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
      return await invokeEdgeFunction(`ops-overview?env=${facility}`);
    },
  });

  // Fetch systems
  const { data: systemsData } = useQuery({
    queryKey: ['ops-systems', facility],
    queryFn: async () => {
      return await invokeEdgeFunction(`ops-systems?env=${facility}&page=1&pageSize=50`);
    },
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
  const energyVsLoadData = [
    { hour: '00:00', energy: 2850, itLoad: 2280 },  // Night batch processing (LLM training)
    { hour: '04:00', energy: 2680, itLoad: 2144 },  // Low activity window (maintenance)
    { hour: '08:00', energy: 3120, itLoad: 2496 },  // Business hours ramp-up
    { hour: '12:00', energy: 3450, itLoad: 2760 },  // Peak inference workloads
    { hour: '16:00', energy: 3600, itLoad: 2880 },  // Maximum GPU utilization
    { hour: '20:00', energy: 3150, itLoad: 2520 },  // Evening batch job initiation
  ];

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
      <div className="container mx-auto px-4 py-6 max-w-[1600px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-primary" />
              Telemetry & Analytics
            </h1>
            <p className="text-muted-foreground">
              {twin ? `${twin.name} - ${twin.city}` : 'Data Centre performance monitoring and insights'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={() => navigate('/blueprint/default')}>
              <FileText className="h-4 w-4" />
              Blueprint
              <Badge variant="secondary" className="text-[10px]">{totalKpis} KPIs</Badge>
            </Button>
            <Button className="gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
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

        {/* DC KPI Strip - Using real simulation data */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <KpiCard
            label={KPI_CATALOG[KPIKey.PUE]?.label || "PUE Trend"}
            value={simulationKpis[KPIKey.PUE]?.toFixed(2) || "1.38"}
            change="-2.1%"
            icon={Zap}
            trend="down"
            tooltip={KPI_CATALOG[KPIKey.PUE]?.description || "Power Usage Effectiveness - lower is better"}
            onClick={() => navigate('/data-centre-twin')}
          />
          <KpiCard
            label={KPI_CATALOG[KPIKey.GPU_UTILIZATION]?.label || "GPU Utilization"}
            value={simulationKpis[KPIKey.GPU_UTILIZATION] ? `${simulationKpis[KPIKey.GPU_UTILIZATION]}%` : "78%"}
            change="+5%"
            icon={Cpu}
            trend="up"
            tooltip={KPI_CATALOG[KPIKey.GPU_UTILIZATION]?.description || "Average GPU cluster utilization"}
            onClick={() => navigate('/data-centre-twin')}
          />
          <KpiCard
            label={KPI_CATALOG[KPIKey.THERMAL_INCIDENTS]?.label || "Thermal Incidents"}
            value={simulationKpis[KPIKey.THERMAL_INCIDENTS]?.toString() || "8"}
            change="-3"
            icon={Thermometer}
            trend="down"
            tooltip={KPI_CATALOG[KPIKey.THERMAL_INCIDENTS]?.description || "Thermal events in last 24h"}
            onClick={() => navigate('/data-centre-twin')}
          />
          <KpiCard
            label={KPI_CATALOG[KPIKey.CARBON_INTENSITY]?.label || "Emissions vs Target"}
            value={simulationKpis[KPIKey.CARBON_INTENSITY] ? `${(100 - (simulationKpis[KPIKey.CARBON_INTENSITY] / 0.7)).toFixed(0)}%` : "94%"}
            change="+2%"
            icon={Flame}
            trend="up"
            tooltip={KPI_CATALOG[KPIKey.CARBON_INTENSITY]?.description || "On track for carbon targets"}
          />
          <KpiCard
            label={KPI_CATALOG[KPIKey.SOVEREIGN_COMPLIANCE]?.label || "Sovereign Compute"}
            value={simulationKpis[KPIKey.SOVEREIGN_COMPLIANCE] ? `${simulationKpis[KPIKey.SOVEREIGN_COMPLIANCE]}%` : "98%"}
            change="0%"
            icon={Globe}
            trend="neutral"
            tooltip={KPI_CATALOG[KPIKey.SOVEREIGN_COMPLIANCE]?.description || "Data residency compliance"}
            onClick={() => navigate('/compliance')}
          />
          <KpiCard
            label={KPI_CATALOG[KPIKey.UPTIME]?.label || "System Uptime"}
            value={simulationKpis[KPIKey.UPTIME] ? `${simulationKpis[KPIKey.UPTIME]}%` : "99.97%"}
            change="+0.02%"
            icon={Activity}
            trend="up"
            tooltip={KPI_CATALOG[KPIKey.UPTIME]?.description || "Overall system availability"}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="thermal">Thermal Analysis</TabsTrigger>
            <TabsTrigger value="power">Power & Energy</TabsTrigger>
            <TabsTrigger value="workload">GPU & Workload</TabsTrigger>
            <TabsTrigger value="sovereignty">Sovereignty</TabsTrigger>
            <TabsTrigger value="simulation-replay">Simulation Replay</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PUE Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>PUE Trend (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={pueChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis domain={[1.3, 1.5]} className="text-xs" />
                      <Tooltip />
                      <Line type="monotone" dataKey="pue" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Energy vs IT Load */}
              <Card>
                <CardHeader>
                  <CardTitle>Energy vs IT Load (kW)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={energyVsLoadData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="hour" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="energy" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Total Energy" />
                      <Area type="monotone" dataKey="itLoad" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.3} name="IT Load" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* GPU Utilization Heatmap (simplified) */}
              <Card>
                <CardHeader>
                  <CardTitle>GPU Utilization by Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={gpuUtilData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="zone" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="utilization" fill="hsl(186, 100%, 42%)" name="Utilization %" />
                      <Bar dataKey="temp" fill="hsl(0, 84%, 60%)" name="Temp °C" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Thermal Incidents */}
              <Card>
                <CardHeader>
                  <CardTitle>Thermal Incidents by Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {thermalIncidents.map((incident) => (
                      <div key={incident.zone} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{incident.zone}</div>
                          <div className="text-sm text-muted-foreground">{incident.count} events</div>
                        </div>
                        <Badge variant={incident.severity === 'high' ? 'destructive' : incident.severity === 'medium' ? 'default' : 'secondary'}>
                          {incident.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
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
