/**
 * Blueprint Data Tab - Data sources and integrations
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Plug, 
  CheckCircle2, 
  XCircle,
  Clock,
  Shield
} from 'lucide-react';
import type { DataSourceBlueprint, IntegrationBlueprint } from '@/types/dataCentreBlueprint';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface BlueprintDataTabProps {
  dataSources: DataSourceBlueprint[];
  integrations: IntegrationBlueprint[];
}

const criticalityColors: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-600 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/40',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  low: 'bg-green-500/10 text-green-600 border-green-500/30',
};

export function BlueprintDataTab({ dataSources, integrations }: BlueprintDataTabProps) {
  // Group data sources by domain
  const sourcesByDomain = dataSources.reduce((acc, source) => {
    const domain = source.domain;
    if (!acc[domain]) {
      acc[domain] = [];
    }
    acc[domain].push(source);
    return acc;
  }, {} as Record<string, DataSourceBlueprint[]>);

  return (
    <div className="space-y-6">
      {/*
        Stage 7E: Blueprint shows read-only readiness only. Credentials,
        schedules and connection setup are owned by Manage > Integrations.
      */}
      <Card data-testid="blueprint-integration-summary">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="h-4 w-4" aria-hidden />
            Data sources and readiness
          </CardTitle>
          <CardDescription>
            Read-only status. Connection configuration lives in Integrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: 'Facility telemetry', value: 'Not connected' },
            { label: 'NVIDIA runtime', value: 'Not available' },
            { label: 'OpenUSD stage', value: 'Not validated' },
            { label: 'SimReady assets', value: '0 validated' },
          ].map((row) => (
            <div
              key={row.label}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <span className="text-sm text-foreground">{row.label}</span>
              <Badge variant="outline" className="text-[11px]">{row.value}</Badge>
            </div>
          ))}
          <Button asChild variant="outline" size="sm">
            <Link to="/manage/integrations">Manage integrations</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Data Sources ({dataSources.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Update Frequency</TableHead>
                <TableHead>Criticality</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataSources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>
                    <p className="font-medium">{source.name}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{source.domain}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{source.sourceType}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">{source.protocol}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {source.updateFrequency}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={criticalityColors[source.criticality] || ''}>
                      {source.criticality}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="h-4 w-4" />
            Integrations ({integrations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Integration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auth Method</TableHead>
                <TableHead>Domains</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.map((integration) => (
                <TableRow key={integration.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{integration.name}</p>
                      <p className="text-xs text-muted-foreground">{integration.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {integration.status === 'connected' ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Connected</span>
                        </>
                      ) : integration.status === 'pending' ? (
                        <>
                          <Clock className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-yellow-600">Pending</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-600">Inactive</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{integration.authMethod}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {integration.domainsUsedBy.map((domain, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs capitalize">
                          {domain}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Domain Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Sources by Domain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(sourcesByDomain).map(([domain, sources]) => (
              <div key={domain} className="p-4 rounded-lg border bg-muted/30">
                <p className="font-medium capitalize mb-2">{domain}</p>
                <div className="space-y-1">
                  {sources.map((source) => (
                    <p key={source.id} className="text-xs text-muted-foreground">
                      • {source.name}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
