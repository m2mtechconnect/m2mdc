/**
 * Renders a DsxProvenancedMetric. A value can never appear without its
 * mode, freshness, formula and evidence links; a metric with missing inputs
 * renders "Unavailable" and names the missing inputs.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { DsxProvenancedMetric } from '@/dsx/contracts/provenancedMetric';
import { modeLabel } from '@/dsx/modes';

interface Props {
  id: string;
  metric: DsxProvenancedMetric;
  digits?: number;
}

export function DsxMetricTile({ id, metric, digits = 2 }: Props) {
  const unavailable = metric.value === null;

  return (
    <Card data-testid={`dsx-metric-${id}`} data-mode={metric.data_mode} data-validation={metric.validation}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {metric.metric_name}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`How ${metric.metric_name} is calculated`}
                  className="rounded-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Info className="h-4 w-4" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                <p className="font-mono">{metric.formula}</p>
                <p className="mt-1 text-muted-foreground">Formula version {metric.formula_version}</p>
                <p className="mt-1 text-muted-foreground">
                  Evidence: {metric.source_event_ids.length} source event(s)
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="font-mono text-2xl font-bold" data-testid={`dsx-metric-${id}-value`}>
          {unavailable ? (
            <span className="text-base font-normal italic text-muted-foreground">Unavailable</span>
          ) : (
            <>
              {metric.value!.toFixed(digits)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{metric.unit}</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-[11px]">{modeLabel(metric.data_mode)}</Badge>
          <Badge variant="outline" className="text-[11px]">{metric.freshness}</Badge>
          <Badge variant="outline" className="text-[11px]">{metric.validation}</Badge>
          <Badge variant="outline" className="text-[11px]">{metric.calibration}</Badge>
        </div>

        {unavailable && metric.missing_inputs.length > 0 && (
          <p className="text-[11px] text-muted-foreground" data-testid={`dsx-metric-${id}-missing`}>
            Missing inputs: {metric.missing_inputs.join(', ')}
          </p>
        )}
        {metric.limitations.length > 0 && (
          <p className="text-[11px] text-muted-foreground">{metric.limitations[0]}</p>
        )}
      </CardContent>
    </Card>
  );
}