/**
 * Stable terminal state for NGC-blocked data classes.
 *
 * Renders once, never spins, never retries, never substitutes a value.
 */
import { NGC_UNAVAILABLE, type UnavailableReason } from '@/data/dataset/valueClassification';

interface Props {
  label: string;
  reason?: UnavailableReason;
  className?: string;
}

export function UnavailableState({ label, reason = NGC_UNAVAILABLE, className }: Props) {
  return (
    <div
      className={`rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground ${className ?? ''}`}
      data-testid="ngc-unavailable"
      role="status"
    >
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="mt-1 font-semibold uppercase tracking-wide">{reason.state}</p>
      <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5">
        <dt>Required dataset</dt>
        <dd className="text-foreground">{reason.requiredDataset}</dd>
        <dt>Required version</dt>
        <dd className="text-foreground">{reason.requiredVersion}</dd>
        <dt>Blocker</dt>
        <dd className="text-foreground">{reason.blocker}</dd>
        <dt>Last attempted status</dt>
        <dd className="text-foreground">{reason.lastAttemptedStatus}</dd>
        <dt>Substitution</dt>
        <dd className="text-foreground">{reason.substitution}</dd>
      </dl>
    </div>
  );
}

export default UnavailableState;
