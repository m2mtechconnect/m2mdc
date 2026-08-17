/**
 * Worker environment. Every value is read once, at boot, and nothing here is
 * ever logged: the service-role key and the vault key are secrets.
 */
export interface WorkerEnv {
  supabaseUrl: string;
  serviceRoleKey: string;
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
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function readEnv(argv: string[] = process.argv.slice(2)): WorkerEnv {
  const onceIndex = argv.indexOf('--once');
  const onceMsArg = onceIndex >= 0 ? Number(argv[onceIndex + 1] ?? '15000') : null;
  return {
    supabaseUrl: required('SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    vaultKey: required('CONNECTION_CREDENTIAL_KEY'),
    connectionId: required('AURA_CONNECTION_ID'),
    workerId: process.env.AURA_WORKER_ID ?? `mqtt-worker-${process.pid}`,
    runtime: process.env.AURA_WORKER_RUNTIME ?? 'container',
    productionAuthorised: process.env.AURA_BROKER_PRODUCTION_AUTHORISED === 'true',
    brokerOverride: process.env.AURA_BROKER_URL ?? null,
    heartbeatMs: Number(process.env.AURA_HEARTBEAT_MS ?? 10_000),
    runOnceMs: Number.isFinite(onceMsArg as number) ? (onceMsArg as number) : null,
  };
}