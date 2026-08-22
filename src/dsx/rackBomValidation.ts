import type { RoleCoverage } from '@/components/twin-visualization/runtimeCoverageStore';
import type { SemanticRole } from '@/components/twin-visualization/assetRegistry';
import { DSX_RACK_BOM } from './blueprintAssetRequirements';

export type DsxRackBomRole =
  | 'dsx-compute-tray'
  | 'dsx-nvlink-switch-tray'
  | 'dsx-power-shelf'
  | 'dsx-tor-oob-switch';

export type DsxRackBomVerdict = 'pass' | 'missing' | 'excess' | 'blocked' | 'not-mounted';

export interface DsxRackBomRequirement {
  role: DsxRackBomRole;
  label: string;
  quantityPerRack: number;
}

export const DSX_RACK_BOM_REQUIREMENTS: readonly DsxRackBomRequirement[] = [
  {
    role: 'dsx-compute-tray',
    label: 'GB200/GB300 compute trays',
    quantityPerRack: DSX_RACK_BOM.computeTraysPerRack,
  },
  {
    role: 'dsx-nvlink-switch-tray',
    label: 'NVLink switch trays',
    quantityPerRack: DSX_RACK_BOM.nvlinkSwitchTraysPerRack,
  },
  {
    role: 'dsx-power-shelf',
    label: 'Power shelves',
    quantityPerRack: DSX_RACK_BOM.powerShelvesPerRack,
  },
  {
    role: 'dsx-tor-oob-switch',
    label: 'TOR/OOB switches',
    quantityPerRack: DSX_RACK_BOM.torOobSwitchesPerRack,
  },
] as const;

export interface DsxRackBomRow {
  role: DsxRackBomRole;
  label: string;
  rackCount: number;
  requiredPerRack: number;
  expectedObjects: number;
  mountedObjects: number;
  runtimeState: RoleCoverage['state'] | 'not-reported';
  verdict: DsxRackBomVerdict;
  detail: string;
}

export interface DsxRackBomReconciliation {
  rackCount: number;
  rows: DsxRackBomRow[];
  complete: boolean;
  expectedObjects: number;
  mountedObjects: number;
}

/**
 * Validate exact mounted quantities for one or more DSX GPU racks.
 *
 * The runtime coverage store aggregates exact semantic roles. This function
 * intentionally ignores legacy/generic roles; a server-1u or rack-pdu report
 * can never contribute to a DSX rack BOM.
 */
export function reconcileDsxRackBom(
  coverage: Record<string, RoleCoverage>,
  rackCount = 1,
): DsxRackBomReconciliation {
  if (!Number.isInteger(rackCount) || rackCount < 1) {
    throw new Error('DSX rack count must be a positive integer.');
  }

  const rows = DSX_RACK_BOM_REQUIREMENTS.map<DsxRackBomRow>((requirement) => {
    const report = coverage[requirement.role];
    const expectedObjects = requirement.quantityPerRack * rackCount;
    const mountedObjects = report?.mountedObjects ?? 0;
    const runtimeState = report?.state ?? 'not-reported';

    let verdict: DsxRackBomVerdict;
    if (report?.state === 'blocked') verdict = 'blocked';
    else if (!report || report.state !== 'openusd-derived') verdict = 'not-mounted';
    else if (mountedObjects < expectedObjects) verdict = 'missing';
    else if (mountedObjects > expectedObjects) verdict = 'excess';
    else verdict = 'pass';

    const detail =
      verdict === 'pass'
        ? `${mountedObjects}/${expectedObjects} exact-role objects mounted.`
        : verdict === 'blocked'
          ? `Runtime blocked the exact role: ${report?.detail ?? report?.failureReason ?? 'no reason recorded'}`
          : verdict === 'not-mounted'
            ? `No OpenUSD-derived exact-role mount. Required ${expectedObjects}.`
            : verdict === 'missing'
              ? `${mountedObjects}/${expectedObjects} mounted; ${expectedObjects - mountedObjects} missing.`
              : `${mountedObjects}/${expectedObjects} mounted; ${mountedObjects - expectedObjects} excess.`;

    return {
      role: requirement.role,
      label: requirement.label,
      rackCount,
      requiredPerRack: requirement.quantityPerRack,
      expectedObjects,
      mountedObjects,
      runtimeState,
      verdict,
      detail,
    };
  });

  return {
    rackCount,
    rows,
    complete: rows.every((row) => row.verdict === 'pass'),
    expectedObjects: rows.reduce((total, row) => total + row.expectedObjects, 0),
    mountedObjects: rows.reduce((total, row) => total + row.mountedObjects, 0),
  };
}

export function isDsxRackBomRole(role: SemanticRole): role is DsxRackBomRole {
  return DSX_RACK_BOM_REQUIREMENTS.some((requirement) => requirement.role === role);
}
