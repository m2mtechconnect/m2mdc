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
  BarChart3,
  Thermometer,
  Cpu,
  Globe,
  Flame,
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
  const [facility, setFacility] = useState('all');
  const [subsystem, setSubsystem] = useState('all');
  const [region, setRegion] = useState('all');

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

  // DC-specific mock chart data
  const pueChartData = [
    { date: 'Mon', pue: 1.42 },
    { date: 'Tue', pue: 1.40 },
    { date: 'Wed', pue: 1.39 },
    { date: 'Thu', pue: 1.41 },
    { date: 'Fri', pue: 1.38 },
    { date: 'Sat', pue: 1.37 },
    { date: 'Sun', pue: 1.38 },
  ];

  const energyVsLoadData = [
    { hour: '00:00', energy: 850, itLoad: 620 },
    { hour: '04:00', energy: 780, itLoad: 580 },
    { hour: '08:00', energy: 920, itLoad: 700 },
    { hour: '12:00', energy: 1050, itLoad: 780 },
    { hour: '16:00', energy: 1100, itLoad: 820 },
    { hour: '20:00', energy: 950, itLoad: 720 },
  ];

  const gpuUtilData = [
    { zone: 'Zone A', utilization: 85, temp: 72 },
    { zone: 'Zone B', utilization: 72, temp: 68 },
    { zone: 'Zone C', utilization: 91, temp: 76 },
    { zone: 'Zone D', utilization: 65, temp: 64 },
  ];

  const thermalIncidents = [
    { zone: 'Cold Aisle 1', count: 2, severity: 'low' },
    { zone: 'Hot Aisle 2', count: 5, severity: 'medium' },
    { zone: 'GPU Cluster A', count: 1, severity: 'high' },
    { zone: 'Network Room', count: 0, severity: 'low' },
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
            <p className="text-muted-foreground">Data Centre performance monitoring and insights</p>
          </div>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
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
                  <SelectItem value="1">Last 24h</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={facility} onValueChange={setFacility}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Facility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Facilities</SelectItem>
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

        {/* DC KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <KpiCard
            label="PUE Trend"
            value="1.38"
            change="-2.1%"
            icon={Zap}
            trend="down"
            tooltip="Power Usage Effectiveness - lower is better"
            onClick={() => navigate('/data-centre-twin')}
          />
          <KpiCard
            label="GPU Utilization"
            value="78%"
            change="+5%"
            icon={Cpu}
            trend="up"
            tooltip="Average GPU cluster utilization"
            onClick={() => navigate('/data-centre-twin')}
          />
          <KpiCard
            label="Thermal Incidents"
            value="8"
            change="-3"
            icon={Thermometer}
            trend="down"
            tooltip="Thermal events in last 24h"
            onClick={() => navigate('/data-centre-twin')}
          />
          <KpiCard
            label="Emissions vs Target"
            value="94%"
            change="+2%"
            icon={Flame}
            trend="up"
            tooltip="On track for carbon targets"
          />
          <KpiCard
            label="Sovereign Compute"
            value="98%"
            change="0%"
            icon={Globe}
            trend="neutral"
            tooltip="Data residency compliance"
            onClick={() => navigate('/compliance')}
          />
          <KpiCard
            label="System Uptime"
            value="99.97%"
            change="+0.02%"
            icon={Activity}
            trend="up"
            tooltip="Overall system availability"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="thermal">Thermal Analysis</TabsTrigger>
            <TabsTrigger value="power">Power & Energy</TabsTrigger>
            <TabsTrigger value="workload">GPU & Workload</TabsTrigger>
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
                      <Bar dataKey="utilization" fill="hsl(262, 83%, 58%)" name="Utilization %" />
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
        </Tabs>
      </div>
    </div>
  );
}
