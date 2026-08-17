/**
 * AURA_ARCHITECTURE_CONSOLIDATION_AND_NVIDIA_ALIGNMENT - Phase 6.
 *
 * One declaration of what the messaging boundary actually is.
 *
 * Two different things were both being called "DSX Exchange":
 *
 *   1. AURA's own generic MQTT/NATS ingest bridge (`src/dsx/exchange/*`,
 *      `src/runtime/mqtt/*`). AURA implements it, it speaks plain MQTT or
 *      NATS, and it is currently exercised only against a local broker.
 *   2. NVIDIA's DSX Exchange distribution - a vendor product that is NOT
 *      deployed in any AURA environment and requires an entitlement.
 *
 * A generic MQTT or NATS transport is not DSX Exchange. This module keeps
 * the two names apart so no surface can imply AURA ships the vendor
 * product.
 */

export type ExchangeBoundaryId = 'aura-message-bridge' | 'nvidia-dsx-exchange';

export type ExchangeBoundaryOwner = 'aura' | 'nvidia';

export interface ExchangeBoundary {
  id: ExchangeBoundaryId;
  /** The name a user is allowed to see for this boundary. */
  label: string;
  owner: ExchangeBoundaryOwner;
  /** True only when AURA code implements and can run this boundary. */
  implementedByAura: boolean;
  /** Wire protocols this boundary speaks. */
  protocols: Array<'mqtt' | 'nats'>;
  /** Where the implementation lives, or why it is absent. */
  note: string;
}

export const AURA_MESSAGE_BRIDGE: ExchangeBoundary = {
  id: 'aura-message-bridge',
  label: 'AURA Message Bridge (MQTT/NATS)',
  owner: 'aura',
  implementedByAura: true,
  protocols: ['mqtt', 'nats'],
  note:
    'AURA-authored transport and ingest pipeline. Attaches to a local or explicitly disposable broker only; it is not an NVIDIA product and carries no NVIDIA entitlement.',
};

export const NVIDIA_DSX_EXCHANGE: ExchangeBoundary = {
  id: 'nvidia-dsx-exchange',
  label: 'NVIDIA DSX Exchange',
  owner: 'nvidia',
  implementedByAura: false,
  protocols: ['nats', 'mqtt'],
  note:
    'Vendor distribution. Not deployed in any AURA environment and gated on an NVIDIA entitlement. A generic MQTT or NATS transport does not satisfy it.',
};

export const EXCHANGE_BOUNDARIES: ExchangeBoundary[] = [
  AURA_MESSAGE_BRIDGE,
  NVIDIA_DSX_EXCHANGE,
];

/** The boundary AURA code actually runs. Never the vendor one. */
export function auraImplementedBoundary(): ExchangeBoundary {
  return AURA_MESSAGE_BRIDGE;
}

/**
 * True when a label claims the NVIDIA product. Used by guards to keep the
 * vendor name off AURA-implemented transports.
 */
export function claimsNvidiaExchange(label: string): boolean {
  return /nvidia\s+dsx\s+exchange|dsx\s+exchange/i.test(label);
}
