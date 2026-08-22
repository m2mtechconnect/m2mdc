/**
 * Contextual source and design-import reference for Blueprint Assets & Systems.
 *
 * Operational source configuration lives in Manage → Connections. Design-time
 * CAD/BIM acquisition belongs here in Blueprint, but the current repository
 * does not have native PLM/CAD or BIM/IFC runtime adapters. The UI therefore
 * states readiness truthfully instead of exposing a non-functional uploader.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Cable, FileUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Canonical Manage destination for operational sources and connectors. */
export const MANAGE_INTEGRATIONS_ROUTE = '/manage/integrations';

interface AssetConnectivitySummaryProps {
  dataSourceCount: number;
  integrationCount: number;
}

const DESIGN_IMPORTS = [
  {
    name: 'PLM / CAD import',
    status: 'Planned',
    detail: 'No native runtime adapter is implemented, so CAD files cannot be imported through AURA yet.',
  },
  {
    name: 'BIM / IFC import',
    status: 'Planned',
    detail: 'No native runtime adapter is implemented, so IFC/BIM files cannot be imported through AURA yet.',
  },
] as const;

export function AssetConnectivitySummary({
  dataSourceCount,
  integrationCount,
}: AssetConnectivitySummaryProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card data-testid="asset-connectivity-summary">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cable className="h-4 w-4" aria-hidden="true" />
            Operational connectivity
          </CardTitle>
          <CardDescription>
            Counts only. Facility sources and external systems are configured in Manage → Connections.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <dl className="flex flex-wrap gap-6">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Referenced sources</dt>
              <dd className="text-sm font-medium">{dataSourceCount}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Referenced connections</dt>
              <dd className="text-sm font-medium">{integrationCount}</dd>
            </div>
          </dl>
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link to={MANAGE_INTEGRATIONS_ROUTE}>
              Open Connections
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="design-import-readiness">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Design imports
          </CardTitle>
          <CardDescription>
            CAD and BIM acquisition is Blueprint-owned. No import capability is shown as available until a native adapter is implemented and validated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {DESIGN_IMPORTS.map((item) => (
            <div key={item.name} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{item.name}</p>
                <Badge variant="outline" className="text-xs">{item.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Existing OpenUSD masters and approved browser derivatives remain governed by the asset-validation pipeline; this card does not claim source-format ingestion.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
