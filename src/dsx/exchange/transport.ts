/**
 * Transport abstraction for the DSX Exchange adapter.
 *
 * Deliberately broker-agnostic: MQTT and NATS both reduce to
 * "subscribe to subjects, receive raw byte/string payloads". The adapter
 * never imports a broker client directly, so it is fully testable without
 * network access and cannot accidentally reach a live gateway.
 */

export type TransportState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface TransportMessage {
  subject: string;
  /** Raw payload as delivered by the broker. */
  payload: string;
  /** Broker-side receipt time (ISO). Never used as observed_at. */
  received_at: string;
}

export interface TransportEndpoint {
  /** e.g. mqtt://127.0.0.1:1883 or nats://127.0.0.1:4222 */
  url: string;
  protocol: 'mqtt' | 'nats';
  subjects: string[];
}

export interface ExchangeTransport {
  readonly endpoint: TransportEndpoint;
  state(): TransportState;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onMessage(handler: (m: TransportMessage) => void): () => void;
  onStateChange(handler: (s: TransportState) => void): () => void;
}

const PRODUCTION_PROJECT_REF = 'psfvrskpnwcshvajzeix';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

export type EndpointVerdict =
  | { allowed: true; host: string }
  | { allowed: false; reason: string };

/**
 * Hard safety boundary: the Exchange adapter may only ever attach to
 * localhost or an endpoint explicitly declared disposable. Anything that
 * mentions the production project ref, or any non-local host without the
 * explicit disposable opt-in, is refused before any connection attempt.
 */
export function assessEndpoint(
  endpoint: TransportEndpoint,
  opts: { allowDisposableHost?: string | null } = {},
): EndpointVerdict {
  let host: string;
  try {
    host = new URL(endpoint.url).hostname;
  } catch {
    return { allowed: false, reason: `endpoint url is not parseable: ${endpoint.url}` };
  }
  if (endpoint.url.includes(PRODUCTION_PROJECT_REF) || host.includes(PRODUCTION_PROJECT_REF)) {
    return { allowed: false, reason: 'endpoint references the production project (forbidden)' };
  }
  if (/nvidia\.com$/i.test(host) || /\.supabase\.co$/i.test(host)) {
    return { allowed: false, reason: `endpoint host "${host}" is not a permitted local test broker` };
  }
  if (LOCAL_HOSTS.has(host)) return { allowed: true, host };
  const disposable = opts.allowDisposableHost;
  if (disposable && host === disposable) return { allowed: true, host };
  return {
    allowed: false,
    reason: `endpoint host "${host}" is neither localhost nor the declared disposable test host`,
  };
}

/**
 * In-memory transport used by tests and by the local dummy-BMS harness.
 * Behaves like a broker: buffers nothing while disconnected, and replays
 * nothing on reconnect (dedupe is the adapter's responsibility).
 */
export function createMemoryTransport(endpoint: TransportEndpoint): ExchangeTransport & {
  emit(m: TransportMessage): void;
  fail(reason: string): void;
} {
  let state: TransportState = 'disconnected';
  const msgHandlers = new Set<(m: TransportMessage) => void>();
  const stateHandlers = new Set<(s: TransportState) => void>();

  const setState = (s: TransportState) => {
    state = s;
    for (const h of stateHandlers) h(s);
  };

  return {
    endpoint,
    state: () => state,
    async connect() {
      setState('connecting');
      setState('connected');
    },
    async disconnect() {
      setState('disconnected');
    },
    onMessage(h) {
      msgHandlers.add(h);
      return () => msgHandlers.delete(h);
    },
    onStateChange(h) {
      stateHandlers.add(h);
      return () => stateHandlers.delete(h);
    },
    emit(m) {
      if (state !== 'connected') return;
      for (const h of msgHandlers) h(m);
    },
    fail() {
      setState('error');
    },
  };
}