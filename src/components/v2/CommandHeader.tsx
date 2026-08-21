/**
 * AURA Visual System V2 — command / section header pattern.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CommandHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Provenance badges / status chips rendered next to the title. */
  meta?: React.ReactNode;
  /** Right-aligned actions. */
  actions?: React.ReactNode;
  /** Optional eyebrow (workspace or lifecycle stage). */
  eyebrow?: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3';
}

export function CommandHeader({
  title,
  subtitle,
  meta,
  actions,
  eyebrow,
  as: Heading = 'h1',
  className,
  ...props
}: CommandHeaderProps) {
  return (
    <div className={cn('v2-command-header', className)} {...props}>
      <div className="min-w-0 space-y-1">
        {eyebrow ? <div className="v2-label">{eyebrow}</div> : null}
        <div className="flex flex-wrap items-center gap-2">
          <Heading className="v2-command-title">{title}</Heading>
          {meta}
        </div>
        {subtitle ? <p className="v2-command-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Lighter in-page divider header for sub-sections. */
export function SectionHeader({
  title,
  actions,
  className,
  ...props
}: { title: React.ReactNode; actions?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between gap-3 pb-2', className)} {...props}>
      <h2 className="v2-label">{title}</h2>
      {actions}
    </div>
  );
}
