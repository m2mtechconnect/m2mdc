/**
 * Stage 7D - deterministic rack grid derived from the facility definition.
 *
 * This module is the single owner of per-rack modelled values. The floor plan
 * renders it and the Rack Quick View reads it, so a rack can never show one
 * load in the visualisation and a different one in its detail record.
 *
 * Every value is a deterministic function of the facility record. Nothing here
 * is measured telemetry: fields that the model does not represent are reported
 * as unavailable rather than invented.
 */
import { RUN_UNAVAILABLE_LABEL } from '@/capabilities/runProvenance';
import { seededRandom, type FacilityDefinition } from '../facilityModel';

export type RackState = 'within' | 'watch' | 'constraint' | 'unknown' | 'unavailable';

export const RACK_STATE_LABEL: Record<RackState, string> = {
  within: 'Within target',
  watch: 'Watch',
  constraint: 'Constraint',
  unknown: 'Unknown',
  unavailable: 'Unavailable',
};

export interface RackNode {
  /** Stable asset id, e.g. `rack-1-5`. */
  id: string;
  /** Human rack code, e.g. `A5`. Also the URL selection token. */
  code: string;
  rowIndex: number;
  colIndex: number;
  rowLetter: string;
  /** Modelled utilisation fraction 0..1, or null when not represented. */
  load: number | null;
  state: RackState;
  /** Cold or hot aisle the rack faces, from the alternating aisle layout. */
  aisleLabel: string;
  /** False when the position exists in the grid but not in the modelled rack count. */
  represented: boolean;
}

export interface RackGrid {
  racks: RackNode[];
  perRow: number;
  rowCount: number;
  byId: Map<string, RackNode>;
  byCode: Map<string, RackNode>;
}

function stateForLoad(load: number): RackState {
  if (!Number.isFinite(load)) return 'unknown';
  if (load > 0.92) return 'constraint';
  if (load > 0.8) return 'watch';
  return 'within';
}

/**
 * Builds the rack grid for a facility. The PRNG sequence matches the order the
 * floor plan draws (row-major), so ids, colours and detail records agree.
 */
export function buildRackGrid(facility: FacilityDefinition): RackGrid {
  const rowCount = Math.max(1, facility.rowCount);
  const perRow = Math.max(1, Math.ceil(facility.rackCount / rowCount));
  const rng = seededRandom(`${facility.id}:floorplan`);
  const racks: RackNode[] = [];

  for (let r = 0; r < rowCount; r += 1) {
    const rowLetter = String.fromCharCode(65 + r);
    const coldAisle = r % 2 === 0;
    for (let i = 0; i < perRow; i += 1) {
      const value = rng();
      const ordinal = r * perRow + i;
      const represented = ordinal < facility.rackCount;
      racks.push({
        id: `rack-${r + 1}-${i + 1}`,
        code: `${rowLetter}${i + 1}`,
        rowIndex: r,
        colIndex: i,
        rowLetter,
        load: represented ? value : null,
        state: represented ? stateForLoad(value) : 'unavailable',
        aisleLabel: `${coldAisle ? 'Cold' : 'Hot'} aisle ${Math.floor(r / 2) + 1}`,
        represented,
      });
    }
  }

  return {
    racks,
    perRow,
    rowCount,
    byId: new Map(racks.map((rack) => [rack.id, rack])),
    byCode: new Map(racks.map((rack) => [rack.code.toUpperCase(), rack])),
  };
}

export interface RackFieldValue {
  label: string;
  value: string;
  /** True when the model genuinely produced the value. */
  modelled: boolean;
}

export interface RackDetail {
  rack: RackNode;
  stateLabel: string;
  subtitle: string;
  overview: RackFieldValue[];
  constraints: Array<{ title: string; summary: string; impact: string; evidence: string }>;
  dependencies: RackFieldValue[];
  evidenceState: string;
}

const UNAVAILABLE = 'Unavailable';
const NOT_MODELLED = 'Not represented in the current model';

/** Assembles the full Rack Quick View record for a rack. */
export function buildRackDetail(
  rack: RackNode,
  facility: FacilityDefinition,
  calculatedAt: string,
): RackDetail {
  const assignedKw = facility.rackCount > 0 ? facility.capacityKw / facility.rackCount : NaN;
  const load = rack.load;
  const modelledKw = load !== null && Number.isFinite(assignedKw) ? assignedKw * load : null;

  const overview: RackFieldValue[] = [
    {
      label: 'Modelled IT load',
      value: modelledKw === null ? UNAVAILABLE : `${modelledKw.toFixed(1)} kW`,
      modelled: modelledKw !== null,
    },
    {
      label: 'Assigned capacity',
      value: Number.isFinite(assignedKw) ? `${assignedKw.toFixed(1)} kW` : UNAVAILABLE,
      modelled: Number.isFinite(assignedKw),
    },
    {
      label: 'Capacity utilisation',
      value: load === null ? UNAVAILABLE : `${Math.round(load * 100)}%`,
      modelled: load !== null,
    },
    {
      // The facility model carries no per-rack thermal solution.
      label: 'Modelled temperature',
      value: NOT_MODELLED,
      modelled: false,
    },
    {
      label: 'Power path',
      value: rack.represented
        ? `PDU ${rack.rowLetter}${rack.colIndex % 2 === 0 ? 'A' : 'B'} (modelled assignment)`
        : NOT_MODELLED,
      modelled: rack.represented,
    },
    {
      label: 'Cooling zone',
      value: rack.represented ? rack.aisleLabel : NOT_MODELLED,
      modelled: rack.represented,
    },
    {
      label: 'Last calculation',
      value: calculatedAt,
      modelled: calculatedAt !== RUN_UNAVAILABLE_LABEL,
    },
    {
      label: 'Evidence state',
      value: rack.represented ? 'Calculated from the synthetic design baseline' : 'No supporting Evidence',
      modelled: rack.represented,
    },
  ];

  const constraints: RackDetail['constraints'] = [];
  if (rack.state === 'constraint') {
    constraints.push({
      title: 'Capacity constraint',
      summary: 'Modelled utilisation exceeds the design threshold for this rack position.',
      impact: 'No modelled headroom for additional equipment in this position.',
      evidence: 'Calculated from the current synthetic design baseline.',
    });
  } else if (rack.state === 'watch') {
    constraints.push({
      title: 'Capacity watch',
      summary: 'Modelled utilisation is above the preferred design threshold.',
      impact: 'Less flexibility for additional equipment.',
      evidence: 'Calculated from the current synthetic design baseline.',
    });
  } else if (rack.state === 'unavailable') {
    constraints.push({
      title: 'Rack not represented individually',
      summary: 'This grid position is outside the modelled rack count for the facility.',
      impact: 'Load for this position is carried by the aggregate facility model.',
      evidence: 'No supporting Evidence.',
    });
  }

  const dependencies: RackFieldValue[] = [
    { label: 'Row', value: `Row ${rack.rowLetter}`, modelled: true },
    {
      label: 'PDU',
      value: rack.represented ? `PDU ${rack.rowLetter}${rack.colIndex % 2 === 0 ? 'A' : 'B'}` : NOT_MODELLED,
      modelled: rack.represented,
    },
    { label: 'Cooling zone', value: rack.represented ? rack.aisleLabel : NOT_MODELLED, modelled: rack.represented },
    { label: 'Network zone', value: NOT_MODELLED, modelled: false },
    { label: 'Dependent equipment', value: NOT_MODELLED, modelled: false },
  ];

  return {
    rack,
    stateLabel: RACK_STATE_LABEL[rack.state],
    subtitle: `Row ${rack.rowLetter} · ${rack.represented ? rack.aisleLabel : 'Aisle unavailable'} · Modelled asset`,
    overview,
    constraints,
    dependencies,
    evidenceState: rack.represented
      ? 'Synthetic design baseline'
      : 'No supporting Evidence',
  };
}

export class RackDetailError extends Error {}

/**
 * Asynchronous accessor so the Quick View has a real pending state. Resolves
 * from local derived model state; rejects only when the rack id is unknown, so
 * a failed request can never be presented as an empty success.
 */
export function loadRackDetail(
  rackId: string,
  grid: RackGrid,
  facility: FacilityDefinition,
  calculatedAt: string,
): Promise<RackDetail> {
  return Promise.resolve().then(() => {
    const rack = grid.byId.get(rackId) ?? grid.byCode.get(rackId.toUpperCase());
    if (!rack) throw new RackDetailError(`Unknown rack ${rackId}`);
    return buildRackDetail(rack, facility, calculatedAt);
  });
}
