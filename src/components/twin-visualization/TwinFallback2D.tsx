/**
 * Non-WebGL fallback visualisation.
 *
 * When the browser cannot render the 3D twin (software renderer, blocked GPU,
 * missing WebGL 2) we still owe the operator the same information the 3D scene
 * carries: where the racks are, how loaded they are and which ones are hot or
 * critical. This renders that as an accessible 2D floor plan plus concrete
 * next steps, instead of a dead-end error card.
 */
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Cpu, MonitorX, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RackVisual, RowVisual } from './types';
import type { WebGLCapabilityReport, WebGLCapabilityStatus } from './webglCapability';

export interface TwinFallback2DProps {
  report: WebGLCapabilityReport;
  racks: RackVisual[];
  rows: RowVisual[];
  compact?: boolean;
  onRetry?: () => void;
  onRackClick?: (rackId: string) => void;
}

const STATUS_COPY: Record<
  WebGLCapabilityStatus,
  { title: string; icon: 'monitor' | 'cpu' | 'alert'; steps: string[] }
> = {
  ok: { title: '3D twin ready', icon: 'monitor', steps: [] },
  'webgl1-only': {
    title: '3D twin needs WebGL 2',
    icon: 'monitor',
    steps: [
      'Update your browser to its latest version.',
      'Enable hardware acceleration in browser settings, then reload.',
      'Use the 2D floor plan below in the meantime - it carries the same rack data.',
    ],
  },
  software: {
    title: '3D twin unavailable (software renderer)',
    icon: 'cpu',
    steps: [
      'Turn on "Use hardware acceleration when available" in your browser settings and reload.',
      'On desktop, update the GPU driver; on virtual desktops, ask IT to enable GPU passthrough.',
      'Use the 2D floor plan below - rack load, temperature and criticality are unchanged.',
    ],
  },
  blocklisted: {
    title: '3D twin blocked by browser',
    icon: 'alert',
    steps: [
      'Your browser has disabled WebGL or blocklisted this GPU.',
      'Enable hardware acceleration and reload, or open the twin on another device.',
      'Continue in the 2D floor plan below.',
    ],
  },
  unsupported: {
    title: '3D twin not supported on this device',
    icon: 'monitor',
    steps: [
      'Open the twin in a current Chrome, Edge, Firefox or Safari build.',
      'Mobile GPUs may refuse the scene; a desktop browser is the reliable path.',
      'Continue in the 2D floor plan below.',
    ],
  },
  unknown: {
    title: '3D twin could not initialise',
    icon: 'alert',
    steps: [
      'Reload the page, then recheck WebGL with the button below.',
      'If it keeps failing, open the twin in another browser.',
      'Continue in the 2D floor plan below.',
    ],
  },
};

/** Colour band for a rack, driven by inlet temperature. */
function thermalClass(rack: RackVisual): string {
  if (rack.isCritical) return 'bg-red-500/25 border-red-400/70 text-red-100';
  if (rack.thermalCelsius >= 32) return 'bg-orange-500/25 border-orange-400/70 text-orange-100';
  if (rack.thermalCelsius >= 27) return 'bg-amber-500/20 border-amber-400/60 text-amber-100';
  return 'bg-emerald-500/15 border-emerald-400/50 text-emerald-100';
}

export function TwinFallback2D({
  report,
  racks,
  rows,
  compact,
  onRetry,
  onRackClick,
}: TwinFallback2DProps) {
  const copy = STATUS_COPY[report.status] ?? STATUS_COPY.unknown;
  const Icon = copy.icon === 'cpu' ? Cpu : copy.icon === 'alert' ? AlertTriangle : MonitorX;

  const totalKw = racks.reduce((sum, r) => sum + (r.powerKw ?? 0), 0);
  const hottest = racks.reduce<RackVisual | null>(
    (max, r) => (!max || r.thermalCelsius > max.thermalCelsius ? r : max),
    null,
  );
  const criticalCount = racks.filter((r) => r.isCritical).length;

  const orderedRows = rows.length
    ? rows
    : [{ id: 'all', name: 'Unassigned', position: [0, 0, 0] as [number, number, number], rackCount: racks.length, isHotAisle: false }];

  return (
    <div
      className={`w-full rounded-lg border border-slate-700/50 bg-[#0a0a14] p-4 ${
        compact ? 'min-h-72' : 'min-h-[450px]'
      }`}
      data-testid="twin-fallback-2d"
    >
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Explanation and next steps */}
        <div className="lg:w-72 shrink-0 space-y-3" role="status" aria-live="polite">
          <div className="flex items-start gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-300">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{copy.title}</h3>
              <p className="mt-1 text-xs text-slate-300">{report.reason}</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Next steps
            </h4>
            <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-slate-300">
              {copy.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="gap-2 border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Recheck WebGL
              </Button>
            )}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="gap-1 text-slate-200 hover:bg-slate-800"
            >
              <Link to="/dsx/evidence-beta/assets">
                Open asset evidence
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {report.renderer && (
            <p className="truncate font-mono text-[11px] text-slate-400">
              Renderer: {report.renderer}
            </p>
          )}
        </div>

        {/* 2D floor plan */}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              2D floor plan (same modelled data)
            </h4>
            <dl className="flex flex-wrap gap-3 text-[11px] text-slate-300">
              <div className="flex gap-1">
                <dt className="text-slate-400">Racks</dt>
                <dd className="font-medium">{racks.length}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-slate-400">Load</dt>
                <dd className="font-medium">{totalKw.toFixed(1)} kW</dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-slate-400">Peak inlet</dt>
                <dd className="font-medium">
                  {hottest ? `${hottest.thermalCelsius.toFixed(1)} C` : 'n/a'}
                </dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-slate-400">Critical</dt>
                <dd className="font-medium">{criticalCount}</dd>
              </div>
            </dl>
          </div>

          {racks.length === 0 ? (
            <p className="rounded-md border border-slate-700/50 bg-slate-900/40 p-4 text-xs text-slate-300">
              No racks are modelled for this facility yet, so there is nothing to draw in 2D either.
            </p>
          ) : (
            <div className="space-y-3">
              {orderedRows.map((row) => {
                const rowRacks = racks.filter((r) => r.rowId === row.id || orderedRows.length === 1);
                if (rowRacks.length === 0) return null;
                return (
                  <section key={row.id} aria-label={`Row ${row.name}`}>
                    <p className="mb-1 text-[11px] font-medium text-slate-400">
                      {row.name}
                      {row.isHotAisle ? ' (hot aisle)' : ''}
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {rowRacks.map((rack) => {
                        const label = `${rack.name}: ${rack.utilizationPercent.toFixed(0)}% used, ${rack.powerKw.toFixed(1)} kW, ${rack.thermalCelsius.toFixed(1)} C${rack.isCritical ? ', critical' : ''}`;
                        return (
                          <li key={rack.id}>
                            <button
                              type="button"
                              onClick={() => onRackClick?.(rack.id)}
                              aria-label={label}
                              title={label}
                              className={`min-h-11 min-w-11 rounded border px-2 py-1 text-[11px] leading-tight transition-colors hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${thermalClass(rack)}`}
                            >
                              <span className="block font-medium">{rack.name}</span>
                              <span className="block opacity-80">
                                {rack.thermalCelsius.toFixed(0)} C
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}

              <ul className="flex flex-wrap gap-3 pt-1 text-[11px] text-slate-300">
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" aria-hidden="true" />
                  Under 27 C
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" aria-hidden="true" />
                  27-32 C
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-orange-400" aria-hidden="true" />
                  Above 32 C
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-red-400" aria-hidden="true" />
                  Critical
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
