/**
 * Worker environment. Every value is read once, at boot, and nothing here is
 * ever logged: the service-role token and the vault key are secrets. The
 * service-role token is resolved from platform injection only (env var,
 * mounted secret file or secrets-manager blob) - never authored in code.
 */
import { describeInjectionAttempts, resolveServiceRoleToken } from './serviceRoleToken.js';

export interface WorkerEnv {
  supabaseUrl: string;
  serviceRoleKey: string;
  /** Where the injected token came from. Safe to log. */
  serviceRoleKeySource: string;
  /** Non-reversible token identifier. Safe to log. */
  serviceRoleKeyFingerprint: string;
  vaultKey: string;
  connectionId: string;
  workerId: string;
  runtime: string;
  /** Operator declaration that the configured broker is an authorised production source. */
  productionAuthorised: boolean;
  /** Broker override, used by the local verification harness only. */
  brokerOverride: string | null;
  heartbeatMs: number;
  runOnceMs: number | null;
  /** Durable write-path acceptance run: no broker, no telemetry. */
  acceptanceMode: boolean;
  /** Keep acceptance rows instead of deleting them after read-back. */
  keepAcceptanceEvidence: boolean;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function readEnv(argv: string[] = process.argv.slice(2)): WorkerEnv {
  const onceIndex = argv.indexOf('--once');
  const onceMsArg = onceIndex >= 0 ? Number(argv[onceIndex + 1] ?? '15000') : null;
  const acceptanceMode = argv.includes('--acceptance');

  const injected = resolveServiceRoleToken();
  if (!injected) {
    throw new Error(
      `no service-role token was injected (${describeInjectionAttempts().join('; ')}). ` +
        'Set SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_ROLE_KEY_FILE, ' +
        'AURA_INJECTED_SECRETS_JSON or AURA_INJECTED_SECRETS_FILE via platform secret injection.',
    );
  }

  return {
    supabaseUrl: required('SUPABASE_URL'),
    serviceRoleKey: injected.token,
    serviceRoleKeySource: injected.source,
    serviceRoleKeyFingerprint: injected.fingerprint,
    // The vault key is only needed to decrypt broker credentials, which
    // acceptance mode never does.
    vaultKey: acceptanceMode ? (process.env.CONNECTION_CREDENTIAL_KEY ?? '') : required('CONNECTION_CREDENTIAL_KEY'),
    connectionId: required('AURA_CONNECTION_ID'),
    workerId: process.env.AURA_WORKER_ID ?? `mqtt-worker-${process.pid}`,
    runtime: process.env.AURA_WORKER_RUNTIME ?? 'container',
    productionAuthorised: process.env.AURA_BROKER_PRODUCTION_AUTHORISED === 'true',
    brokerOverride: process.env.AURA_BROKER_URL ?? null,
    heartbeatMs: Number(process.env.AURA_HEARTBEAT_MS ?? 10_000),
    runOnceMs: Number.isFinite(onceMsArg as number) ? (onceMsArg as number) : null,
    acceptanceMode,
    keepAcceptanceEvidence: argv.includes('--keep-evidence'),
  };
}
