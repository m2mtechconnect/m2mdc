/**
 * Stage 7K closure - contextual connectivity reference for Assets & Systems.
 *
 * Blueprint does not own the data-source or integration registries: those live
 * in Manage → Integrations together with connectors, access configuration and
 * settings. Assets may only state how many sources and integrations are
 * referenced by the modelled facility and link out. Counts only, no rows,
 * counts only, and no administrative actions.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Cable } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Canonical Manage destination for sources, integrations and connectors. */
export const MANAGE_INTEGRATIONS_ROUTE = '/manage/integrations';

interface AssetConnectivitySummaryProps {
  dataSourceCount: number;
  integrationCount: number;
}

export function AssetConnectivitySummary({
  dataSourceCount,
  integrationCount,
}: AssetConnectivitySummaryProps) {
  return (
    <Card data-testid="asset-connectivity-summary">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Cable className="h-4 w-4" aria-hidden="true" />
          Connectivity reference
        </CardTitle>
        <CardDescription>
          Counts only. Sources, integrations and connectors are managed in Manage.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        <dl className="flex flex-wrap gap-6">
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Connected sources</dt>
            <dd className="text-sm font-medium">{dataSourceCount}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Configured integrations</dt>
            <dd className="text-sm font-medium">{integrationCount}</dd>
          </div>
        </dl>
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link to={MANAGE_INTEGRATIONS_ROUTE}>
            View in Manage
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}