/**
 * Logical rack map for the declared data hall.
 *
 * Position comes from the declared rack order in the facility record; the
 * map is explicitly a logical layout, not a surveyed floor plan. A rack with
 * no accepted observation renders as "no observation", never as a cool,
 * healthy or zero-load rack.
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { DESIGN_INLET_LIMIT_C } from '@/dsx/metrics/computeKpis';
import type { RackReading } from '@/dsx/metrics/computeKpis';
import { EVIDENCE_BETA_RACKS } from '@/dsx/fixtures/evidenceBetaFacility';
import { identityBySourceId } from '@/dsx/workspaces/facilityGraph';

export type RackOverlay = 'thermal' | 'power' | 'cooling' | 'capacity' | 'evidence';

export const RACK_OVERLAYS: { id: RackOverlay; label: string }[] = [
  { id: 'thermal', label: 'Thermal' },
  { id: 'power', label: 'Power' },
  { id: 'cooling', label: 'Cooling' },
  { id: 'capacity', label: 'Capacity' },
  { id: 'evidence', label: 'Evidence coverage' },
];

interface Band {
  key: string;
  label: string;
  /** Semantic-neutral status classes; text always carries the meaning too. */
  className: string;
}

const UNAVAILABLE: Band = {
  key: 'unavailable',
  label: 'No observation',
  className: 'border-dashed border-zinc-400/70 bg-muted text-muted-foreground',
};

const BANDS: Record<Exclude<RackOverlay, 'evidence'>, Band[]> = {
  thermal: [
    { key: 'ok', label: `At or below ${DESIGN_INLET_LIMIT_C - 3} degC`, className: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100' },
    { key: 'watch', label: `Within 3 degC of ${DESIGN_INLET_LIMIT_C} degC`, className: 'border-amber-500/60 bg-amber-500/15 text-amber-900 dark:text-amber-100' },
    { key: 'over', label: `Above ${DESIGN_INLET_LIMIT_C} degC design limit`, className: 'border-red-500/60 bg-red-500/15 text-red-900 dark:text-red-100' },
  ],
  power: [
    { key: 'ok', label: 'Below 70% of rack rating', className: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100' },
    { key: 'watch', label: '70-90% of rack rating', className: 'border-amber-500/60 bg-amber-500/15 text-amber-900 dark:text-amber-100' },
    { key: 'over', label: 'Above 90% of rack rating', className: 'border-red-500/60 bg-red-500/15 text-red-900 dark:text-red-100' },
  ],
  cooling: [
    { key: 'crah1', label: 'Served by Cooling Unit 01', className: 'border-sky-500/50 bg-sky-500/10 text-sky-900 dark:text-sky-100' },
    { key: 'crah2', label: 'Served by Cooling Unit 02', className: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-900 dark:text-indigo-100' },
  ],
  capacity: [
    { key: 'ok', label: 'More than 3 degC headroom', className: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100' },
    { key: 'watch', label: '0-3 degC headroom', className: 'border-amber-500/60 bg-amber-500/15 text-amber-900 dark:text-amber-100' },
    { key: 'over', label: 'No headroom remaining', className: 'border-red-500/60 bg-red-500/15 text-red-900 dark:text-red-100' },
  ],
};

const EVIDENCE_BANDS: Band[] = [
  { key: 'full', label: 'Inlet and power observed, mapping approved', className: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100' },
  { key: 'partial', label: 'Partial observation or mapping pending', className: 'border-amber-500/60 bg-amber-500/15 text-amber-900 dark:text-amber-100' },
  { key: 'none', label: 'No accepted observation', className: UNAVAILABLE.className },
];

function classify(overlay: RackOverlay, rack: RackReading): { band: Band; value: string } {
  const identity = identityBySourceId(rack.source_asset_id);
  const declared = EVIDENCE_BETA_RACKS.find((r) => r.source_asset_id === rack.source_asset_id);

  if (overlay === 'evidence') {
    const approved = identity?.mapping_approval === 'approved';
    const both = rack.inlet_c !== null && rack.it_power_kw !== null;
    const band = both && approved ? EVIDENCE_BANDS[0] : rack.inlet_c !== null || rack.it_power_kw !== null ? EVIDENCE_BANDS[1] : EVIDENCE_BANDS[2];
    return { band, value: approved ? 'mapping approved' : `mapping ${identity?.mapping_approval ?? 'unknown'}` };
  }

  if (overlay === 'cooling') {
    const unit = declared?.connection_points.find((c) => c.startsWith('CRAH-'));
    if (!unit) return { band: UNAVAILABLE, value: 'no declared cooling unit' };
    return { band: unit === 'CRAH-01' ? BANDS.cooling[0] : BANDS.cooling[1], value: unit };
  }

  if (overlay === 'power') {
    if (rack.it_power_kw === null) return { band: UNAVAILABLE, value: 'Unavailable' };
    const rated = declared?.rated_kw ?? null;
    if (!rated) return { band: UNAVAILABLE, value: `${rack.it_power_kw.toFixed(1)} kW (no rating declared)` };
    const pct = (rack.it_power_kw / rated) * 100;
    const band = pct >= 90 ? BANDS.power[2] : pct >= 70 ? BANDS.power[1] : BANDS.power[0];
    return { band, value: `${rack.it_power_kw.toFixed(1)} kW · ${pct.toFixed(0)}%` };
  }

  if (rack.inlet_c === null) return { band: UNAVAILABLE, value: 'Unavailable' };
  const headroom = DESIGN_INLET_LIMIT_C - rack.inlet_c;
  if (overlay === 'capacity') {
    const band = headroom <= 0 ? BANDS.capacity[2] : headroom <= 3 ? BANDS.capacity[1] : BANDS.capacity[0];
    return { band, value: `${headroom.toFixed(1)} degC headroom` };
  }
  const band = headroom <= 0 ? BANDS.thermal[2] : headroom <= 3 ? BANDS.thermal[1] : BANDS.thermal[0];
  return { band, value: `${rack.inlet_c.toFixed(1)} degC` };
}

export function RackMapLegend({ overlay }: { overlay: RackOverlay }) {
  const bands = overlay === 'evidence' ? EVIDENCE_BANDS : [...BANDS[overlay], UNAVAILABLE];
  return (
    <ul
      data-testid="dsx-rack-map-legend"
      aria-label="Rack map legend"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground"
    >
      {bands.map((b) => (
        <li key={b.key} className="flex items-center gap-1.5">
          <span aria-hidden className={cn('h-2.5 w-2.5 rounded-sm border', b.className)} />
          {b.label}
        </li>
      ))}
    </ul>
  );
}

export function RackMap({ overlay }: { overlay: RackOverlay }) {
  const { rt, selectAsset, selectedAssetId } = useWorkspace();
  const cells = useMemo(
    () => rt.bundle.racks.map((r) => ({ rack: r, ...classify(overlay, r) })),
    [rt.bundle.racks, overlay],
  );

  return (
    <div className="space-y-3">
      <div
        data-testid="dsx-rack-map"
        data-overlay={overlay}
        role="group"
        aria-label={`Data Hall 1 logical rack map, ${overlay} overlay`}
        className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2"
      >
        {cells.map(({ rack, band, value }) => {
          const active = selectedAssetId === rack.aura_asset_id;
          return (
            <button
              key={rack.aura_asset_id}
              type="button"
              onClick={() => selectAsset(rack.aura_asset_id)}
              data-testid={`dsx-select-asset-${rack.source_asset_id}`}
              data-aura-id={rack.aura_asset_id}
              data-band={band.key}
              aria-pressed={active}
              className={cn(
                'flex min-h-11 min-w-0 flex-col gap-0.5 rounded-md border p-2 text-left text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                band.className,
                active && 'ring-2 ring-ring',
              )}
            >
              <span className="truncate text-[13px] font-semibold">{rack.name}</span>
              <span className="truncate tabular-nums">{value}</span>
              <span className="truncate text-[12px] opacity-80">{band.label}</span>
            </button>
          );
        })}
      </div>
      <RackMapLegend overlay={overlay} />
    </div>
  );
}