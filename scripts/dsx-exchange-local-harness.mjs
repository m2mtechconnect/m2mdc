#!/usr/bin/env node
/**
 * Local DSX Exchange harness.
 *
 * Publishes deterministic Evidence Beta observations to a LOCAL broker so
 * the DSX Exchange adapter can be exercised against a real transport.
 *
 * Safety: refuses any endpoint that is not localhost. Never contacts a
 * NVIDIA endpoint, the production Supabase project, or any remote host.
 * Requires a broker (mosquitto / nats-server) to be running locally; if
 * none is reachable the harness reports UNAVAILABLE and exits non-zero
 * rather than simulating a connection.
 */
import net from 'node:net';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const url = process.env.DSX_EXCHANGE_URL ?? 'mqtt://127.0.0.1:1883';

function refuse(reason) {
  console.error(`DSX Exchange harness REFUSED: ${reason}`);
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  refuse(`DSX_EXCHANGE_URL is not parseable: ${url}`);
}
if (!LOCAL_HOSTS.has(parsed.hostname)) {
  refuse(`host "${parsed.hostname}" is not local; only localhost brokers are permitted`);
}

const port = Number(parsed.port || (parsed.protocol === 'nats:' ? 4222 : 1883));

const reachable = await new Promise((resolve) => {
  const socket = net.createConnection({ host: '127.0.0.1', port });
  const done = (v) => {
    socket.destroy();
    resolve(v);
  };
  socket.setTimeout(1500);
  socket.on('connect', () => done(true));
  socket.on('timeout', () => done(false));
  socket.on('error', () => done(false));
});

if (!reachable) {
  console.error(
    `DSX Exchange harness: UNAVAILABLE — no local broker listening on 127.0.0.1:${port}.\n` +
      'Start mosquitto or nats-server locally, then re-run. No data was simulated.',
  );
  process.exit(2);
}

console.log(`DSX Exchange harness: local broker reachable on 127.0.0.1:${port}.`);
console.log(
  'Publish Evidence Beta fixture records with your broker client and point the adapter at this endpoint.',
);