/**
 * Reusable provenance drawer. Opened from any metric tile. Shows the full
 * chain from source events to displayed value.
 */
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { CalibrationBadge, DataModeBadge, FreshnessIndicator, ValidationBadge } from './StateBadges';
import { OPENUSD_UNAVAILABLE } from '@/dsx/workspaces/facilityGraph';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 py-1 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-mono">{value}</dd>
    </div>
  );
}

export function ProvenanceDrawer() {
  const { provenanceMetric: m, closeProvenance } = useWorkspace();

  return (
    <Sheet open={!!m} onOpenChange={(o) => !o && closeProvenance()}>
      <SheetContent side="right" className="w-full overflow-hidden bg-card sm:max-w-lg" data-testid="dsx-provenance-drawer">
        {m && (
          <>
            <SheetHeader>
              <SheetTitle>{m.metric_name}</SheetTitle>
              <SheetDescription>
                Full provenance for the displayed value. Nothing here is inferred.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="mt-4 h-[calc(100vh-9rem)] pr-4">
              <div className="flex flex-wrap gap-1 pb-3">
                <DataModeBadge mode={m.data_mode} />
                <FreshnessIndicator freshness={m.freshness} />
                <ValidationBadge validation={m.validation} />
                <CalibrationBadge calibration={m.calibration} />
              </div>
              <dl>
                <Row label="Value" value={m.value === null ? 'Unavailable' : `${m.value} ${m.unit}`} />
                <Row label="Unit" value={m.unit} />
                <Row label="Formula" value={m.formula} />
                <Row label="Formula version" value={m.formula_version} />
                <Row
                  label="Observation window"
                  value={m.observation_window ? `${m.observation_window.from} → ${m.observation_window.to}` : 'none'}
                />
                <Row label="Last observed" value={m.last_observed_at ?? 'none'} />
                <Row label="Simulation run" value={m.simulation_run_id ?? 'not applicable'} />
                <Row label="Replay run" value={m.replay_run_id ?? 'not applicable'} />
                <Row label="Confidence" value={m.confidence === null ? 'not reported (uncalibrated model)' : String(m.confidence)} />
                <Row label="OpenUSD prim" value={m.usd_prim_path ?? OPENUSD_UNAVAILABLE} />
              </dl>

              <Separator className="my-3" />
              <h3 className="pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Input measurements
              </h3>
              {m.inputs.length === 0 && <p className="text-xs text-muted-foreground">No input was resolved.</p>}
              <ul className="space-y-1 text-xs" data-testid="dsx-provenance-inputs">
                {m.inputs.map((i) => (
                  <li key={i.name} className="font-mono">
                    {i.name} = {i.value} {i.unit}{' '}
                    {i.provenance === 'declared'
                      ? `(declared, not observed - ${i.declared_source ?? 'source not named'})`
                      : `(${i.event_ids.length} event(s))`}
                  </li>
                ))}
              </ul>

              {m.unattested_inputs.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <h3 className="pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Declared, unattested inputs
                  </h3>
                  <p className="pb-1 text-xs text-muted-foreground">
                    These values are asserted in the facility registry. No observation or attestation
                    evidences them, so this metric is only as trustworthy as the declaration.
                  </p>
                  <ul className="list-disc pl-4 text-xs text-amber-200" data-testid="dsx-provenance-declared">
                    {m.declared_inputs.map((i) => (
                      <li key={i.name}>
                        <span className="font-mono">{i.name}</span> = {i.value} {i.unit} - {i.declared_source ?? 'source not named'}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {m.missing_inputs.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <h3 className="pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Missing inputs
                  </h3>
                  <ul className="list-disc pl-4 text-xs text-amber-200" data-testid="dsx-provenance-missing">
                    {m.missing_inputs.map((i) => <li key={i}>{i}</li>)}
                  </ul>
                </>
              )}

              <Separator className="my-3" />
              <h3 className="pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Source events ({m.source_event_ids.length})
              </h3>
              <ul className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
                {m.source_event_ids.slice(0, 40).map((e) => <li key={e}>{e}</li>)}
                {m.source_event_ids.length === 0 && <li>No source event backs this value.</li>}
              </ul>

              <Separator className="my-3" />
              <h3 className="pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Limitations
              </h3>
              <ul className="list-disc space-y-1 pl-4 pb-8 text-xs text-muted-foreground">
                {m.limitations.map((l) => <li key={l}>{l}</li>)}
              </ul>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}