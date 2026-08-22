/**
 * Evidence state chip. Status is never conveyed by colour alone: every chip
 * renders its state word and a distinct glyph.
 */
import { AlertTriangle, CheckCircle2, CircleSlash, Sigma, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EVIDENCE_LABELS, type EvidenceState } from '@/pages/blueprint/operatorModel';

const TONE: Record<EvidenceState, string> = {
  authoritative: 'border-success/40 text-success',
  derived: 'border-info/40 text-info',
  estimated: 'border-warning/40 text-warning',
  conflicting: 'border-destructive/40 text-destructive',
  unavailable: 'border-border text-muted-foreground',
};

const GLYPH: Record<EvidenceState, typeof CheckCircle2> = {
  authoritative: CheckCircle2,
  derived: Sigma,
  estimated: TriangleAlert,
  conflicting: AlertTriangle,
  unavailable: CircleSlash,
};

export function EvidenceChip({ state, className }: { state: EvidenceState; className?: string }) {
  const Glyph = GLYPH[state];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[12px] font-medium',
        TONE[state],
        className,
      )}
      data-evidence-state={state}
    >
      <Glyph className="h-3 w-3" aria-hidden />
      {EVIDENCE_LABELS[state]}
    </span>
  );
}