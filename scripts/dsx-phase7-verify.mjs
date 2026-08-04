#!/usr/bin/env node
/**
 * Phase 7 one-shot verification.
 *
 * 1. Provisions a LOCAL-ONLY DSX Exchange broker (reuses an already running
 *    broker, else Docker Compose, else a direct mosquitto binary).
 * 2. Runs `bun scripts/dsx-exchange-runtime-verify.ts` against it.
 * 3. Runs the DSX unit suite (src/dsx/__tests__, 56 assertions/tests).
 * 4. Tears down anything it started and prints a single verdict.
 *
 * Safety: only 127.0.0.1 endpoints are ever used. No NVIDIA endpoint, no
 * production backend, no remote host is contacted. Nothing is simulated: if
 * a broker cannot be provisioned the run fails as UNAVAILABLE.
 */
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PORT = Number(process.env.DSX_EXCHANGE_PORT ?? 1883);
const URL_ = `mqtt://127.0.0.1:${PORT}`;
const COMPOSE = 'infra/dsx-exchange/docker-compose.yml';

const log = (m) => console.log(m);
const section = (m) => console.log(`\n=== ${m} ===`);

function has(bin) {
  return spawnSync('sh', ['-c', `command -v ${bin}`], { stdio: 'ignore' }).status === 0;
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  return r.status ?? 1;
}

function reachable(port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const s = net.createConnection({ host: '127.0.0.1', port });
    const done = (v) => { s.destroy(); resolve(v); };
    s.setTimeout(timeoutMs);
    s.on('connect', () => done(true));
    s.on('timeout', () => done(false));
    s.on('error', () => done(false));
  });
}

async function waitReachable(port, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    if (await reachable(port)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

let teardown = () => {};

async function provision() {
  if (await reachable(PORT)) {
    log(`broker already listening on 127.0.0.1:${PORT} — reusing it`);
    return 'reused';
  }

  if (has('docker')) {
    log('provisioning broker via Docker Compose');
    if (run('docker', ['compose', '-f', COMPOSE, 'up', '-d']) === 0) {
      teardown = () => run('docker', ['compose', '-f', COMPOSE, 'down', '-v']);
      if (await waitReachable(PORT)) return 'docker';
      log('Docker broker did not become reachable');
      teardown();
      teardown = () => {};
    }
  }

  const mosq = has('mosquitto')
    ? ['mosquitto']
    : has('nix')
      ? ['nix', 'run', 'nixpkgs#mosquitto', '--']
      : null;

  if (!mosq) return null;

  log('provisioning broker via local mosquitto binary');
  const dir = mkdtempSync(path.join(tmpdir(), 'dsx-broker-'));
  const conf = path.join(dir, 'mosquitto.conf');
  writeFileSync(
    conf,
    [`listener ${PORT} 127.0.0.1`, 'allow_anonymous true', 'persistence false', ''].join('\n'),
  );
  const child = spawn(mosq[0], [...mosq.slice(1), '-c', conf], { stdio: 'ignore', detached: true });
  child.unref();
  teardown = () => {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch { /* noop */ } }
    rmSync(dir, { recursive: true, force: true });
  };
  if (await waitReachable(PORT)) return 'mosquitto';
  teardown();
  teardown = () => {};
  return null;
}

section('Phase 7 broker provisioning');
const mode = await provision();
if (!mode) {
  console.error(
    `\nPHASE 7 UNAVAILABLE — no local broker could be provisioned on 127.0.0.1:${PORT}.\n` +
      'Install Docker (see infra/dsx-exchange/README.md) or a mosquitto binary. No data was simulated.',
  );
  process.exit(2);
}
log(`broker source: ${mode} (${URL_})`);

let runtimeStatus = 1;
let unitStatus = 1;
try {
  section('Runtime verification against real broker');
  runtimeStatus = run('bun', ['scripts/dsx-exchange-runtime-verify.ts'], {
    env: { ...process.env, DSX_EXCHANGE_URL: URL_ },
  });

  section('DSX unit suite');
  unitStatus = run('bunx', ['vitest', 'run', 'src/dsx/__tests__']);
} finally {
  section('Teardown');
  teardown();
  if (mode === 'reused') log('pre-existing broker left running');
}

section('Verdict');
log(`runtime verification: ${runtimeStatus === 0 ? 'PASS' : 'FAIL'}`);
log(`DSX unit suite:       ${unitStatus === 0 ? 'PASS' : 'FAIL'}`);
const ok = runtimeStatus === 0 && unitStatus === 0;
log(ok ? 'PHASE 7 VERIFIED' : 'PHASE 7 FAILED');
process.exit(ok ? 0 : 1);
