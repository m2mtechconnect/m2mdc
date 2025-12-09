import { useQuery } from '@tanstack/react-query';
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
} from "lucide-react";
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, LineChart, Bar, BarChart, Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import KpiCard from '@/components/shared/KpiCard';
import DataTable, { Column } from '@/components/shared/DataTable';

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
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('7');
  const [department, setDepartment] = useState('all');
  const [aiType, setAiType] = useState('all');
  const [environment, setEnvironment] = useState('all');
  const [industry, setIndustry] = useState('all');

  // Use real KPI hooks (shared with main Dashboard)
  // These provide consistent analytics data across both dashboards
  // Data sources: roi_snapshots, agent_runs, agents tables via RPC functions
  const roiKpi = useKpi('roi_growth');
  const timeSavedKpi = useKpi('time_saved');
  const complianceKpi = useKpi('compliance_accuracy');
  const agentsKpi = useKpi('agents_deployed');

  // Fetch operations overview
  const { data: opsOverview } = useQuery({
    queryKey: ['ops-overview', environment],
    queryFn: async () => {
      return await invokeEdgeFunction(`ops-overview?env=${environment}`);
    },
  });

  // Fetch systems
  const { data: systemsData } = useQuery({
    queryKey: ['ops-systems', environment],
    queryFn: async () => {
      return await invokeEdgeFunction(`ops-systems?env=${environment}&page=1&pageSize=50`);
    },
  });

  // Fetch events
  const { data: eventsData } = useQuery({
    queryKey: ['ops-events', environment],
    queryFn: async () => {
      return await invokeEdgeFunction(`ops-events?env=${environment}&page=1&pageSize=20`);
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
        roi: Math.floor(Math.random() * 400) + 100, // Mock ROI for table display
        accuracy: Math.floor(Math.random() * 20) + 80, // Mock accuracy
        total_runs: Math.floor(Math.random() * 10000), // Mock runs
        last_updated: new Date().toISOString(),
        tags: [config?.department || 'General', sys.environment, sys.status]
      };
    });
  }, [systemsData, allAgents]);

  // Global KPIs - Use real data from useKpi hooks
  const globalKpis = {
    activeTwins: Math.floor(agentsKpi.value * 0.4), // Estimate 40% are twins
    activeAgents: Math.ceil(agentsKpi.value * 0.6), // Estimate 60% are agents
    connectedSystems: agentsKpi.value,
    workflowsExecuted24h: Math.floor(systems.reduce((sum, s) => sum + (s.total_runs || 0), 0) / 30),
    workflowsExecuted30d: systems.reduce((sum, s) => sum + (s.total_runs || 0), 0),
    avgLatency: opsOverview?.data?.avg_latency_ms || 0,
    uptime: opsOverview?.data?.uptime_pct || 0,
    errorRate: opsOverview?.data?.errors_24h || 0,
    timeSaved: timeSavedKpi.value,
    complianceAccuracy: complianceKpi.value,
    roiGrowth: roiKpi.value,
  };

  // Mock chart data
  const roiChartData = [
    { date: 'W1', roi: 120 },
    { date: 'W2', roi: 145 },
    { date: 'W3', roi: 180 },
    { date: 'W4', roi: 220 },
    { date: 'W5', roi: 287 },
  ];

  const latencyTrendData = [
    { time: '00:00', latency: 120 },
    { time: '04:00', latency: 95 },
    { time: '08:00', latency: 180 },
    { time: '12:00', latency: 210 },
    { time: '16:00', latency: 165 },
    { time: '20:00', latency: 140 },
  ];

  const workflowVolumeData = [
    { hour: '00:00', volume: 120, success: 118 },
    { hour: '04:00', volume: 85, success: 83 },
    { hour: '08:00', volume: 250, success: 245 },
    { hour: '12:00', volume: 380, success: 372 },
    { hour: '16:00', volume: 420, success: 410 },
    { hour: '20:00', volume: 290, success: 285 },
  ];

  const systemColumns: Column<System>[] = [
    { 
      key: 'name', 
      label: 'System / Twin / Agent', 
      render: (item) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">ID: {item.id.slice(0, 8)}</div>
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      render: (item) => (
        <Badge variant={item.status === 'running' ? 'default' : 'secondary'}>
          {item.status}
        </Badge>
      )
    },
    { key: 'roi', label: 'ROI %', render: (item) => <span className="font-mono font-bold text-primary">{item.roi}%</span> },
    { key: 'accuracy', label: 'Accuracy', render: (item) => <span className="font-mono">{item.accuracy}%</span> },
    { key: 'total_runs', label: 'Total Runs', render: (item) => <span className="font-mono">{item.total_runs?.toLocaleString()}</span> },
    { key: 'latency', label: 'Avg Latency', render: (item) => <span className="font-mono text-secondary">{item.latency}</span> },
    { key: 'throughput', label: 'Throughput', render: (item) => <span className="font-mono">{item.throughput}</span> },
    { 
      key: 'tags', 
      label: 'Tags', 
      render: (item) => (
        <div className="flex gap-1 flex-wrap">
          {item.tags?.slice(0, 2).map((tag, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )
    },
  ];

  const events = eventsData?.events || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-[1600px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-display font-bold mb-2 text-gradient-hero">
              AI Systems Intelligence Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Unified monitoring for Digital Twins, Agents, and Automation Systems
            </p>
          </div>
          <Button className="gap-2 glow-yellow">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Intelligence Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24h</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="supply_chain">Supply Chain</SelectItem>
                </SelectContent>
              </Select>

              <Select value={aiType} onValueChange={setAiType}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="AI Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="process_twin">Process Twin</SelectItem>
                  <SelectItem value="3d_twin">3D Twin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Envs</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="dev">Development</SelectItem>
                </SelectContent>
              </Select>

              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Global KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-5 gap-4 mb-6">
          <KpiCard
            label="Active Digital Twins"
            value={globalKpis.activeTwins.toString()}
            icon={Database}
            trend="up"
            tooltip="Number of digital twins currently deployed and running in your environment."
            onClick={() => navigate('/twins')}
          />
          <KpiCard
            label="Active Agents"
            value={globalKpis.activeAgents.toString()}
            icon={Zap}
            trend="up"
            tooltip="AI agents that are currently enabled and may be processing tasks or workflows."
            onClick={() => navigate('/agents')}
          />
          <KpiCard
            label="Connected Systems"
            value={globalKpis.connectedSystems.toString()}
            icon={Activity}
            trend="neutral"
            tooltip="Number of integrations connected to your agents/twins — e.g., databases, apps, CRMs, APIs."
            onClick={() => navigate('/connect')}
          />
          <KpiCard
            label="Workflows (24h)"
            value={globalKpis.workflowsExecuted24h.toLocaleString()}
            subtext={`${globalKpis.workflowsExecuted30d.toLocaleString()} in 30d`}
            icon={TrendingUp}
            trend="up"
            tooltip="Total automated workflows triggered by your agents/twins in the past 24 hours."
          />
          <KpiCard
            label="Avg Latency"
            value={`${globalKpis.avgLatency}ms`}
            icon={Clock}
            trend="neutral"
            tooltip="Average time (in milliseconds) your agents/twins take to respond to a request."
          />
          <KpiCard
            label="Uptime"
            value={`${globalKpis.uptime}%`}
            icon={CheckCircle2}
            trend="up"
            tooltip="Percentage of time your systems remained online and operational."
          />
          <KpiCard
            label="Error Rate (24h)"
            value={globalKpis.errorRate.toString()}
            icon={AlertCircle}
            trend="down"
            tooltip="Number of failed workflows, errors, or exceptions detected in the last 24 hours."
          />
          <KpiCard
            label="Time Saved"
            value={`${globalKpis.timeSaved}h`}
            subtext="this period"
            icon={Clock}
            trend="up"
            tooltip="Estimated employee hours saved through automation during this period."
          />
          <KpiCard
            label="Compliance Accuracy"
            value={`${globalKpis.complianceAccuracy}%`}
            icon={Target}
            trend="up"
            tooltip="How accurately your agents followed compliance rules, policies, or instructions."
          />
          <KpiCard
            label="ROI Growth"
            value={`${globalKpis.roiGrowth}%`}
            icon={TrendingUp}
            trend="up"
            tooltip="Change in return on investment based on cost reduction, time savings, or efficiency gains."
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">System Performance</TabsTrigger>
            <TabsTrigger value="monitoring">Real-Time Monitoring</TabsTrigger>
            <TabsTrigger value="templates">Templates Insight</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Graph Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ROI Growth Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>ROI Growth Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={roiChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Line type="monotone" dataKey="roi" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Latency Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Latency Trend (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={latencyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Area type="monotone" dataKey="latency" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Workflow Volume & Success Rate */}
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Volume & Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={workflowVolumeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="hour" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="volume" fill="hsl(var(--primary))" name="Total" />
                      <Bar dataKey="success" fill="hsl(var(--secondary))" name="Success" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Throughput Gauge */}
              <Card>
                <CardHeader>
                  <CardTitle>System Throughput</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-[250px]">
                    <div className="text-center">
                      <div className="text-6xl font-display font-bold text-primary mb-2">
                        {opsOverview?.data?.total_rpm || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Requests per Minute</div>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: '75%' }} />
                        </div>
                        <span className="text-xs text-muted-foreground">75% capacity</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {events.length > 0 ? (
                    events.map((event: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="mt-1">
                          {event.type === 'error' ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-secondary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{event.message || 'System event'}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {event.system_id} • {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent activity
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Performance Tab */}
          <TabsContent value="performance">
            <DataTable
              title="System Performance"
              columns={systemColumns}
              data={systems}
              emptyMessage="No systems found"
            />
          </TabsContent>

          {/* Real-Time Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Uptime</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-5xl font-display font-bold text-secondary mb-2">
                      {globalKpis.uptime}%
                    </div>
                    <div className="text-sm text-muted-foreground">Last 30 days</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Systems</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-5xl font-display font-bold text-primary mb-2">
                      {systems.filter(s => s.status === 'running').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Running now</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Critical Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-5xl font-display font-bold text-destructive mb-2">
                      {globalKpis.errorRate}
                    </div>
                    <div className="text-sm text-muted-foreground">Last 24h</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Health Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systems.slice(0, 10).map((system) => (
                    <div key={system.id} className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className={`h-3 w-3 rounded-full ${
                          system.status === 'running' ? 'bg-secondary animate-pulse' : 'bg-muted'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{system.name}</div>
                        <div className="text-xs text-muted-foreground">{system.environment}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono">{system.latency}</div>
                        <div className="text-xs text-muted-foreground">{system.throughput}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Insight Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top-Performing Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'Inventory Forecasting Twin', roi: 340, runs: 2847 },
                      { name: 'Compliance Automation Agent', roi: 295, runs: 1923 },
                      { name: 'Supply Chain Optimizer', roi: 280, runs: 1654 },
                    ].map((template, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-xs text-muted-foreground">{template.runs.toLocaleString()} runs</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">{template.roi}% ROI</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recommended Template Upgrades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { system: 'Old Compliance System', suggestion: 'Upgrade to AI-powered agent', impact: '+145% ROI' },
                      { system: 'Manual Inventory Tracking', suggestion: 'Deploy Digital Twin', impact: '+220% efficiency' },
                    ].map((rec, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                        <div className="font-medium mb-1">{rec.system}</div>
                        <div className="text-sm text-muted-foreground mb-2">{rec.suggestion}</div>
                        <div className="text-sm font-semibold text-secondary">{rec.impact}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
