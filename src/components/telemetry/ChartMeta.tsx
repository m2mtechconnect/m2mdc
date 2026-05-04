/**
 * ChartMeta
 *
 * Reusable subtitle row that shows the data grain, time window, and source
 * for a chart. Implements Lucas's recommendation that every visual on the
 * Telemetry & Analytics page must declare its grain so users do not compare
 * numbers that should not be compared directly.
 */

import { Database, Clock, Layers } from 'lucide-react';

interface ChartMetaProps {
  grain: string;       // e.g. "Facility", "Zone", "Workload", "Event"
  window: string;      // e.g. "Last 7 days", "Current"
  source?: string;     // e.g. "BMS · DCIM"
  aggregation?: string;
}

export function ChartMeta({ grain, window, source, aggregation }: ChartMetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-1">
      <span className="flex items-center gap-1">
        <Layers className="h-3 w-3" aria-hidden />
        Grain: <span className="font-medium text-foreground">{grain}</span>
      </span>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" aria-hidden />
        Window: <span className="font-medium text-foreground">{window}</span>
      </span>
      {aggregation && (
        <span className="flex items-center gap-1">
          Aggregation: <span className="font-medium text-foreground">{aggregation}</span>
        </span>
      )}
      {source && (
        <span className="flex items-center gap-1">
          <Database className="h-3 w-3" aria-hidden />
          Source: <span className="font-medium text-foreground">{source}</span>
        </span>
      )}
    </div>
  );
}