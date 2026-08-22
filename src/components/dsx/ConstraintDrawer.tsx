/**
 * Constraint investigation drawer.
 *
 * Opening a constraint explains what was measured, which objects it affects,
 * how much evidence supports it and where to continue the investigation.
 */
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { relatedViewsForDomain } from '@/dsx/workspaces/relatedViews';

export function ConstraintDrawer() {
  const { investigatedConstraint: c, closeConstraint, hrefWithContext, selectAsset } = useWorkspace();
  const openerRef = useRef<HTMLElement | null>(null);

  const restoreOpener = () => {
    const opener = openerRef.current;
    openerRef.current = null;
    if (!opener || !opener.isConnected) return;

    // Radix keeps the focus scope alive while the Sheet close animation
    // finishes. Re-assert focus once immediately and once after that transition
    // so narrow/mobile viewports cannot leave focus on <body>.
    requestAnimationFrame(() => {
      if (opener.isConnected) opener.focus();
    });
    window.setTimeout(() => {
      if (opener.isConnected) opener.focus();
    }, 400);
  };

  return (
    <Sheet open={!!c} onOpenChange={(o) => { if (!o) closeConstraint(); }}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-md"
        data-testid="dsx-constraint-drawer"
        data-constraint-domain={c?.domain ?? ''}
        onOpenAutoFocus={() => {
          const active = document.activeElement;
          openerRef.current = active instanceof HTMLElement ? active : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreOpener();
        }}
      >
        {c && (
          <>
            <SheetHeader>
              <SheetTitle className="text-base">{c.label} constraint</SheetTitle>
              <SheetDescription className="text-xs">{c.summary}</SheetDescription>
            </SheetHeader>

            <div className="space-y-4 pt-4 text-xs">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-[11px]">{c.status}</Badge>
                <Badge variant="outline" className="text-[11px]">{c.evidence_events} evidence event(s)</Badge>
                <Badge variant="outline" className="text-[11px]">Detected {c.detected_at ?? 'unavailable'}</Badge>
              </div>

              {c.blocking_capability && (
                <p className="text-muted-foreground">
                  Blocked by missing capability: {c.blocking_capability.label}. {c.blocking_capability.reason}
                  {c.blocking_capability.missing_inputs.length > 0 &&
                    ` Missing inputs: ${c.blocking_capability.missing_inputs.join(', ')}.`}
                </p>
              )}

              <Separator />

              <section className="space-y-1">
                <h3 className="font-semibold uppercase tracking-wider text-muted-foreground">Affected objects</h3>
                {c.affected_assets.length === 0 ? (
                  <p className="text-muted-foreground">
                    No specific object is attributed to this constraint from the connected evidence.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {c.affected_assets.map((a) => (
                      <li key={a.stable_asset_id}>
                        <button
                          type="button"
                          className="rounded-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => { selectAsset(a.stable_asset_id); closeConstraint(); }}
                        >
                          {a.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <Separator />

              <section className="space-y-1">
                <h3 className="font-semibold uppercase tracking-wider text-muted-foreground">Next step</h3>
                <p className="text-muted-foreground">{c.next_step}</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold uppercase tracking-wider text-muted-foreground">Continue investigation</h3>
                <div className="flex flex-wrap gap-2">
                  {relatedViewsForDomain(c.domain).map((v) => (
                    <Button key={v.id} asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link to={hrefWithContext(v.path)} title={v.hint} onClick={closeConstraint}>
                        {v.label}
                      </Link>
                    </Button>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
