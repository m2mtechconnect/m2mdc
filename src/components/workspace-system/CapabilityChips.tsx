/**
 * Manifest-backed capability chips.
 *
 * Renders the approved customer-visible stack vocabulary for a surface as a
 * compact chip row, with the truth qualifier attached. Never renders internal
 * provider identifiers.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  customerVisibleStack,
  evidenceQualifier,
  type StackSurface,
} from '@/config/auraStackManifest';

export interface CapabilityChipsProps {
  surface: StackSurface;
  /** Restrict to specific manifest ids, in the order given. */
  ids?: string[];
  limit?: number;
  className?: string;
}

export function CapabilityChips({ surface, ids, limit, className }: CapabilityChipsProps) {
  const visible = customerVisibleStack(surface);
  const ordered = ids
    ? ids.map((id) => visible.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => Boolean(c))
    : visible;
  const shown = typeof limit === 'number' ? ordered.slice(0, limit) : ordered;
  if (shown.length === 0) return null;

  return (
    <ul className={cn('flex flex-wrap items-center gap-2', className)} data-testid="capability-chips">
      {shown.map((capability) => {
        const qualifier = evidenceQualifier(capability.evidenceStatus);
        return (
          <li key={capability.id}>
            <span className="aura-ws-chip" title={capability.description}>
              <span className="aura-ws-chip-dot" data-status={capability.evidenceStatus} aria-hidden="true" />
              {capability.label}
              {qualifier ? <span className="aura-ws-chip-qualifier">{qualifier}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default CapabilityChips;
