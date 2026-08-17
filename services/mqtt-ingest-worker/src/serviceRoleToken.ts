/**
 * Service-role token resolution for the worker.
 *
 * The token is never authored by a developer and never committed. It is
 * injected by the runtime platform, so this module accepts every injection
 * shape we deploy with and reports only WHERE the token came from, never the
 * value itself.
 *
 * Resolution order (first hit wins):
 *   1. SUPABASE_SERVICE_ROLE_KEY               - plain env injection
 *   2. SUPABASE_SERVICE_ROLE_KEY_FILE          - mounted secret file (ECS/K8s/Brev)
 *   3. AURA_INJECTED_SECRETS_JSON              - Secrets Manager JSON blob in env
 *   4. AURA_INJECTED_SECRETS_FILE              - Secrets Manager JSON blob on disk
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export type TokenSource =
  | 'env:SUPABASE_SERVICE_ROLE_KEY'
  | 'file:SUPABASE_SERVICE_ROLE_KEY_FILE'
  | 'json:AURA_INJECTED_SECRETS_JSON'
  | 'json-file:AURA_INJECTED_SECRETS_FILE';

export interface ResolvedToken {
  token: string;
  source: TokenSource;
  /** Non-reversible identifier so evidence can prove which token was used. */
  fingerprint: string;
}

const JSON_KEYS = ['SUPABASE_SERVICE_ROLE_KEY', 'service_role_key', 'serviceRoleKey'];

function fromJsonBlob(blob: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(blob);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  for (const key of JSON_KEYS) {
    const value = (parsed as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

function readFile(path: string): string | null {
  try {
    const value = readFileSync(path, 'utf8').trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function fingerprint(token: string): string {
  return `sha256:${createHash('sha256').update(token).digest('hex').slice(0, 16)}`;
}

export function resolveServiceRoleToken(env: NodeJS.ProcessEnv = process.env): ResolvedToken | null {
  const direct = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (direct) return { token: direct, source: 'env:SUPABASE_SERVICE_ROLE_KEY', fingerprint: fingerprint(direct) };

  const filePath = env.SUPABASE_SERVICE_ROLE_KEY_FILE?.trim();
  if (filePath) {
    const value = readFile(filePath);
    if (value) return { token: value, source: 'file:SUPABASE_SERVICE_ROLE_KEY_FILE', fingerprint: fingerprint(value) };
  }

  const jsonBlob = env.AURA_INJECTED_SECRETS_JSON?.trim();
  if (jsonBlob) {
    const value = fromJsonBlob(jsonBlob);
    if (value) return { token: value, source: 'json:AURA_INJECTED_SECRETS_JSON', fingerprint: fingerprint(value) };
  }

  const jsonPath = env.AURA_INJECTED_SECRETS_FILE?.trim();
  if (jsonPath) {
    const raw = readFile(jsonPath);
    const value = raw ? fromJsonBlob(raw) : null;
    if (value) return { token: value, source: 'json-file:AURA_INJECTED_SECRETS_FILE', fingerprint: fingerprint(value) };
  }

  return null;
}

/** Sources that were present but unusable, for blocker reporting. */
export function describeInjectionAttempts(env: NodeJS.ProcessEnv = process.env): string[] {
  const attempts: string[] = [];
  if (env.SUPABASE_SERVICE_ROLE_KEY) attempts.push('SUPABASE_SERVICE_ROLE_KEY present');
  if (env.SUPABASE_SERVICE_ROLE_KEY_FILE) attempts.push(`SUPABASE_SERVICE_ROLE_KEY_FILE=${env.SUPABASE_SERVICE_ROLE_KEY_FILE}`);
  if (env.AURA_INJECTED_SECRETS_JSON) attempts.push('AURA_INJECTED_SECRETS_JSON present');
  if (env.AURA_INJECTED_SECRETS_FILE) attempts.push(`AURA_INJECTED_SECRETS_FILE=${env.AURA_INJECTED_SECRETS_FILE}`);
  return attempts.length > 0 ? attempts : ['no injection source was set'];
}
