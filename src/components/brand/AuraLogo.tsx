/**
 * AURA logo system.
 * Vector AURA Node mark: a geometric letter A built from connected
 * compute paths with one central green intelligence node.
 * Presentation only: no routing, auth or data behaviour.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

const NVIDIA_GREEN = '#76B900';

export interface AuraNodeMarkProps extends React.SVGProps<SVGSVGElement> {
  /** Stroke/structure tone. `light` for dark backgrounds, `dark` for light backgrounds. */
  tone?: 'light' | 'dark' | 'current';
  /** Render the intelligence node in the structure colour for one-colour applications. */
  monochrome?: boolean;
  title?: string;
}

/** Icon-only AURA node mark (square, scales from 16px to any size). */
export function AuraNodeMark({
  tone = 'current',
  monochrome = false,
  title,
  className,
  ...props
}: AuraNodeMarkProps) {
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
      {/* A structure: a broad, unmistakable silhouette with four connection points. */}
      <g
        stroke={structure}
        strokeWidth={3}
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      >
        <path d="M5.5 27 L16 4.5 L26.5 27" />
        <path d="M10.1 20.5 H21.9" />
      </g>
      {/* Three terminal nodes anchor the mark without competing with the silhouette. */}
      <g fill={structure}>
        <rect x="13.5" y="2" width="5" height="5" />
        <rect x="3" y="24.5" width="5" height="5" />
        <rect x="24" y="24.5" width="5" height="5" />
      </g>
      {/* Central intelligence node. */}
      <rect x="13.25" y="17.75" width="5.5" height="5.5" fill={monochrome ? structure : NVIDIA_GREEN} />
    </svg>
  );
}

export interface AuraLogoProps {
  /** `dark` = rendered on a dark graphite surface (default shell header). */
  surface?: 'dark' | 'light';
  /** Hide the wordmark and parent brand (compact widths). */
  compact?: boolean;
  /** Lockup arrangement. Compact mode always renders the mark only. */
  variant?: 'horizontal' | 'stacked';
  /** Render the complete lockup in one colour. */
  monochrome?: boolean;
  /** Show the M2M parent-brand prefix in contexts that require the full lockup. */
  showParentBrand?: boolean;
  /** Optional supporting line under the wordmark. */
  tagline?: string;
  className?: string;
}

/**
 * Product lockup: `M2M | [AURA node] AURA`.
 * At compact widths only the AURA node renders, with an accessible label.
 */
export function AuraLogo({
  surface = 'dark',
  compact = false,
  variant = 'horizontal',
  monochrome = false,
  showParentBrand = true,
  tagline,
  className,
}: AuraLogoProps) {
  const wordTone = surface === 'dark' ? 'text-[#F5F7FA]' : 'text-[#1E1E1E]';
  const parentTone = surface === 'dark' ? 'text-[#C9CDD3]' : 'text-[hsl(var(--text-muted))]';
  const dividerTone = surface === 'dark' ? 'bg-[#3A3F45]' : 'bg-[hsl(var(--v2-line))]';
  const stacked = variant === 'stacked' && !compact;

  return (
    <span
      className={cn(
        'flex min-w-0',
        stacked ? 'flex-col items-start gap-2.5' : 'items-center gap-2.5',
        className,
      )}
      role="img"
      aria-label="AURA"
    >
      {!compact && showParentBrand && (
        <>
          <span className={cn('hidden text-[13px] font-semibold tracking-wide sm:inline', parentTone)}>
            M2M
          </span>
          <span className={cn('hidden h-4 w-px shrink-0 sm:block', dividerTone)} aria-hidden />
        </>
      )}
      <AuraNodeMark
        tone={surface === 'dark' ? 'light' : 'dark'}
        monochrome={monochrome}
        className={cn(stacked ? 'h-12 w-12' : 'h-7 w-7')}
      />
      {!compact && (
        <span className={cn('flex min-w-0 flex-col leading-none', stacked && 'gap-0.5')}>
          <span
            className={cn(
              'font-semibold tracking-[0.16em]',
              stacked ? 'text-[22px]' : 'text-[17px]',
              wordTone,
            )}
          >
            AURA
          </span>
          {tagline ? (
            <span className={cn('mt-1 text-[11px] tracking-wide', parentTone)}>{tagline}</span>
          ) : null}
        </span>
      )}
    </span>
  );
}

export default AuraLogo;
