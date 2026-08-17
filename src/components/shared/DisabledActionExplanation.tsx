import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared P2 primitive: every disabled action must state, in visible text,
 * why it is unavailable, whether the condition is temporary or permanent and
 * what the user can do next. Tooltips alone are insufficient because disabled
 * controls do not reliably fire hover events and touch users never hover.
 *
 * Render the disabled control as a child and pass the generated id to the
 * control via `aria-describedby`.
 */
export interface DisabledActionExplanationProps {
  /** Stable id referenced by the disabled control's aria-describedby. */
  id: string;
  /** Why the action is unavailable right now. */
  reason: string;
  /** Concrete next step, when the user can resolve the condition. */
  recovery?: string;
  /** Permanent conditions are presented as an unavailable capability. */
  permanent?: boolean;
  className?: string;
}

export function DisabledActionExplanation({
  id,
  reason,
  recovery,
  permanent = false,
  className,
}: DisabledActionExplanationProps) {
  return (
    <p
      id={id}
      data-testid={`disabled-reason-${id}`}
      data-permanent={permanent ? 'true' : 'false'}
      className={cn('text-xs leading-snug text-muted-foreground', className)}
    >
      <span className="font-medium text-foreground">
        {permanent ? 'Unavailable: ' : 'Currently unavailable: '}
      </span>
      {reason}
      {recovery ? ` ${recovery}` : null}
    </p>
  );
}

export default DisabledActionExplanation;
