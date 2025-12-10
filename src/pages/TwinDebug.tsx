/**
 * TwinDebug - Debug View for Multi-Tenant Twin System
 * Shows current twinId, queries, telemetry sources, and errors
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Bug, 
  Database, 
  Activity, 
  AlertTriangle, 
  RefreshCw,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { useTwinContext } from '@/contexts/TwinContext';
import { 
  useTwinTelemetry, 
  useTwinKPIs, 
  useTwinSimulations,
  useTwinAgents,
  useTwinSovereigntyEvents,
  useTwinCarbonEmissions,
  useTwinFinancials
} from '@/hooks/useTwinData';
import { getRegionByCode } from '@/data/regions';
import { useToast } from '@/hooks/use-toast';

interface QueryLog {
  id: string;
  timestamp: Date;
  table: string;
  twinId: string | null;
  status: 'success' | 'error' | 'pending';
  duration?: number;
  error?: string;
}

export default function TwinDebug() {
  const { twinId, twin, twins, refreshTwins } = useTwinContext();
  const { toast } = useToast();
  const [queryLogs, setQueryLogs] = useState<QueryLog[]>([]);

  // Fetch all twin-scoped data for testing
  const telemetry = useTwinTelemetry();
  const kpis = useTwinKPIs();
  const simulations = useTwinSimulations();
  const agents = useTwinAgents();
  const sovereignty = useTwinSovereigntyEvents({ limit: 50 });
  const carbon = useTwinCarbonEmissions({ days: 30 });
  const financials = useTwinFinancials({ days: 30 });

  // Log query status
  useEffect(() => {
    const newLogs: QueryLog[] = [
      { id: 'telemetry', timestamp: new Date(), table: 'twin_telemetry', twinId, status: telemetry.isLoading ? 'pending' : telemetry.error ? 'error' : 'success', error: telemetry.error?.message },
      { id: 'kpis', timestamp: new Date(), table: 'twin_kpi_snapshots', twinId, status: kpis.isLoading ? 'pending' : kpis.error ? 'error' : 'success', error: kpis.error?.message },
      { id: 'simulations', timestamp: new Date(), table: 'twin_simulation_runs', twinId, status: simulations.isLoading ? 'pending' : simulations.error ? 'error' : 'success', error: simulations.error?.message },
      { id: 'agents', timestamp: new Date(), table: 'agent_definitions', twinId, status: agents.isLoading ? 'pending' : agents.error ? 'error' : 'success', error: agents.error?.message },
      { id: 'sovereignty', timestamp: new Date(), table: 'twin_sovereignty_events', twinId, status: sovereignty.isLoading ? 'pending' : sovereignty.error ? 'error' : 'success', error: sovereignty.error?.message },
      { id: 'carbon', timestamp: new Date(), table: 'twin_carbon_emissions', twinId, status: carbon.isLoading ? 'pending' : carbon.error ? 'error' : 'success', error: carbon.error?.message },
      { id: 'financials', timestamp: new Date(), table: 'twin_financial_records', twinId, status: financials.isLoading ? 'pending' : financials.error ? 'error' : 'success', error: financials.error?.message },
    ];
    setQueryLogs(newLogs);
  }, [telemetry.status, kpis.status, simulations.status, agents.status, sovereignty.status, carbon.status, financials.status, twinId]);

  const region = twin ? getRegionByCode(twin.region_code) : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const getStatusBadge = (status: QueryLog['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bug className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Twin Debug Console</h1>
            <p className="text-muted-foreground">Multi-tenant isolation debugging</p>
          </div>
        </div>
        <Button onClick={() => refreshTwins()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Current Twin Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Current Twin Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Twin ID</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                  {twinId || 'null'}
                </code>
                {twinId && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(twinId)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Twin Name</p>
              <p className="font-medium">{twin?.name || 'Not selected'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Region</p>
              <p className="font-medium">{twin?.region_code || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Twins</p>
              <p className="font-medium">{twins.length}</p>
            </div>
          </div>

          {twin && region && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Region Profile</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Carbon Intensity</p>
                  <p>{region.carbon_intensity} gCO₂/kWh</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Default PUE</p>
                  <p>{region.default_pue}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cost/kWh</p>
                  <p>${region.cost_per_kwh} CAD</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Provider</p>
                  <Badge variant="outline">{region.provider.toUpperCase()}</Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="queries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queries">Query Status</TabsTrigger>
          <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="twins">All Twins</TabsTrigger>
        </TabsList>

        <TabsContent value="queries">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Query Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Twin ID Filter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queryLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">{log.table}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.twinId ? log.twinId.substring(0, 8) + '...' : 'null'}
                        </code>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-destructive text-sm">
                        {log.error || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="telemetry">
          <Card>
            <CardHeader>
              <CardTitle>Telemetry Sources ({telemetry.data?.length || 0} records)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {telemetry.data && telemetry.data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead>Metric</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Recorded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {telemetry.data.slice(0, 50).map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell>
                            <Badge variant="outline">{t.domain}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{t.metric_key}</TableCell>
                          <TableCell>{t.metric_value}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(t.recorded_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No telemetry data for this twin yet.
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Errors & Warnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {queryLogs.filter(l => l.status === 'error').length > 0 ? (
                <div className="space-y-2">
                  {queryLogs.filter(l => l.status === 'error').map((log) => (
                    <div key={log.id} className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                      <p className="font-medium">{log.table}</p>
                      <p className="text-sm text-destructive">{log.error}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">No errors detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="twins">
          <Card>
            <CardHeader>
              <CardTitle>All User Twins ({twins.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {twins.map((t) => (
                    <TableRow key={t.id} className={t.id === twinId ? 'bg-primary/10' : ''}>
                      <TableCell>
                        <code className="text-xs">{t.id.substring(0, 8)}...</code>
                      </TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.city}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.region_code}</Badge>
                      </TableCell>
                      <TableCell>{t.tier}</TableCell>
                      <TableCell>{t.capacity_kw} kW</TableCell>
                      <TableCell>
                        {t.id === twinId && (
                          <Badge variant="default">Current</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
