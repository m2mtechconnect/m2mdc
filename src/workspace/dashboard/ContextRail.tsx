/**
 * Stage 7B - contextual right rail.
 *
 * Lightning utility/related-information pattern: compact, contextual summaries
 * that deep link into the workspace that actually owns the workflow. Every
 * label states the truthful simulated capability state.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, MessagesSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCoPilot } from '@/contexts/CoPilotContext';
import type { KpiInterpretation } from './kpiInterpretation';

const READINESS: Array<{ label: string; state: string; tone: 'critical' | 'neutral'; to: string }> = [
  { label: 'Facility telemetry', state: 'Not connected', tone: 'neutral', to: '/integrations' },
  { label: 'NVIDIA runtime', state: 'Not available', tone: 'neutral', to: '/settings/integrations/nvidia-dsx' },
  { label: 'OpenUSD stage', state: 'Not validated', tone: 'neutral', to: '/settings/integrations/nvidia-dsx' },
  { label: 'SimReady assets', state: '0 validated', tone: 'neutral', to: '/settings/integrations/nvidia-dsx' },
  { label: 'Production readiness', state: 'No-Go', tone: 'critical', to: '/settings/integrations/nvidia-dsx' },
];

function RailCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="min-w-0 rounded-lg border border-border bg-card p-4">
      <h2 id={`${id}-heading`} className="text-[15px] font-semibold leading-tight text-foreground">
        {title}
      </h2>
      <div className="mt-3 min-w-0">{children}</div>
    </section>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'critical' | 'neutral' }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 py-1.5 text-[13px]">
      <span className="min-w-0 break-words text-muted-foreground">{label}</span>
      <span
        className={cn(
          'shrink-0 font-medium tabular-nums',
          tone === 'critical' ? 'text-destructive' : 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  );
}

interface Props {
  calculatedAt: string;
  kpis: KpiInterpretation[];
  blueprintHref: string;
  evidenceHref: string;
}

export function ContextRail({ calculatedAt, kpis, blueprintHref, evidenceHref }: Props) {
  const { setIsOpen } = useCoPilot();
  const modelled = kpis.filter((k) => k.state !== 'unavailable' && k.state !== 'unknown').length;
  const needsReview = kpis.filter((k) => k.state === 'watch' || k.state === 'constraint').length;

  return (
    <div className="min-w-0 space-y-4" data-testid="context-rail">
      <RailCard id="operating-state" title="Operating state">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-foreground">Simulated</p>
        <div className="mt-2 divide-y divide-border">
          <Row label="Primary inputs" value="Synthetic" />
          <Row label="Live telemetry" value="Not connected" />
          <Row label="Last calculation" value={calculatedAt} />
        </div>
        <Button asChild variant="link" className="mt-1 h-auto px-0 text-[13px]">
          <Link to={`${blueprintHref}?tab=model`}>Review model assumptions</Link>
        </Button>
      </RailCard>

      <RailCard id="readiness" title="Integration readiness">
        <div className="divide-y divide-border">
          {READINESS.map((item) => (
            <Row key={item.label} label={item.label} value={item.state} tone={item.tone} />
          ))}
        </div>
        <p className="mt-2 text-[13px] text-muted-foreground">0 of 5 readiness requirements met.</p>
        <Button asChild variant="outline" size="sm" className="mt-3 min-h-[36px] text-[13px] max-sm:min-h-[44px]">
          <Link to="/integrations">
            View Integrations
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </RailCard>

      <RailCard id="evidence-coverage" title="Evidence coverage">
        <div className="divide-y divide-border">
          <Row label="Metrics modelled" value={String(modelled)} />
          <Row label="Metrics requiring review" value={String(needsReview)} />
          <Row label="Live sources connected" value="0" />
        </div>
        <Button asChild variant="outline" size="sm" className="mt-3 min-h-[36px] text-[13px] max-sm:min-h-[44px]">
          <Link to={evidenceHref}>
            Open Evidence
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </RailCard>

      <RailCard id="assistant-utility" title="AURA Assistant">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Ask about this facility, calculation or modelled constraint.
        </p>
        <Button
          size="sm"
          className="mt-3 min-h-[36px] text-[13px] max-sm:min-h-[44px]"
          data-testid="rail-assistant-entry"
          onClick={() => setIsOpen(true)}
        >
          <MessagesSquare className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Ask AURA
        </Button>
      </RailCard>
    </div>
  );
}
