/**
 * Shared workspace section card. Normalises radius, padding, border and
 * elevation so every workspace section reads with the same hierarchy.
 */
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SectionCardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  /** `technical` renders the dark graphite surface used by visualisations. */
  tone?: 'default' | 'technical' | 'quiet';
  bodyClassName?: string;
  children?: React.ReactNode;
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  tone = 'default',
  className,
  bodyClassName,
  children,
  ...props
}: SectionCardProps) {
  return (
    <section className={cn('aura-ws-card', className)} data-tone={tone} {...props}>
      {title || actions ? (
        <div className="aura-ws-card-head">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon ? (
              <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
            ) : null}
            <div className="min-w-0">
              {title ? <h2 className="aura-ws-card-title">{title}</h2> : null}
              {description ? <p className="aura-ws-card-description">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn('aura-ws-card-body', bodyClassName)}>{children}</div>
    </section>
  );
}

export default SectionCard;
