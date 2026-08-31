/**
 * OpenUSD / asset-structure corpus (v-pinned, original prose).
 *
 * OpenUSD (Universal Scene Description) is an open interchange standard
 * governed by the Alliance for OpenUSD. This corpus covers it conceptually
 * for facility-twin asset design. Provider-neutral wording is mandatory:
 * nothing here claims any vendor visualization platform is wired in.
 */
import type { EngineeringKnowledgeEntry } from '../engineeringKnowledgeTypes';

export const OPENUSD_ASSETS_CORPUS: EngineeringKnowledgeEntry[] = [
  {
    id: 'usd-composition-model',
    domain: 'openusd-assets',
    title: 'USD composition: stages, layers and opinion strength',
    guidance:
      'A USD stage is the composed view of one or more layers, each holding sparse opinions about prims ' +
      'and their properties. Composition arcs (sublayers, references, payloads, variant sets, inherits, ' +
      'specializes) combine those opinions under a deterministic strength ordering, so the same layer stack ' +
      'always resolves to the same scene. Author non-destructive overrides in stronger session or working ' +
      'layers instead of editing source assets, and keep each layer single-purpose (geometry, materials, ' +
      'facility overrides) so reviews can diff intent rather than a monolithic file.',
    keywords: ['usd', 'stage', 'layers', 'composition', 'arcs', 'prim', 'opinions', 'variant', 'strength'],
    citations: [
      {
        label: 'OpenUSD terms and concepts glossary',
        locator: 'https://openusd.org/release/glossary.html',
        kind: 'public-documentation',
      },
      {
        label: 'Alliance for OpenUSD',
        locator: 'https://aousd.org/',
        kind: 'public-specification',
      },
    ],
    restrictedClaimCategories: [],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'usd-asset-structure',
    domain: 'openusd-assets',
    title: 'Asset packaging: payloads, instancing and conventions',
    guidance:
      'Package each reusable asset with a small interface layer that a consumer references, and place heavy ' +
      'geometry behind a payload so large scenes load structure first and defer bulk data until needed. ' +
      'Mark repeated equipment (racks, cooling units) instanceable to keep memory bounded in large ' +
      'facilities. Fix stage-level conventions early (linear units, up axis, naming and kind hierarchy for ' +
      'model, group and component prims) and validate them in the asset pipeline, because mismatched ' +
      'conventions surface as silent scale and orientation defects that are expensive to trace later.',
    keywords: ['asset', 'payload', 'referencing', 'instancing', 'pipeline', 'units', 'axis', 'packaging'],
    citations: [
      {
        label: 'OpenUSD documentation index',
        locator: 'https://openusd.org/release/index.html',
        kind: 'public-documentation',
      },
    ],
    restrictedClaimCategories: [],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'usd-facility-twin-assets',
    domain: 'openusd-assets',
    title: 'Mapping facility hierarchies to scene description',
    guidance:
      'Map the facility containment hierarchy (site, hall, row, rack, device) directly onto the prim ' +
      'hierarchy so spatial queries and selection mirror the operational model. Carry operational ' +
      'identifiers as custom attributes in a dedicated namespace rather than encoding them into prim names, ' +
      'which keeps renames non-breaking. Keep the scene description provider-neutral: it describes ' +
      'structure and metadata that any standards-conformant viewer can consume, and a claim that a specific ' +
      'vendor platform renders or drives it requires runtime evidence under the guardrails before it may ' +
      'be stated.',
    keywords: ['facility', 'hierarchy', 'prim', 'twin', 'attributes', 'namespace', 'scene', 'mapping'],
    citations: [
      {
        label: 'OpenUSD terms and concepts glossary',
        locator: 'https://openusd.org/release/glossary.html',
        kind: 'public-documentation',
      },
      {
        label: 'AURA architecture document',
        locator: 'docs/AURA-DC-Architecture.md',
        kind: 'repository-artifact',
      },
    ],
    restrictedClaimCategories: ['integration'],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
];
