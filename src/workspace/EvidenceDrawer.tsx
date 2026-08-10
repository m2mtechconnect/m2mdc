/**
 * Evidence drilldown for a single modelled KPI. Opens over the workspace so
 * the facility model stays on screen.
 */
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { evidenceBoundaryNotice } from '@/capabilities/operatingState';
import { formatCalculatedAt, useRunProvenance } from '@/capabilities/runProvenance';
import { KPI_DESCRIPTORS, deriveKpis, formatKpi, type ConfigOverrides, type FacilityDefinition } from './facilityModel';
import { useActiveRun, useWorkspaceStore } from './workspaceStore';

interface Props {
  facility: FacilityDefinition;
  overrides: ConfigOverrides;
}

export function EvidenceDrawer({ facility, overrides }: Props) {
  const evidenceKpi = useWorkspaceStore((s) => s.evidenceKpi);
  const closeEvidence = useWorkspaceStore((s) => s.closeEvidence);
  const run = useActiveRun();
  const provenance = useRunProvenance();

  if (!evidenceKpi) return null;
  const descriptor = KPI_DESCRIPTORS[evidenceKpi];
  const modelled = deriveKpis(facility, overrides);
  const value = run ? run.result[evidenceKpi] : modelled[evidenceKpi];
  const runId = run?.id ?? provenance.runId;
  const calculatedAt = run?.completedAt ?? provenance.calculatedAt;

  return (
    <Sheet open onOpenChange={(open) => !open && closeEvidence()}>
      <SheetContent side="right" className="w-full bg-card sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            {descriptor.label}
            <Badge variant="outline" className="text-[10px] uppercase">
              Simulated
            </Badge>
          </SheetTitle>
          <SheetDescription className="text-xs">How this modelled value was produced.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-md border border-border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current modelled value</p>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{formatKpi(evidenceKpi, value)}</p>
          </div>

          <section>
            <h3 className="mb-1 text-xs font-semibold text-foreground">Derivation</h3>
            <p className="text-xs text-muted-foreground">{descriptor.derivation}</p>
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold text-foreground">Inputs</h3>
            <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
              {descriptor.inputs.map((input) => (
                <li key={input}>{input}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold text-foreground">Configuration used</h3>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Cooling setpoint</dt>
                <dd className="tabular-nums text-foreground">{overrides.coolingSetpointC} C</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Workload density</dt>
                <dd className="tabular-nums text-foreground">{overrides.workloadDensityPct}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">GPU power cap</dt>
                <dd className="tabular-nums text-foreground">{overrides.gpuPowerCapPct}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Renewable mix</dt>
                <dd className="tabular-nums text-foreground">{overrides.renewableMixPct}%</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold text-foreground">Provenance</h3>
            <p className="text-xs text-muted-foreground">
              Run {runId ?? 'Unavailable'} · calculated {formatCalculatedAt(calculatedAt ?? null)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{evidenceBoundaryNotice(runId)}</p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}