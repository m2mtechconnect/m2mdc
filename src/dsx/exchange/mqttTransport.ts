/**
 * Real MQTT transport for the AURA Message Bridge (see
 * `exchangeBoundary.ts`). This is AURA's own generic MQTT transport - it is
 * not NVIDIA's DSX Exchange distribution.
 *
 * The only module in the DSX tree that imports a broker client. It is a
 * pure transport: it decodes nothing and validates nothing, so the adapter
 * keeps its single shared ingestion path.
 *
 * Safety: the endpoint is assessed BEFORE the client is constructed, so a
 * refused host never results in a socket being opened.
 */
import mqtt, { type MqttClient } from 'mqtt';
import { AURA_MESSAGE_BRIDGE } from './exchangeBoundary';
import {
  assessEndpoint,
  type ExchangeTransport,
  type TransportEndpoint,
  type TransportMessage,
  type TransportState,
} from './transport';

export class EndpointRefusedError extends Error {
  constructor(reason: string) {
    super(`${AURA_MESSAGE_BRIDGE.label} endpoint refused: ${reason}`);
    this.name = 'EndpointRefusedError';
  }
}

export function createMqttTransport(
  endpoint: TransportEndpoint,
  opts: { allowDisposableHost?: string | null; connectTimeoutMs?: number } = {},
): ExchangeTransport {
  const verdict = assessEndpoint(endpoint, {
    allowDisposableHost: opts.allowDisposableHost ?? null,
  });
  if (verdict.allowed !== true) {
    throw new EndpointRefusedError((verdict as { allowed: false; reason: string }).reason);
  }

  let client: MqttClient | null = null;
  let state: TransportState = 'disconnected';
  const msgHandlers = new Set<(m: TransportMessage) => void>();
  const stateHandlers = new Set<(s: TransportState) => void>();

  const setState = (s: TransportState) => {
    if (state === s) return;
    state = s;
    for (const h of stateHandlers) h(s);
  };

  return {
    endpoint,
    state: () => state,

    connect() {
      setState('connecting');
      return new Promise<void>((resolve, reject) => {
        const c = mqtt.connect(endpoint.url, {
          reconnectPeriod: 0, // reconnects are driven explicitly by the caller
          connectTimeout: opts.connectTimeoutMs ?? 5_000,
          clean: true,
        });
        client = c;

        c.on('connect', () => {
          c.subscribe(endpoint.subjects, (err) => {
            if (err) {
              setState('error');
              reject(err);
              return;
            }
            setState('connected');
            resolve();
          });
        });
        c.on('message', (topic, payload) => {
          const m: TransportMessage = {
            subject: topic,
            payload: payload.toString('utf8'),
            received_at: new Date().toISOString(),
          };
          for (const h of msgHandlers) h(m);
        });
        c.on('error', (err) => {
          setState('error');
          reject(err);
        });
        c.on('close', () => {
          if (state !== 'error') setState('disconnected');
        });
      });
    },

    async disconnect() {
      const c = client;
      client = null;
      if (c) await new Promise<void>((resolve) => c.end(true, {}, () => resolve()));
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
  };
}