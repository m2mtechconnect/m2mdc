/**
 * Stage 7B - facility highlights panel.
 *
 * Lightning "dynamic highlights panel" structure adapted to a data-centre
 * record: identity and operating state on the left, one obvious primary
 * action on the right, and the primary indicators integrated into the same
 * surface as divided cells rather than six separate boxes.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  Building2,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Ellipsis,
  FileSearch,
  Info,
  Play,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type KpiInterpretation, type KpiState } from './kpiInterpretation';

interface Props {
  facilityName: string;
  location: string;
  tier: string;
  calculatedAt: string;
  isFallback: boolean;
  simulationHref: string;
  blueprintHref: string;
  evidenceHref: string;
  kpis: KpiInterpretation[];
  evidenceHrefForKpi: (kpi: KpiInterpretation) => string;
  onSelectKpi: (kpi: KpiInterpretation) => void;
  assumptions: ReactNode;
}

/** Semantic icon + colour pairing. Colour is never the only signal. */
const STATE_UI: Record<KpiState, { Icon: typeof Info; className: string }> = {
  within: { Icon: CircleCheck, className: 'text-success' },
  watch: { Icon: TriangleAlert, className: 'text-warning' },
  constraint: { Icon: CircleAlert, className: 'text-destructive' },
  unknown: { Icon: Info, className: 'text-muted-foreground' },
  unavailable: { Icon: Info, className: 'text-muted-foreground' },
};

export function FacilityHighlights({
  facilityName,
  location,
  tier,
  calculatedAt,
  isFallback,
  simulationHref,
  blueprintHref,
  evidenceHref,
  kpis,
  evidenceHrefForKpi,
  onSelectKpi,
  assumptions,
}: Props) {
  return (
    <section
      aria-labelledby="facility-highlights-heading"
      data-testid="facility-highlights"
      className="min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_3px_0_hsl(214_25%_20%/0.08)]"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <span
            aria-hidden
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground sm:flex"
          >
            <Building2 className="h-[22px] w-[22px]" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              Data centre facility
            </p>
            <h1
              id="facility-highlights-heading"
              className="mt-0.5 break-words text-[20px] font-bold leading-tight text-foreground sm:text-[24px]"
            >
              {facilityName}
            </h1>
            <p className="mt-1 break-words text-[13px] text-muted-foreground">
              {location} · {tier} design
              {isFallback && ' · Reference model'} · Simulated design baseline · Synthetic inputs ·
              Calculated {calculatedAt}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button
            asChild
            className="h-10 px-4 text-[14px] font-semibold shadow-sm max-sm:h-11"
            data-testid="primary-action-simulate"
          >
            <Link to={simulationHref}>
              <Play className="mr-2 h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
              Start simulation
            </Link>
          </Button>
          <Button asChild variant="outline" className="hidden h-[38px] text-[14px] font-normal sm:inline-flex">
            <Link to={blueprintHref}>
              <Boxes className="mr-2 h-4 w-4" strokeWidth={1.75} aria-hidden />
              Open Blueprint
            </Link>
          </Button>
          <Button asChild variant="outline" className="hidden h-[38px] text-[14px] font-normal sm:inline-flex">
            <Link to={evidenceHref}>
              <FileSearch className="mr-2 h-4 w-4" strokeWidth={1.75} aria-hidden />
              View Evidence
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-[38px] w-[38px] p-0 max-sm:h-11 max-sm:w-11"
                aria-label="More facility actions"
                title="More facility actions"
              >
                <Ellipsis className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild className="sm:hidden">
                <Link to={blueprintHref}>Open Blueprint</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="sm:hidden">
                <Link to={evidenceHref}>View Evidence</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`${blueprintHref}?tab=model`}>Inspect facility model</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/integrations">Open Integrations</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/simulation">Simulation workspace</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Primary indicators as divided cells inside the same surface. */}
      <div
        className="grid min-w-0 grid-cols-2 border-t border-border min-[960px]:grid-cols-4"
        role="group"
        aria-label="Facility highlights"
      >
        {kpis.map((kpi, index) => {
          const meta = STATE_UI[kpi.state];
          return (
            <div
              key={kpi.key}
              data-testid={`command-kpi-${kpi.key}`}
              data-state={kpi.state}
              className={cn(
                'flex min-h-[88px] min-w-0 flex-col border-border p-3 sm:px-4',
                index % 2 === 1 ? 'border-l' : '',
                index >= 2 ? 'border-t min-[960px]:border-t-0' : '',
                'min-[960px]:border-l min-[960px]:first:border-l-0',
              )}
            >
              <button
                type="button"
                aria-haspopup="dialog"
                data-testid={`command-kpi-${kpi.key}-inspect`}
                onClick={() => onSelectKpi(kpi)}
                className="min-w-0 rounded-sm text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block break-words text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {kpi.label}
                </span>
                <span className="mt-1 block break-words text-[24px] font-bold tabular-nums leading-none text-foreground">
                  {kpi.value}
                </span>
                <span className="mt-2 flex items-start gap-1.5 text-[13px] font-semibold text-foreground">
                  <meta.Icon
                    className={cn('mt-px h-[16px] w-[16px] shrink-0', meta.className)}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="min-w-0 break-words">{kpi.stateLabel}</span>
                </span>
              </button>
              <Link
                to={evidenceHrefForKpi(kpi)}
                data-testid={`command-kpi-${kpi.key}-evidence`}
                className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-sm pt-2 text-[13px] text-[hsl(var(--info))] underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <FileSearch className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                View source
              </Link>
            </div>
          );
        })}
      </div>

      <Collapsible className="min-w-0 border-t border-border">
        <CollapsibleTrigger className="inline-flex min-h-[36px] items-center gap-1.5 px-4 py-2 text-[13px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronDown className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Model assumptions
        </CollapsibleTrigger>
        <CollapsibleContent className="min-w-0 border-t border-border bg-muted/50 p-4">
          {assumptions}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
