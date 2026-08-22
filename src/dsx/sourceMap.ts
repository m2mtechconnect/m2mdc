import { z } from 'zod';
import {
  DSX_ASSET_REQUIREMENTS,
  type DsxAssetRequirement,
} from './blueprintAssetRequirements';
import { NVIDIA_DSX_CONTENT_PACK } from './sourceCatalog';

export const DSX_SOURCE_MAP_VERSION = '1.0.0' as const;

export const DSX_MAPPING_STATES = ['unresolved', 'candidate', 'verified'] as const;
export type DsxMappingState = (typeof DSX_MAPPING_STATES)[number];

export const DSX_MODEL_FAMILIES = [
  'GB200',
  'GB300',
  'shared-rack',
  'network',
  'cooling',
  'power',
  'core-services',
  'storage',
  'facility',
  'unknown',
] as const;
export type DsxModelFamily = (typeof DSX_MODEL_FAMILIES)[number];

const SHA256 = /^sha256:[0-9a-f]{64}$/;
const requirementByRole = new Map(
  DSX_ASSET_REQUIREMENTS.map((requirement) => [requirement.semanticRole, requirement]),
);
const requirementById = new Map(
  DSX_ASSET_REQUIREMENTS.map((requirement) => [requirement.id, requirement]),
);

const mappingSchema = z
  .object({
    requirementId: z.string().min(1),
    semanticRole: z.string().min(1),
    mappingStatus: z.enum(DSX_MAPPING_STATES),
    modelFamily: z.enum(DSX_MODEL_FAMILIES),
    sourceUsdPath: z.string().min(1).nullable(),
    usdPrimPath: z.string().min(1).nullable(),
    sourceChecksum: z.string().regex(SHA256).nullable(),
    evidenceSource: z.enum(['private-inventory', 'manual-review', 'public-blueprint-code']),
    notes: z.string().min(1).optional(),
  })
  .superRefine((mapping, ctx) => {
    const requirement = requirementByRole.get(mapping.semanticRole);
    if (!requirement) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['semanticRole'],
        message: `Unknown DSX semantic role: ${mapping.semanticRole}`,
      });
      return;
    }
    if (mapping.requirementId !== requirement.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requirementId'],
        message: `Requirement ${mapping.requirementId} does not match ${mapping.semanticRole} (${requirement.id}).`,
      });
    }
    if (mapping.mappingStatus === 'verified') {
      if (!mapping.sourceUsdPath) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sourceUsdPath'],
          message: 'Verified mapping requires the source USD path.',
        });
      }
      if (!mapping.usdPrimPath) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['usdPrimPath'],
          message: 'Verified mapping requires an exact USD prim path.',
        });
      }
      if (!mapping.sourceChecksum) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sourceChecksum'],
          message: 'Verified mapping requires a source checksum.',
        });
      }
      if (mapping.evidenceSource === 'public-blueprint-code') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['evidenceSource'],
          message: 'Public application code alone cannot verify a proprietary USD source/prim mapping.',
        });
      }
    }
    if (mapping.mappingStatus === 'unresolved') {
      if (mapping.sourceUsdPath || mapping.usdPrimPath || mapping.sourceChecksum) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mappingStatus'],
          message: 'Unresolved mappings must not carry guessed source paths, prim paths, or checksums.',
        });
      }
    }
  });

export const dsxSourceMapSchema = z
  .object({
    sourceMapVersion: z.literal(DSX_SOURCE_MAP_VERSION),
    generatedAt: z.string().datetime(),
    sourcePack: z.object({
      id: z.literal(NVIDIA_DSX_CONTENT_PACK.id),
      version: z.literal(NVIDIA_DSX_CONTENT_PACK.version),
      expectedRootStage: z.literal(NVIDIA_DSX_CONTENT_PACK.expectedRootStage),
      rootStageChecksum: z.string().regex(SHA256).nullable(),
      licenceLabel: z.literal(NVIDIA_DSX_CONTENT_PACK.licenceLabel),
      productionRights: z.enum(['not-established', 'approved']),
      redistributionRights: z.enum(['not-established', 'approved']),
    }),
    mappings: z.array(mappingSchema),
  })
  .superRefine((sourceMap, ctx) => {
    const seenRoles = new Set<string>();
    const seenRequirements = new Set<string>();
    sourceMap.mappings.forEach((mapping, index) => {
      if (seenRoles.has(mapping.semanticRole)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mappings', index, 'semanticRole'],
          message: `Duplicate semantic role: ${mapping.semanticRole}`,
        });
      }
      if (seenRequirements.has(mapping.requirementId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mappings', index, 'requirementId'],
          message: `Duplicate requirement: ${mapping.requirementId}`,
        });
      }
      seenRoles.add(mapping.semanticRole);
      seenRequirements.add(mapping.requirementId);
    });

    for (const requirement of DSX_ASSET_REQUIREMENTS) {
      if (!seenRoles.has(requirement.semanticRole)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mappings'],
          message: `Missing DSX source-map entry for ${requirement.semanticRole}.`,
        });
      }
    }

    const anyVerified = sourceMap.mappings.some((mapping) => mapping.mappingStatus === 'verified');
    if (anyVerified && !sourceMap.sourcePack.rootStageChecksum) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourcePack', 'rootStageChecksum'],
        message: 'A source-pack root-stage checksum is required before any mapping can be verified.',
      });
    }
  });

export type DsxSourceMap = z.infer<typeof dsxSourceMapSchema>;
export type DsxSourceMapping = DsxSourceMap['mappings'][number];

export function parseDsxSourceMap(input: unknown): DsxSourceMap {
  return dsxSourceMapSchema.parse(input);
}

export interface DsxSourceMapSummary {
  total: number;
  unresolved: number;
  candidate: number;
  verified: number;
  rackVerified: number;
  rackRequired: number;
  allMappingsVerified: boolean;
  productionRightsEstablished: boolean;
  redistributionRightsEstablished: boolean;
}

export function summarizeDsxSourceMap(sourceMap: DsxSourceMap): DsxSourceMapSummary {
  const rackRequirements = DSX_ASSET_REQUIREMENTS.filter((requirement) => requirement.gates.includes('rack'));
  const verifiedRoles = new Set(
    sourceMap.mappings
      .filter((mapping) => mapping.mappingStatus === 'verified')
      .map((mapping) => mapping.semanticRole),
  );
  return {
    total: sourceMap.mappings.length,
    unresolved: sourceMap.mappings.filter((mapping) => mapping.mappingStatus === 'unresolved').length,
    candidate: sourceMap.mappings.filter((mapping) => mapping.mappingStatus === 'candidate').length,
    verified: sourceMap.mappings.filter((mapping) => mapping.mappingStatus === 'verified').length,
    rackVerified: rackRequirements.filter((requirement) => verifiedRoles.has(requirement.semanticRole)).length,
    rackRequired: rackRequirements.length,
    allMappingsVerified: sourceMap.mappings.every((mapping) => mapping.mappingStatus === 'verified'),
    productionRightsEstablished: sourceMap.sourcePack.productionRights === 'approved',
    redistributionRightsEstablished: sourceMap.sourcePack.redistributionRights === 'approved',
  };
}

export function requirementForSourceMapping(mapping: DsxSourceMapping): DsxAssetRequirement {
  const requirement = requirementById.get(mapping.requirementId);
  if (!requirement) throw new Error(`Unknown DSX requirement ${mapping.requirementId}`);
  return requirement;
}
