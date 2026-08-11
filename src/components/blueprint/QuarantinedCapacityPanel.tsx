/**
 * Quarantined capacity - read-only.
 *
 * Lists every facility or asset whose capacity record is conflicting, unitless
 * or otherwise unusable, and states plainly why it is blocked and what the
 * platform does instead. The panel renders no controls that change data:
 * quarantine is cleared by correcting the record at its source.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import {
  CANONICAL_CAPACITY_UNIT,
  collectQuarantinedCapacity,
  type CapacityRecord,
} from '@/lib/units/capacityQuarantine';

interface QuarantinedCapacityPanelProps {
  /** Every capacity record in scope for the current blueprint. */
  records: CapacityRecord[];
}

export function QuarantinedCapacityPanel({ records }: QuarantinedCapacityPanelProps) {
  const quarantined = collectQuarantinedCapacity(records);

  return (
    <Card data-testid="quarantined-capacity-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden />
          Quarantined capacity
          <Badge variant="outline" className="ml-auto text-[11px] font-normal">
            {quarantined.length} blocked
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Read-only. Capacity is published only when it is numeric, positive, recorded in{' '}
          {CANONICAL_CAPACITY_UNIT} and consistent across sources. Records below fail that test and
          are corrected at source, not here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {quarantined.length === 0 ? (
          <p
            className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground"
            data-testid="quarantined-capacity-empty"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
            Every capacity record in this blueprint is numeric, positive and recorded in{' '}
            {CANONICAL_CAPACITY_UNIT}. Nothing is quarantined.
          </p>
        ) : (
          <ul className="space-y-2">
            {quarantined.map((q, i) => (
              <li
                key={`${q.record.id}-${q.record.source}-${i}`}
                data-testid="quarantined-capacity-row"
                data-reason={q.reason}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">
                    {q.record.label}
                  </span>
                  <Badge variant="outline" className="text-[11px] font-normal capitalize">
                    {q.record.kind}
                  </Badge>
                  <Badge variant="outline" className="border-warning/50 text-[11px] font-normal text-warning">
                    {q.title}
                  </Badge>
                </div>
                <dl className="mt-2 grid gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">Stored value</dt>
                    <dd className="break-words font-mono text-foreground">{q.storedDisplay}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">Source</dt>
                    <dd className="break-words font-mono text-foreground">{q.record.source}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Effect: </span>
                  {q.consequence}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
