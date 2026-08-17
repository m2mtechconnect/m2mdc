/**
 * Centralised claims policy.
 *
 * Every NVIDIA / DSX / OpenUSD claim rendered in the UI, in a provenance
 * panel, in an export or in a report must pass through this policy. A claim
 * is prohibited unless the capability registry carries the evidence for it.
 */
import {
  DSX_CAPABILITIES,
  type DsxCapability,
  type DsxStatus,
} from './dsxCapabilityRegistry';

export interface ProhibitedClaim {
  /** Case-insensitive phrase that must not appear unqualified. */
  phrase: string;
  reason: string;
  /** Approved wording to use instead. */
  replacement: string;
  /** Status that would make the claim permissible, when one exists. */
  permittedWhen?: DsxStatus;
}

export const PROHIBITED_CLAIMS: ProhibitedClaim[] = [
  {
    phrase: 'full nvidia dsx implementation',
    reason: 'AURA maps to DSX architecture; it does not implement DSX.',
    replacement: 'DSX-aligned',
  },
  {
    phrase: 'omniverse-rendered',
    reason: 'Rendering happens in the AURA Web Runtime, not Omniverse Kit.',
    replacement: 'AURA Web Runtime',
  },
  {
    phrase: 'omniverse kit',
    reason: 'No Omniverse Kit session is reachable from the browser runtime.',
    replacement: 'AURA Web Runtime',
  },
  {
    phrase: 'rtx streaming',
    reason: 'No RTX stream is active.',
    replacement: 'AURA Web Runtime',
  },
  {
    phrase: 'simready',
    reason: 'SimReady requires validated electrical, thermal and connection-point metadata.',
    replacement: 'OpenUSD canonical asset',
    permittedWhen: 'SIMREADY_VALIDATED',
  },
  {
    phrase: 'dsx exchange connected',
    reason: 'No DSX Exchange distribution is deployed.',
    replacement: 'Integration not configured',
  },
  {
    phrase: 'nim-powered',
    reason: 'No NVIDIA NIM runtime is invoked.',
    replacement: 'AURA agent',
    permittedWhen: 'NVIDIA_INTEGRATED',
  },
  {
    phrase: 'max-q optimized',
    reason: 'No validated compute or power integration exists.',
    replacement: 'DSX-aligned efficiency indicator',
    permittedWhen: 'NVIDIA_INTEGRATED',
  },
  {
    phrase: 'dsx flex enabled',
    reason: 'No grid orchestration is implemented.',
    replacement: 'Planned grid orchestration',
  },
  {
    phrase: 'live telemetry',
    reason: 'Every rendered value is simulated, replayed or estimated.',
    replacement: 'Simulated result',
  },
];

/** Wording that is always safe because it is literally true of AURA today. */
export const APPROVED_CLAIMS = [
  'DSX-aligned',
  'NVIDIA OpenUSD-derived geometry',
  'AURA Web Runtime',
  'OpenUSD canonical asset',
  'Optimized browser derivative',
  'Simulated result',
  'Integration not configured',
  'Awaiting validation',
  'Planned Brev validation lane',
  'Planned AWS production lane',
] as const;

export type ApprovedClaim = (typeof APPROVED_CLAIMS)[number];

export interface ClaimViolation {
  phrase: string;
  reason: string;
  replacement: string;
}

function statusSupports(claim: ProhibitedClaim, capability?: DsxCapability): boolean {
  if (!claim.permittedWhen || !capability) return false;
  return capability.status === claim.permittedWhen;
}

/**
 * Inspects arbitrary user-facing text. Returns every prohibited claim the
 * text makes that the supplied capability cannot support.
 */
export function findClaimViolations(text: string, capability?: DsxCapability): ClaimViolation[] {
  const haystack = text.toLowerCase();
  return PROHIBITED_CLAIMS.filter(
    (c) => haystack.includes(c.phrase) && !statusSupports(c, capability),
  ).map(({ phrase, reason, replacement }) => ({ phrase, reason, replacement }));
}

export function isClaimAllowed(text: string, capability?: DsxCapability): boolean {
  return findClaimViolations(text, capability).length === 0;
}

/**
 * Rewrites a label to approved wording. Used by exports and reports so a
 * generated document can never carry a claim the UI would refuse to show.
 */
export function enforceClaims(text: string, capability?: DsxCapability): string {
  let out = text;
  for (const violation of findClaimViolations(text, capability)) {
    const re = new RegExp(violation.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
    out = out.replace(re, violation.replacement);
  }
  return out;
}

/** Claims a capability is allowed to make, derived from its evidence. */
export function allowedClaimsFor(capability: DsxCapability): string[] {
  const claims: string[] = [];
  if (capability.auraRuntime) claims.push('AURA Web Runtime');
  if (capability.openUsdCanonical) {
    claims.push('OpenUSD canonical asset', 'Optimized browser derivative');
  }
  if (capability.owner === 'AURA + NVIDIA-derived assets') {
    claims.push('NVIDIA OpenUSD-derived geometry');
  }
  if (capability.dsxArea !== 'Not a DSX component') claims.push('DSX-aligned');
  if (capability.status === 'PLANNED') claims.push('Awaiting validation');
  if (capability.simReadyValidated) claims.push('SimReady validated');
  return [...new Set(claims)];
}

/** Claims a capability must never make. */
export function prohibitedClaimsFor(capability: DsxCapability): string[] {
  return PROHIBITED_CLAIMS.filter((c) => !statusSupports(c, capability)).map((c) => c.phrase);
}

/** Every capability id that currently supports a SimReady claim. */
export function simReadyClaimants(): string[] {
  return DSX_CAPABILITIES.filter((c) => c.simReadyValidated).map((c) => c.id);
}