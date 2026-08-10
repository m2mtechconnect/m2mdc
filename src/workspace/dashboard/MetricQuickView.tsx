/**
 * Stage 7D - Metric Quick View.
 *
 * Selecting a KPI inspects it in place instead of navigating away. Every field
 * is derived from the same modelled calculation the KPI cell shows.
 */
import { Link } from 'react-router-dom';
import { CircleAlert, CircleCheck, FileSearch, Info, Play, Sigma, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { KPI_DESCRIPTORS } from '../facilityModel';
import { evidenceHrefForKpi, blueprintHrefForKpi } from '../kpiDrilldown';
import type { KpiInterpretation, KpiState } from './kpiInterpretation';

const STATE_UI: Record<KpiState, { Icon: typeof Info; className: string }> = {
  within: { Icon: CircleCheck, className: 'text-success' },
  watch: { Icon: TriangleAlert, className: 'text-warning' },
  constraint: { Icon: CircleAlert, className: 'text-destructive' },
  unknown: { Icon: Info, className: 'text-muted-foreground' },
  unavailable: { Icon: Info, className: 'text-muted-foreground' },
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 border-b border-border py-2 last:border-b-0">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="break-words text-[13px] leading-relaxed text-foreground">{value}</dd>
    </div>
  );
}

interface Props {
  kpi: KpiInterpretation | null;
  facilityId: string;
  calculatedAt: string;
  onClose: () => void;
}

export function MetricQuickView({ kpi, facilityId, calculatedAt, onClose }: Props) {
  if (!kpi) return null;
  const descriptor = KPI_DESCRIPTORS[kpi.key];
  const state = STATE_UI[kpi.state];

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        data-testid="metric-quick-view"
        className="flex w-[min(440px,92vw)] flex-col gap-0 p-0 sm:max-w-none"
      >
        <SheetHeader className="space-y-1 border-b border-border p-4 text-left">
          <SheetTitle className="text-[16px] leading-tight">{kpi.label}</SheetTitle>
          <SheetDescription className="text-[13px]">
            Modelled indicator · simulated operating mode
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <p className="text-[32px] font-bold tabular-nums leading-none text-foreground">{kpi.value}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <state.Icon className={cn('h-4 w-4', state.className)} strokeWidth={1.75} aria-hidden />
              {kpi.stateLabel}
            </p>
          </div>

          <dl>
            <Row label="Target or baseline" value={kpi.comparison || 'No design target stored for this indicator.'} />
            <Row label="Calculation method" value={descriptor?.derivation ?? 'Derived by the in-application scenario engine.'} />
            <Row label="Inputs" value={(descriptor?.inputs ?? []).join(', ') || 'Not recorded'} />
            <Row label="Calculated at" value={calculatedAt} />
            <Row label="Supporting evidence" value="Synthetic design baseline, no measured source connected." />
            <Row
              label="Limitations"
              value="Operating mode is SIMULATED. The value cannot be validated against the physical facility."
            />
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="h-9 text-[13px] font-semibold max-sm:h-11" data-testid="metric-open-evidence">
              <Link to={evidenceHrefForKpi(kpi.key)}>
                <FileSearch className="mr-1.5 h-4 w-4" strokeWidth={1.75} aria-hidden />
                Open Evidence
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-9 text-[13px] max-sm:h-11">
              <Link to={blueprintHrefForKpi(facilityId, kpi.key)}>
                <Sigma className="mr-1.5 h-4 w-4" strokeWidth={1.75} aria-hidden />
                View calculation
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-9 text-[13px] max-sm:h-11">
              <Link to={`/simulation?twin=${encodeURIComponent(facilityId || 'default')}&kpi=${kpi.key}`}>
                <Play className="mr-1.5 h-4 w-4" strokeWidth={1.75} aria-hidden />
                Start simulation
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
