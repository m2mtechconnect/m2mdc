/**
 * AURA logo system.
 * Vector AURA Node mark: a geometric letter A built from connected
 * compute paths with one central green intelligence node.
 * Presentation only: no routing, auth or data behaviour.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AuraNodeMarkProps extends React.SVGProps<SVGSVGElement> {
  /** Stroke/structure tone. `light` for dark backgrounds, `dark` for light backgrounds. */
  tone?: 'light' | 'dark' | 'current';
  /** Render the intelligence node in the structure colour for one-colour applications. */
  monochrome?: boolean;
  title?: string;
}

/**
 * Icon-only AURA mark.
 * A single architectural silhouette surrounds a carved data aperture. The
 * lone green square is the intelligence point and remains legible at 16px.
 */
export function AuraNodeMark({
  tone = 'current',
  monochrome = false,
  title,
  className,
  ...props
}: AuraNodeMarkProps) {
  const structureClass = tone === 'light'
    ? 'text-[hsl(var(--logo-on-dark))]'
    : tone === 'dark'
      ? 'text-[hsl(var(--logo-on-light))]'
      : undefined;
  return (
    <svg
      viewBox="0 0 48 48"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={cn('shrink-0', structureClass, className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {/* Solid architectural A with a precise, open data-channel aperture. */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M24 2 47 44H35.2l-4.1-8H16.9l-4.1 8H1L24 2Zm0 14.2-6.6 13h13.2l-6.6-13Z"
        clipRule="evenodd"
      />
      {/* One intelligence point. No secondary nodes compete with the silhouette. */}
      <rect
        x="20.5"
        y="25.5"
        width="7"
        height="7"
        fill={monochrome ? 'currentColor' : 'hsl(var(--aura-node))'}
      />
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
  const wordTone = surface === 'dark' ? 'text-[hsl(var(--logo-on-dark))]' : 'text-[hsl(var(--logo-on-light))]';
  const parentTone = surface === 'dark' ? 'text-[hsl(var(--logo-muted-on-dark))]' : 'text-[hsl(var(--text-muted))]';
  const dividerTone = surface === 'dark' ? 'bg-[hsl(var(--logo-divider))]' : 'bg-[hsl(var(--v2-line))]';
  const stacked = variant === 'stacked' && !compact;

  return (
    <span
      className={cn(
        'flex min-w-0',
        stacked ? 'flex-col items-center gap-1.5' : 'items-center gap-2.5',
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
        className={cn(stacked ? 'h-10 w-10' : 'h-8 w-8')}
      />
      {!compact && (
        <span className={cn('flex min-w-0 flex-col leading-none', stacked && 'gap-0.5')}>
          <span
            className={cn(
              'font-bold tracking-[0.18em]',
              stacked ? 'text-xl' : 'text-lg',
              wordTone,
            )}
          >
            AURA
          </span>
          {tagline ? (
            <span className={cn('mt-1 text-xs tracking-wide', parentTone)}>{tagline}</span>
          ) : null}
        </span>
      )}
    </span>
  );
}

export default AuraLogo;
