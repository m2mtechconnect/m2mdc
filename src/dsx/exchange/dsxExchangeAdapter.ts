/**
 * DSX Exchange adapter.
 *
 * Subscribes to a LOCAL broker, decodes each message into a DSX envelope
 * and pushes it through the SHARED ingestion pipeline. It has no private
 * validation path: schema, unit, duplicate, freshness, mapping and
 * quarantine handling are all the pipeline's.
 *
 * Connection health (transport) is reported SEPARATELY from data freshness
 * (observation age). A connected broker that has delivered nothing is
 * "connected, no data", not "fresh".
 */
import { ingestRecords } from '../adapters/ingestPipeline';
import type { AcceptedEvent, IngestRejection, SourceSnapshot } from '../adapters/types';
import type { DataMode } from '../modes';
import { freshnessFor, type FreshnessState } from '../modes';
import {
  EVIDENCE_BETA_ASSETS,
  EVIDENCE_BETA_MAPPINGS,
  EVIDENCE_BETA_SOURCE_SYSTEM,
} from '../fixtures/evidenceBetaFacility';
import { payloadHash } from '../fixtures/determinism';
import {
  assessEndpoint,
  type ExchangeTransport,
  type TransportMessage,
  type TransportState,
} from './transport';

export interface ExchangeHealth {
  transport_state: TransportState;
  endpoint_url: string | null;
  protocol: 'mqtt' | 'nats' | null;
  refused_reason: string | null;
  connect_count: number;
  /** Messages received from the broker, before validation. */
  messages_received: number;
  accepted_count: number;
  rejected_count: number;
  /** Messages dropped because their event_id was already ingested. */
  duplicate_suppressed: number;
  last_message_at: string | null;
}

export interface ExchangeSnapshot extends SourceSnapshot {
  health: ExchangeHealth;
  freshness: FreshnessState;
}

export interface DsxExchangeAdapter {
  readonly id: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  health(): ExchangeHealth;
  snapshot(nowMs: number): ExchangeSnapshot;
  onUpdate(handler: () => void): () => void;
}

function emptyHealth(): ExchangeHealth {
  return {
    transport_state: 'disconnected',
    endpoint_url: null,
    protocol: null,
    refused_reason: null,
    connect_count: 0,
    messages_received: 0,
    accepted_count: 0,
    rejected_count: 0,
    duplicate_suppressed: 0,
    last_message_at: null,
  };
}

export interface ExchangeAdapterOptions {
  transport: ExchangeTransport;
  /** Non-local host explicitly declared disposable. Defaults to none. */
  allowDisposableHost?: string | null;
  /**
   * LIVE stays disabled platform-wide. The Exchange adapter therefore
   * reports REPLAYED-equivalent provenance for local broker traffic and
   * must be given an explicit run identity.
   */
  runId: string;
  sourceSystem?: string;
}

/**
 * Local-broker DSX Exchange source. Fails closed to UNAVAILABLE whenever
 * the endpoint is refused, the transport is not connected, or no validated
 * observation exists. It NEVER substitutes simulated data.
 */
export function createDsxExchangeAdapter(opts: ExchangeAdapterOptions): DsxExchangeAdapter {
  const { transport, runId } = opts;
  const sourceSystem = opts.sourceSystem ?? EVIDENCE_BETA_SOURCE_SYSTEM;

  const health = emptyHealth();
  health.endpoint_url = transport.endpoint.url;
  health.protocol = transport.endpoint.protocol;

  const accepted: AcceptedEvent[] = [];
  const rejected: IngestRejection[] = [];
  /** Survives reconnects — this is what makes redelivery non-duplicating. */
  const seenEventIds = new Set<string>();
  const updateHandlers = new Set<() => void>();
  let unsubscribeMessage: (() => void) | null = null;
  let unsubscribeState: (() => void) | null = null;

  const notify = () => {
    for (const h of updateHandlers) h();
  };

  const handleMessage = (m: TransportMessage) => {
    health.messages_received += 1;
    health.last_message_at = m.received_at;

    let parsed: unknown;
    try {
      parsed = JSON.parse(m.payload);
    } catch {
      rejected.push({
        reason: 'schema_invalid',
        source_asset_id: m.subject,
        event_id: null,
        observed_at: null,
        detail: 'broker payload was not valid JSON',
        payload_hash: payloadHash(m.payload),
      });
      health.rejected_count += 1;
      notify();
      return;
    }

    const raw = (parsed ?? {}) as Record<string, unknown>;
    const eventId = typeof raw.event_id === 'string' ? raw.event_id : null;

    // Reconnect-safe idempotency: a redelivered event_id is suppressed
    // before it can be double-counted, and is not re-quarantined.
    if (eventId !== null && seenEventIds.has(eventId)) {
      health.duplicate_suppressed += 1;
      notify();
      return;
    }

    const sourceAssetId =
      typeof raw.source_asset_id === 'string'
        ? raw.source_asset_id
        : subjectToSourceAsset(m.subject);

    // Shared pipeline — no private validation, no bypass.
    const result = ingestRecords(
      [{ tick: 0, source_asset_id: sourceAssetId, payload: parsed }],
      EVIDENCE_BETA_MAPPINGS,
      sourceSystem,
    );

    for (const a of result.accepted) {
      seenEventIds.add(a.envelope.event_id);
      accepted.push(a);
      health.accepted_count += 1;
    }
    for (const r of result.rejected) {
      if (r.event_id) seenEventIds.add(r.event_id);
      rejected.push(r);
      health.rejected_count += 1;
    }
    notify();
  };

  const handleState = (s: TransportState) => {
    health.transport_state = s;
    if (s === 'connected') health.connect_count += 1;
    notify();
  };

  return {
    id: `dsx-exchange:${transport.endpoint.protocol}`,

    async start() {
      const verdict = assessEndpoint(transport.endpoint, {
        allowDisposableHost: opts.allowDisposableHost ?? null,
      });
      if (!verdict.allowed) {
        health.refused_reason = verdict.reason;
        health.transport_state = 'error';
        notify();
        return;
      }
      health.refused_reason = null;
      unsubscribeMessage = transport.onMessage(handleMessage);
      unsubscribeState = transport.onStateChange(handleState);
      await transport.connect();
    },

    async stop() {
      unsubscribeMessage?.();
      unsubscribeState?.();
      unsubscribeMessage = null;
      unsubscribeState = null;
      await transport.disconnect();
      health.transport_state = transport.state();
      notify();
    },

    health() {
      return { ...health };
    },

    snapshot(nowMs: number): ExchangeSnapshot {
      const last = accepted.length
        ? accepted.reduce((a, b) =>
            Date.parse(b.envelope.observed_at) > Date.parse(a.envelope.observed_at) ? b : a,
          ).envelope.observed_at
        : null;

      // Fail closed: refused endpoint, non-connected transport, or zero
      // validated observations all resolve to UNAVAILABLE.
      const usable =
        health.refused_reason === null &&
        health.transport_state === 'connected' &&
        accepted.length > 0;

      const mode: DataMode = usable ? 'REPLAYED' : 'UNAVAILABLE';

      return {
        data_mode: mode,
        connection_state:
          health.refused_reason !== null
            ? 'disabled'
            : health.transport_state === 'connected'
              ? 'connected'
              : 'disconnected',
        last_observed_at: last,
        run_id: usable ? runId : null,
        tick: health.messages_received,
        accepted: [...accepted],
        rejected: [...rejected],
        assets: EVIDENCE_BETA_ASSETS,
        mappings: EVIDENCE_BETA_MAPPINGS,
        health: { ...health },
        // Freshness is derived from observation age only — never from the
        // transport being connected.
        freshness: freshnessFor(last, nowMs),
      };
    },

    onUpdate(handler) {
      updateHandlers.add(handler);
      return () => updateHandlers.delete(handler);
    },
  };
}

/** dsx/evidence-beta/RACK-01/inlet_temp_c -> RACK-01 */
export function subjectToSourceAsset(subject: string): string {
  const parts = subject.split('/').filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : subject;
}