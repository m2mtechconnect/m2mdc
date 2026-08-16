/**
 * AURA-authored material presentation policy.
 *
 * Provenance: NVIDIA OpenUSD-derived geometry with AURA-authored material,
 * lighting and visualization enhancements. Nothing here edits vendor geometry,
 * prim paths or dimensions; it only assigns physically plausible PBR values to
 * the untextured materials that survive USD -> glTF conversion.
 *
 * The policy is pure data + pure functions so it can be unit tested without a
 * WebGL context. `applyMaterialPolicy` in `applyMaterialPolicy.ts` binds it to
 * three.js materials at runtime.
 */

import type { DistanceBand, SemanticRole } from './assetRegistry';

/** Physically distinct material families used across the reference facility. */
export type MaterialClass =
  | 'painted-steel'
  | 'bare-metal'
  | 'plastic-composite'
  | 'faceplate'
  | 'cable'
  | 'status-led'
  | 'glass';

export interface MaterialSpec {
  /** sRGB hex base colour. */
  color: number;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  /** Emissive colour, only ever set for the status-led class. */
  emissive?: number;
  emissiveIntensity?: number;
}

/**
 * Restrained, physically plausible values. No mirror-like reflections, no
 * pure black, no neon. Values were chosen for readability under the existing
 * facility lighting rig, not to imitate any reference render.
 */
export const MATERIAL_LIBRARY: Record<MaterialClass, MaterialSpec> = {
  // Powder-coated cabinet steel: graphite, not pure black, slight sheen.
  'painted-steel': { color: 0x2f333a, roughness: 0.62, metalness: 0.35, envMapIntensity: 0.5 },
  // Rails, brackets, chassis edges: metallic but restrained, never chrome.
  'bare-metal': { color: 0x9aa2ab, roughness: 0.42, metalness: 0.85, envMapIntensity: 0.6 },
  // Handles, bezel trim, blanking panels.
  'plastic-composite': { color: 0x4a4f57, roughness: 0.78, metalness: 0.02, envMapIntensity: 0.35 },
  // Server / switch faceplates: lighter than the cabinet so slots read.
  faceplate: { color: 0x707880, roughness: 0.55, metalness: 0.45, envMapIntensity: 0.55 },
  // Polymer jacket. Functional colour is assigned per bundle, not per cable.
  cable: { color: 0x2b2f36, roughness: 0.85, metalness: 0.0, envMapIntensity: 0.25 },
  // Small emissive elements; intensity is clamped by band below.
  'status-led': {
    color: 0x0f1114,
    roughness: 0.4,
    metalness: 0.0,
    envMapIntensity: 0.2,
    emissive: 0x39d98a,
    emissiveIntensity: 0.9,
  },
  glass: { color: 0x1b1f24, roughness: 0.12, metalness: 0.0, envMapIntensity: 0.9 },
};

/** Default class per semantic role when the mesh name carries no hint. */
const ROLE_DEFAULT: Record<SemanticRole, MaterialClass> = {
  'liquid-cooled-rack': 'painted-steel',
  'rack-core-reference': 'painted-steel',
  'server-1u': 'faceplate',
  'server-2u': 'faceplate',
  'network-switch': 'faceplate',
  'rack-pdu': 'plastic-composite',
  'liquid-cooling-equipment': 'bare-metal',
  'cable-tray': 'bare-metal',
  'blanking-panel': 'plastic-composite',
  'raised-floor-tile': 'painted-steel',
  'perforated-floor-tile': 'painted-steel',
  'data-hall-luminaire': 'plastic-composite',
  'structural-column': 'painted-steel',
  'facility-shell': 'painted-steel',
};

/**
 * Name hints, most specific first. Converted USD material and mesh names keep
 * their authored tokens, so this is a reliable signal for the pack's assets.
 */
const NAME_HINTS: Array<[RegExp, MaterialClass]> = [
  [/(^|[_\-.])(led|indicator|status|lamp)/i, 'status-led'],
  [/(cable|cord|whip|harness|jumper|patch)/i, 'cable'],
  [/(glass|window|acrylic|perspex)/i, 'glass'],
  [/(rail|bracket|screw|bolt|frame|chassis|tray|steelwork|mesh)/i, 'bare-metal'],
  [/(handle|bezel|trim|plastic|rubber|gasket|blank)/i, 'plastic-composite'],
  [/(paint|body|door|side|cabinet|enclosure|shell)/i, 'painted-steel'],
  [/(faceplate|frontplate|panel|fascia|vent|grill|grille|port)/i, 'faceplate'],
];

/**
 * Resolve the material class for one mesh/material name in a role's asset.
 * Name hints win over the role default so a rail inside a server reads as
 * metal rather than as a faceplate.
 */
export function classifyMaterial(role: SemanticRole, name: string | null | undefined): MaterialClass {
  const token = name ?? '';
  for (const [pattern, cls] of NAME_HINTS) {
    if (pattern.test(token)) return cls;
  }
  return ROLE_DEFAULT[role] ?? 'painted-steel';
}

/**
 * Detail policy by camera band. A farther band never receives richer
 * presentation than a nearer one.
 */
export interface BandPresentation {
  /** Emissive LEDs are suppressed at distance to avoid glowing dots. */
  emissiveScale: number;
  /** Environment reflection scale; distance bands stay flatter and cheaper. */
  envScale: number;
}

export const BAND_PRESENTATION: Record<DistanceBand, BandPresentation> = {
  overview: { emissiveScale: 0, envScale: 0.7 },
  nearby: { emissiveScale: 0.6, envScale: 1 },
  selected: { emissiveScale: 1, envScale: 1.15 },
};

/**
 * Final per-material values for a role at a band. `hasStateEvidence` gates the
 * LED emissive: with no measured equipment state the LED renders neutral
 * (unlit) rather than inventing a healthy indicator.
 */
export function resolveMaterialSpec(options: {
  role: SemanticRole;
  name?: string | null;
  band: DistanceBand;
  hasStateEvidence?: boolean;
  /** Operational state colour for LEDs when evidence exists. */
  stateEmissive?: number;
}): MaterialSpec & { materialClass: MaterialClass } {
  const materialClass = classifyMaterial(options.role, options.name);
  const base = MATERIAL_LIBRARY[materialClass];
  const band = BAND_PRESENTATION[options.band] ?? BAND_PRESENTATION.nearby;
  const spec: MaterialSpec & { materialClass: MaterialClass } = {
    ...base,
    materialClass,
    envMapIntensity: round(base.envMapIntensity * band.envScale),
  };

  if (materialClass === 'status-led') {
    const evidence = options.hasStateEvidence === true;
    spec.emissive = evidence ? (options.stateEmissive ?? base.emissive ?? 0x39d98a) : 0x000000;
    spec.emissiveIntensity = evidence
      ? round((base.emissiveIntensity ?? 0.9) * band.emissiveScale)
      : 0;
  } else {
    spec.emissive = 0x000000;
    spec.emissiveIntensity = 0;
  }

  return spec;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

/**
 * Stable cache key so one shared material instance is reused for every mesh
 * with the same class/band/state. Prevents per-server material explosion.
 */
export function materialCacheKey(spec: MaterialSpec & { materialClass: MaterialClass }): string {
  return [
    spec.materialClass,
    spec.color,
    spec.roughness,
    spec.metalness,
    spec.envMapIntensity,
    spec.emissive ?? 0,
    spec.emissiveIntensity ?? 0,
  ].join(':');
}
