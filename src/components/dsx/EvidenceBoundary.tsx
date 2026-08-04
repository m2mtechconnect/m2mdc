/**
 * Shared presenter for an assurance domain's evidence boundary.
 *
 * Renders the declared claims of a domain and, for each one, whether it is
 * evidenced or not. A not-evidenced claim always shows the blocking
 * capability and the exact missing inputs, so the absence of a number is
 * legible as an absence rather than as a good result.
 */
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CircleSlash, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  domainVerdict, summarise, type EvidenceAssertion,
} from '@/dsx/workspaces/evidenceBoundary';

export function BoundaryVerdict({
  assertions,
  domain,
}: {
  assertions: EvidenceAssertion[];
  domain: string;
}) {
  const verdict = domainVerdict(assertions);
  const s = summarise(assertions);
  const assured = verdict === 'assured';
  return (
    <Card
      data-testid={`dsx-boundary-verdict-${domain}`}
      data-verdict={verdict}
      className={cn(
        'border-border/60',
        assured ? 'bg-emerald-500/5' : 'bg-zinc-500/5',
      )}
    >
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
        <span className={cn('flex items-center gap-2 text-sm font-semibold', assured ? 'text-emerald-200' : 'text-zinc-200')}>
          {assured ? <ShieldCheck className="h-4 w-4" aria-hidden /> : <CircleSlash className="h-4 w-4" aria-hidden />}
          {assured ? 'Assured' : 'Unverified'}
        </span>
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          {assured
            ? 'Every declared claim in this domain is backed by a named source.'
            : `${s.not_evidenced} of ${s.total} declared claims cannot be evidenced by any connected source. This domain makes no assurance statement.`}
        </p>
        <Badge variant="outline" className="text-[11px]">{s.evidenced} evidenced</Badge>
        <Badge variant="outline" className="text-[11px]">{s.not_evidenced} not evidenced</Badge>
      </CardContent>
    </Card>
  );
}

export function EvidenceBoundaryTable({
  assertions,
  domain,
}: {
  assertions: EvidenceAssertion[];
  domain: string;
}) {
  return (
    <Table data-testid={`dsx-boundary-table-${domain}`}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[38%]">Claim</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Basis or blocker</TableHead>
          <TableHead>Missing inputs</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assertions.map((a) => {
          const ok = a.status === 'evidenced';
          return (
            <TableRow key={a.id} data-testid={`dsx-assertion-${a.id}`} data-status={a.status}>
              <TableCell className="align-top text-xs">{a.claim}</TableCell>
              <TableCell className="align-top">
                <Badge
                  variant="outline"
                  className={cn(
                    'whitespace-nowrap text-[11px]',
                    ok
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                      : 'border-zinc-500/50 bg-zinc-500/10 text-zinc-300',
                  )}
                >
                  {ok ? 'Evidenced' : 'Not evidenced'}
                </Badge>
              </TableCell>
              <TableCell className="align-top text-xs text-muted-foreground">
                {ok ? a.basis : a.blocking_capability?.reason}
                {ok && a.evidence_event_ids.length > 0 && (
                  <span className="mt-1 block font-mono text-[11px]">
                    {a.evidence_event_ids.length} supporting event(s)
                  </span>
                )}
                <span className="mt-1 block text-[11px]">{a.next_step}</span>
              </TableCell>
              <TableCell className="align-top font-mono text-[11px] text-muted-foreground">
                {a.missing_inputs.length ? a.missing_inputs.join(', ') : 'none'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function RequiredInputList({
  assertions,
  domain,
}: {
  assertions: EvidenceAssertion[];
  domain: string;
}) {
  const s = summarise(assertions);
  if (s.required_inputs.length === 0) {
    return <p className="text-sm text-muted-foreground">No further input is required in this domain.</p>;
  }
  return (
    <div className="space-y-2" data-testid={`dsx-boundary-required-${domain}`}>
      <p className="text-xs text-muted-foreground">
        Connecting the following named inputs would close this boundary. Until then no value in this
        domain is calculated.
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {s.required_inputs.map((i) => (
          <li key={i}>
            <Badge variant="outline" className="font-mono text-[11px]">{i}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
