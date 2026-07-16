/**
 * ProvenanceBadge — shared UI for surfacing data provenance to the user.
 *
 * This is the single visual truth-in-UI control. Any KPI, section header, or
 * card that shows an operational value must render this badge alongside it.
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, CircleDashed, FlaskConical, Sparkles, Target, WifiOff } from 'lucide-react';
import type { ProvenanceMeta } from '@/lib/provenance/types';
import { provenanceLabel } from '@/lib/provenance';
import { cn } from '@/lib/utils';

interface ProvenanceBadgeProps {
  meta: ProvenanceMeta;
  compact?: boolean;
  className?: string;
}

const iconFor = {
  live:        Activity,
  derived:     Sparkles,
  simulated:   FlaskConical,
  demo:        CircleDashed,
  static:      Target,
  unavailable: WifiOff,
} as const;

const variantFor = {
  live:        'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  derived:     'bg-sky-500/10 text-sky-600 border-sky-500/30',
  simulated:   'bg-violet-500/10 text-violet-600 border-violet-500/30',
  demo:        'bg-amber-500/10 text-amber-700 border-amber-500/30',
  static:      'bg-slate-500/10 text-slate-600 border-slate-500/30',
  unavailable: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
} as const;

export function ProvenanceBadge({ meta, compact = false, className }: ProvenanceBadgeProps) {
  const Icon = iconFor[meta.provenance];
  const label = provenanceLabel(meta.provenance);

  const timestamp = meta.at ? meta.at.toLocaleString() : 'no timestamp';
  const stale = meta.stale ? ' (stale)' : '';
  const connection = meta.connection ? ` · ${meta.connection}` : '';

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            aria-label={`Provenance: ${label}. Source: ${meta.source}. ${timestamp}${stale}${connection}.`}
            className={cn('gap-1 font-medium', variantFor[meta.provenance], className)}
          >
            <Icon className="h-3 w-3" aria-hidden />
            {!compact && <span>{label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <div className="space-y-1">
            <div className="font-semibold">{label}</div>
            <div>Source: <span className="font-mono">{meta.source}</span></div>
            <div>Last observed: {timestamp}{stale}</div>
            {meta.connection && <div>Connection: {meta.connection}</div>}
            {meta.note && <div className="opacity-80">{meta.note}</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Explicit banner-reason discriminator (Phase 1A.1).
 *
 * We intentionally do NOT derive the banner text from the meta object alone,
 * because the caller needs to distinguish between:
 *   - Kit REST invalid (schema mismatch — payload was rejected)
 *   - Kit REST unreachable / non-2xx
 *   - Kit disabled by configuration
 *   - WebRTC stream demo fallback (Kit REST may still be healthy)
 * Collapsing these into a generic "demo" banner hides operational cause.
 */
export type StreamBannerReason =
  | 'kit-invalid'
  | 'kit-unavailable'
  | 'kit-disabled'
  | 'stream-connecting'
  | 'stream-degraded'
  | 'stream-demo';

export const STREAM_BANNER_MESSAGES: Record<StreamBannerReason, string> = {
  // Verbatim strings mandated by Phase 1A.1 spec.
  'kit-invalid':       'Kit response invalid — displaying local demonstration data.',
  'kit-unavailable':   'Kit unavailable — displaying local demonstration data.',
  'kit-disabled':      'Kit disabled by configuration — displaying local demonstration data.',
  'stream-connecting': 'Connecting to Omniverse stream…',
  'stream-degraded':   'Omniverse stream degraded — displaying local demonstration data.',
  'stream-demo':       'Local demonstration scene — Omniverse stream unavailable.',
};

/**
 * StreamStatusBanner — one-line banner shown above the visualization when
 * the Omniverse Kit connection is not `connected`. Replaces the silent
 * "Omniverse RTX Viewport" label with an honest, cause-specific state string.
 *
 * The `reason` prop is authoritative — pass `null` to hide the banner (e.g.
 * when the Kit is connected and the stream is live). The legacy `meta` prop
 * is retained for compatibility; when `reason` is omitted it maps
 * `meta.connection` to the closest reason, defaulting to `stream-demo`.
 */
export function StreamStatusBanner({
  reason,
  meta,
}: {
  reason?: StreamBannerReason | null;
  meta?: ProvenanceMeta;
}) {
  if (reason === null) return null;
  const resolved: StreamBannerReason | null =
    reason !== undefined
      ? reason
      : meta
        ? meta.connection === 'connected'   ? null
        : meta.connection === 'disabled'    ? 'kit-disabled'
        : meta.connection === 'connecting'  ? 'stream-connecting'
        : meta.connection === 'degraded'    ? 'stream-degraded'
        : meta.connection === 'unavailable' ? 'kit-unavailable'
        :                                     'stream-demo'
        : 'stream-demo';

  if (resolved === null) return null;

  return (
    <div
      role="status"
      data-banner-reason={resolved}
      className="w-full rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900 dark:text-amber-200"
    >
      {STREAM_BANNER_MESSAGES[resolved]}
    </div>
  );
}