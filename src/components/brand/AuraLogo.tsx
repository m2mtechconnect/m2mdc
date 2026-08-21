/**
 * AURA logo system.
 * Vector AURA Node mark: a geometric letter A built from connected
 * compute nodes with one central NVIDIA-green intelligence node.
 * Presentation only: no routing, auth or data behaviour.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import m2mLogo from '@/assets/m2m-logo.png';

const NVIDIA_GREEN = '#76B900';

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
      <rect x="13" y="17.6" width="6" height="6" rx="1.6" fill={NVIDIA_GREEN} />
    </svg>
  );
}

export interface AuraLogoProps {
  /** `dark` = rendered on a dark graphite surface (default shell header). */
  surface?: 'dark' | 'light';
  /** Hide the wordmark and parent brand (compact widths). */
  compact?: boolean;
  /** Optional supporting line under the wordmark. */
  tagline?: string;
  className?: string;
}

/**
 * Product lockup: `M2M | [AURA node] AURA`.
 * At compact widths only the AURA node renders, with an accessible label.
 */
export function AuraLogo({ surface = 'dark', compact = false, tagline, className }: AuraLogoProps) {
  const wordTone = surface === 'dark' ? 'text-[#F5F7FA]' : 'text-[#1E1E1E]';
  const parentTone = surface === 'dark' ? 'text-[#C9CDD3]' : 'text-[hsl(var(--text-muted))]';
  const dividerTone = surface === 'dark' ? 'bg-[#3A3F45]' : 'bg-[hsl(var(--v2-line))]';

  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {!compact && (
        <>
          <img src={m2mLogo} alt="" aria-hidden className="h-7 w-7 shrink-0 object-contain" />
          <span className={cn('hidden text-[13px] font-semibold tracking-wide sm:inline', parentTone)}>
            M2M
          </span>
          <span className={cn('hidden h-4 w-px shrink-0 sm:block', dividerTone)} aria-hidden />
        </>
      )}
      <AuraNodeMark
        tone={surface === 'dark' ? 'light' : 'dark'}
        className="h-7 w-7"
        title={compact ? 'AURA by M2M' : undefined}
      />
      {!compact && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className={cn('text-[17px] font-semibold tracking-[0.16em]', wordTone)}>AURA</span>
          {tagline ? (
            <span className={cn('mt-1 text-[11px] tracking-wide', parentTone)}>{tagline}</span>
          ) : null}
        </span>
      )}
    </span>
  );
}

export default AuraLogo;
