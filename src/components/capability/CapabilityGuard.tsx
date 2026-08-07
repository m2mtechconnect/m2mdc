/**
 * Renders children only when a capability is enabled. Otherwise renders a
 * truthful disabled explanation (or nothing when the capability is
 * irrelevant to the current task).
 */
import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { CAPABILITIES, type CapabilityKey } from '@/capabilities/registry';
import { cn } from '@/lib/utils';

interface Props {
  capability: CapabilityKey;
  children: ReactNode;
  /** When true, nothing is rendered while the capability is unavailable. */
  hideWhenUnavailable?: boolean;
  title?: string;
  className?: string;
}

export function CapabilityGuard({ capability, children, hideWhenUnavailable, title, className }: Props) {
  const cap = CAPABILITIES[capability];
  if (cap.enabled) return <>{children}</>;
  if (hideWhenUnavailable) return null;

  return (
    <div
      data-testid={`capability-unavailable-${capability}`}
      data-capability-enabled="false"
      role="note"
      className={cn('rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground', className)}
    >
      <p className="flex items-center gap-2 font-medium text-foreground">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden />
        {title ?? `${cap.label}: ${cap.status}`}
      </p>
      <p className="mt-1">{cap.requirement}</p>
    </div>
  );
}

export default CapabilityGuard;
