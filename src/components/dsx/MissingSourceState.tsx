/**
 * One compact missing-source state.
 *
 * Replaces the repeated "unavailable" prose that used to fill a page. It
 * states the missing connector, the operational capability it unlocks, the
 * named source inputs required, and offers the Integrations action.
 */
import { Link } from 'react-router-dom';
import { CircleSlash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Capability } from '@/dsx/workspaces/availability';

export function MissingSourceState({
  capability: c,
  unlocks,
  testId,
}: {
  capability: Capability;
  /** Operational capability the connector unlocks, in operator language. */
  unlocks: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId ?? `dsx-capability-${c.id}`}
      data-state={c.state}
      className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-4"
    >
      <span className="flex items-center gap-2 text-[14px] font-semibold">
        <CircleSlash className="h-4 w-4 shrink-0" aria-hidden />
        {c.label} is not connected
      </span>
      <dl className="grid gap-1 text-[13px] sm:grid-cols-[10rem_1fr]">
        <dt className="text-muted-foreground">Unlocks</dt>
        <dd>{unlocks}</dd>
        <dt className="text-muted-foreground">Why it is missing</dt>
        <dd className="text-muted-foreground">{c.reason}</dd>
        <dt className="text-muted-foreground">Required source</dt>
        <dd className="flex flex-wrap gap-1">
          {c.missing_inputs.length === 0 ? (
            <span className="text-muted-foreground">Not declared.</span>
          ) : (
            c.missing_inputs.map((i) => (
              <Badge key={i} variant="outline" className="font-mono text-[12px]">{i}</Badge>
            ))
          )}
        </dd>
      </dl>
      <div>
        <Button asChild size="sm" variant="outline" className="min-h-11 sm:min-h-9">
          <Link to="/manage/integrations">Open Integrations</Link>
        </Button>
      </div>
    </div>
  );
}