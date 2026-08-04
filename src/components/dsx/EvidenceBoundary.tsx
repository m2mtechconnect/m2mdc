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
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CircleSlash, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
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
        <span className={cn('flex items-center gap-2 text-sm font-semibold', assured ? 'text-emerald-700 dark:text-emerald-200' : 'text-foreground')}>
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
  const [openId, setOpenId] = useState<string | null>(null);
  const active = assertions.find((a) => a.id === openId) ?? null;
  return (
    <>
    <Table data-testid={`dsx-boundary-table-${domain}`}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[38%]">Claim</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Basis or blocker</TableHead>
          <TableHead>Missing inputs</TableHead>
          <TableHead className="w-[1%]"><span className="sr-only">Provenance</span></TableHead>
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
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                      : 'border-zinc-500/50 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
                  )}
                >
                  {ok ? 'Evidenced' : 'Not evidenced'}
                </Badge>
                {ok && a.unattested_inputs.length > 0 && (
                  <Badge
                    variant="outline"
                    className="mt-1 block whitespace-nowrap border-amber-500/50 bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-200"
                  >
                    Declared input
                  </Badge>
                )}
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
                {a.unattested_inputs.length > 0 && (
                  <span className="mt-1 block text-amber-700 dark:text-amber-200">
                    unattested: {a.unattested_inputs.join(', ')}
                  </span>
                )}
              </TableCell>
              <TableCell className="align-top">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 whitespace-nowrap text-[11px]"
                  data-testid={`dsx-assertion-drilldown-${a.id}`}
                  aria-label={`Show provenance for claim: ${a.claim}`}
                  onClick={() => setOpenId(a.id)}
                >
                  Details
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    <AssertionProvenanceDrawer
      assertion={active}
      domain={domain}
      onClose={() => setOpenId(null)}
    />
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 py-1 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

/**
 * Per-claim drilldown. Shows the exact basis (or the exact blocker) behind a
 * single assertion, the capability that gates it, the named inputs that are
 * missing and the provenanced event ids that support it. Nothing here is
 * inferred: a claim with no supporting events says so.
 */
export function AssertionProvenanceDrawer({
  assertion: a,
  domain,
  onClose,
}: {
  assertion: EvidenceAssertion | null;
  domain: string;
  onClose: () => void;
}) {
  const ok = a?.status === 'evidenced';
  return (
    <Sheet open={!!a} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-hidden bg-card sm:max-w-lg"
        data-testid={`dsx-assertion-drawer-${domain}`}
        data-assertion-id={a?.id ?? ''}
        data-status={a?.status ?? ''}
      >
        {a && (
          <>
            <SheetHeader>
              <SheetTitle className="text-sm leading-snug">{a.claim}</SheetTitle>
              <SheetDescription>
                Per-claim provenance for the {domain} evidence boundary.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="mt-4 h-[calc(100vh-9rem)] pr-4">
              <Badge
                variant="outline"
                className={cn(
                  'text-[11px]',
                  ok
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                    : 'border-zinc-500/50 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
                )}
              >
                {ok ? 'Evidenced' : 'Not evidenced'}
              </Badge>

              <Separator className="my-3" />
              <h3 className="pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {ok ? 'Basis' : 'Why this claim is not evidenced'}
              </h3>
              <p className="text-xs text-muted-foreground" data-testid="dsx-assertion-basis">
                {ok ? a.basis : a.blocking_capability?.reason ?? 'No basis is recorded for this claim.'}
              </p>

              <Separator className="my-3" />
              <dl>
                <DetailRow label="Claim id" value={a.id} />
                <DetailRow label="Domain" value={a.domain} />
                <DetailRow
                  label="Blocking capability"
                  value={
                    a.blocking_capability
                      ? `${a.blocking_capability.label} (${a.blocking_capability.id}) — state: ${a.blocking_capability.state}`
                      : 'none'
                  }
                />
                <DetailRow label="Next step" value={a.next_step} />
              </dl>

              <Separator className="my-3" />
              <h3 className="pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Supporting observations
              </h3>
              {a.evidence_event_ids.length === 0 ? (
                <p className="text-xs text-muted-foreground" data-testid="dsx-assertion-events-empty">
                  {ok
                    ? 'This is a structural claim. It resolves from the facility registry rather than from individual observations.'
                    : 'No observation supports this claim.'}
                </p>
              ) : (
                <ul className="space-y-0.5 text-[11px]" data-testid="dsx-assertion-events">
                  {a.evidence_event_ids.map((id) => (
                    <li key={id} className="break-all font-mono text-muted-foreground">{id}</li>
                  ))}
                </ul>
              )}

              <Separator className="my-3" />
              <h3 className="pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Missing inputs
              </h3>
              {a.missing_inputs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No input is missing for this claim.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-1.5" data-testid="dsx-assertion-missing">
                  {a.missing_inputs.map((i) => (
                    <li key={i}>
                      <Badge variant="outline" className="font-mono text-[11px]">{i}</Badge>
                    </li>
                  ))}
                </ul>
              )}

              {a.unattested_inputs.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <h3 className="pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Declared, unattested inputs
                  </h3>
                  <p className="pb-1 text-xs text-muted-foreground">
                    This claim depends on value(s) declared in the facility registry. No observation or
                    attestation evidences them, so the claim holds only as far as the declaration is trusted.
                  </p>
                  <ul className="flex flex-wrap gap-1.5" data-testid="dsx-assertion-unattested">
                    {a.unattested_inputs.map((i) => (
                      <li key={i}>
                        <Badge
                          variant="outline"
                          className="border-amber-500/50 bg-amber-500/10 font-mono text-[11px] text-amber-700 dark:text-amber-200"
                        >
                          {i}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="h-6" />
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
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
