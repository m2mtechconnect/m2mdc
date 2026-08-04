/**
 * Canonical AURA asset-mapping contract.
 * Maps a source-system asset identifier to an AURA asset and OpenUSD prim.
 */
import { z } from 'zod';

export const ASSET_CLASSES = [
  'site',
  'data_hall',
  'rack',
  'cooling_unit',
  'cdu',
  'ups',
  'rpp',
  'sensor',
] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const MAPPING_APPROVAL = ['draft', 'pending_review', 'approved', 'rejected'] as const;
export type MappingApproval = (typeof MAPPING_APPROVAL)[number];

/** OpenUSD-style prim path: /World/Site_A/Hall_1/Rack_01 */
export const primPath = z
  .string()
  .regex(/^\/[A-Za-z0-9_]+(\/[A-Za-z0-9_]+)*$/, 'invalid OpenUSD prim path');

export const AssetMappingSchema = z
  .object({
    mapping_id: z.string().min(1),
    org_id: z.string().min(1),
    source_system: z.string().min(1),
    source_asset_id: z.string().min(1),
    aura_asset_id: z.string().min(1),
    usd_prim_path: primPath,
    asset_class: z.enum(ASSET_CLASSES),
    mapping_version: z.number().int().positive(),
    effective_from: z.string().min(1),
    effective_to: z.string().min(1).nullable(),
    approval_status: z.enum(MAPPING_APPROVAL),
    evidence_ref: z.string().min(1).nullable(),
    created_by: z.string().min(1),
    approved_by: z.string().min(1).nullable(),
  })
  .strict();

export type AssetMapping = z.infer<typeof AssetMappingSchema>;

export type MappingLookupResult =
  | { ok: true; mapping: AssetMapping }
  | { ok: false; reason: 'unknown_asset' | 'not_approved' | 'expired' };

/** Fail-closed lookup: unmapped or unapproved sources are quarantined. */
export function lookupMapping(
  mappings: readonly AssetMapping[],
  sourceSystem: string,
  sourceAssetId: string,
  atIso: string,
): MappingLookupResult {
  const candidates = mappings.filter(
    (m) => m.source_system === sourceSystem && m.source_asset_id === sourceAssetId,
  );
  if (candidates.length === 0) return { ok: false, reason: 'unknown_asset' };
  const at = Date.parse(atIso);
  const effective = candidates.filter(
    (m) => Date.parse(m.effective_from) <= at && (m.effective_to === null || Date.parse(m.effective_to) > at),
  );
  if (effective.length === 0) return { ok: false, reason: 'expired' };
  const approved = effective.filter((m) => m.approval_status === 'approved');
  if (approved.length === 0) return { ok: false, reason: 'not_approved' };
  const latest = approved.reduce((a, b) => (b.mapping_version > a.mapping_version ? b : a));
  return { ok: true, mapping: latest };
}