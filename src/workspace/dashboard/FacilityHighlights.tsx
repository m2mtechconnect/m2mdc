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
import { Boxes, ChevronDown, FileSearch, FileText, MoreHorizontal, PlayCircle, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { KPI_STATE_META, type KpiInterpretation } from './kpiInterpretation';

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
  assumptions: ReactNode;
}

function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DC';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

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
  assumptions,
}: Props) {
  return (
    <section
      aria-labelledby="facility-highlights-heading"
      data-testid="facility-highlights"
      className="min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            aria-hidden
            className="hidden h-11 w-11 shrink-0 select-none items-center justify-center rounded-md bg-primary text-[15px] font-bold tracking-wide text-primary-foreground sm:flex"
          >
            {monogram(facilityName)}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Server className="h-3.5 w-3.5" aria-hidden />
              Data centre facility
            </p>
            <h1
              id="facility-highlights-heading"
              className="mt-0.5 break-words text-[24px] font-bold leading-tight text-foreground sm:text-[28px]"
            >
              {facilityName}
            </h1>
            <p className="mt-1 break-words text-[14px] text-muted-foreground">
              {location} · {tier} design
              {isFallback && ' · Reference model'}
            </p>
            <p className="mt-0.5 break-words text-[13px] font-medium text-muted-foreground">
              SIMULATED · Synthetic inputs · Calculated {calculatedAt}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button asChild className="min-h-[36px] text-[14px] max-sm:min-h-[44px]" data-testid="primary-action-simulate">
            <Link to={simulationHref}>
              <PlayCircle className="mr-1.5 h-4 w-4" aria-hidden />
              Start simulation
            </Link>
          </Button>
          <Button asChild variant="outline" className="min-h-[36px] text-[14px] max-sm:min-h-[44px]">
            <Link to={blueprintHref}>
              <Boxes className="mr-1.5 h-4 w-4" aria-hidden />
              Open Blueprint
            </Link>
          </Button>
          <Button asChild variant="outline" className="min-h-[36px] text-[14px] max-sm:min-h-[44px]">
            <Link to={evidenceHref}>
              <FileText className="mr-1.5 h-4 w-4" aria-hidden />
              View Evidence
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="min-h-[36px] w-9 p-0 max-sm:min-h-[44px] max-sm:w-11"
                aria-label="More facility actions"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
        className="grid min-w-0 grid-cols-2 border-t border-border lg:grid-cols-4"
        role="group"
        aria-label="Facility highlights"
      >
        {kpis.map((kpi, index) => {
          const meta = KPI_STATE_META[kpi.state];
          return (
            <div
              key={kpi.key}
              data-testid={`command-kpi-${kpi.key}`}
              data-state={kpi.state}
              className={cn(
                'min-w-0 border-border p-4',
                index % 2 === 1 ? 'border-l' : '',
                index >= 2 ? 'border-t lg:border-t-0' : '',
                'lg:border-l lg:first:border-l-0',
              )}
            >
              <p className="break-words text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                {kpi.label}
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="mt-1 break-words text-[26px] font-bold tabular-nums leading-none text-foreground">
                    {kpi.value}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-[13px]">Modelled value · calculated {calculatedAt}</p>
                </TooltipContent>
              </Tooltip>
              <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dotClassName)} aria-hidden />
                <span className="min-w-0 break-words">{kpi.stateLabel}</span>
              </p>
              {kpi.comparison && (
                <p className="mt-1 break-words text-[13px] leading-snug text-muted-foreground">
                  {kpi.comparison}
                </p>
              )}
              <Link
                to={evidenceHrefForKpi(kpi)}
                data-testid={`command-kpi-${kpi.key}-evidence`}
                className="mt-2 inline-flex items-center gap-1 rounded-sm text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <FileSearch className="h-3.5 w-3.5" aria-hidden />
                Provenance
              </Link>
            </div>
          );
        })}
      </div>

      <Collapsible className="min-w-0 border-t border-border">
        <CollapsibleTrigger className="inline-flex min-h-[36px] items-center gap-1.5 px-4 py-2 text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          Model assumptions
        </CollapsibleTrigger>
        <CollapsibleContent className="min-w-0 border-t border-border bg-muted/50 p-4">
          {assumptions}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
