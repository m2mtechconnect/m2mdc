/**
 * AURA logo system.
 * Vector AURA Node mark: a geometric letter A built from connected
 * compute nodes with one central AURA technical-accent node.
 * Presentation only: no routing, auth or data behaviour.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

// AURA-owned accent. Do not use third-party artwork, logo geometry, or
// trademark colors as a substitute for an AURA brand asset.
const AURA_TECH_GREEN = '#8FCB4A';

export interface AuraNodeMarkProps extends React.SVGProps<SVGSVGElement> {
  /** Stroke/structure tone. `light` for dark backgrounds, `dark` for light backgrounds. */
  tone?: 'light' | 'dark' | 'current';
  title?: string;
}

/** Icon-only AURA node mark (square, scales from 16px to any size). */
export function AuraNodeMark({ tone = 'current', title, className, ...props }: AuraNodeMarkProps) {
  const structure = tone === 'light' ? '#F5F7FA' : tone === 'dark' ? '#1E1E1E' : 'currentColor';
  return (
    <svg
      viewBox="0 0 32 32"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={cn('shrink-0', className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {/* A structure: two legs and a crossbar drawn between compute nodes. */}
      <g
        stroke={structure}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.95}
      >
        <path d="M16 5 L5.5 27" />
        <path d="M16 5 L26.5 27" />
        <path d="M10.2 20.5 L21.8 20.5" />
      </g>
      {/* Compute nodes at the structural vertices. */}
      <g fill={structure}>
        <rect x="13.2" y="2.2" width="5.6" height="5.6" rx="1.4" />
        <rect x="2.6" y="24.2" width="5.6" height="5.6" rx="1.4" />
        <rect x="23.8" y="24.2" width="5.6" height="5.6" rx="1.4" />
      </g>
      {/* Central intelligence node. */}
      <rect x="13" y="17.6" width="6" height="6" rx="1.6" fill={AURA_TECH_GREEN} />
    </svg>
  );
}

export interface AuraLogoProps {
  /** `dark` = rendered on a dark graphite surface (default shell header). */
  surface?: 'dark' | 'light';
  /** Hide the wordmark at compact widths. */
  compact?: boolean;
  /** Optional supporting line under the wordmark. */
  tagline?: string;
  className?: string;
}

/** AURA product lockup. At compact widths only the AURA node renders. */
export function AuraLogo({ surface = 'dark', compact = false, tagline, className }: AuraLogoProps) {
  const wordTone = surface === 'dark' ? 'text-[#F5F7FA]' : 'text-[#1E1E1E]';
  const supportingTone = surface === 'dark' ? 'text-[#C9CDD3]' : 'text-[hsl(var(--text-muted))]';

  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <AuraNodeMark
        tone={surface === 'dark' ? 'light' : 'dark'}
        className="h-7 w-7"
        title={compact ? 'AURA' : undefined}
      />
      {!compact && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className={cn('text-[17px] font-semibold tracking-[0.16em]', wordTone)}>AURA</span>
          {tagline ? (
            <span className={cn('mt-1 text-[11px] tracking-wide', supportingTone)}>{tagline}</span>
          ) : null}
        </span>
      )}
    </span>
  );
}

export default AuraLogo;
