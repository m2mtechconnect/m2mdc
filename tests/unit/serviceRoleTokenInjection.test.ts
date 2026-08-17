import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolveServiceRoleToken,
  describeInjectionAttempts,
  fingerprint,
} from '../../services/mqtt-ingest-worker/src/serviceRoleToken';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'aura-token-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('injected service-role token resolution', () => {
  it('returns null when nothing is injected', () => {
    expect(resolveServiceRoleToken({})).toBeNull();
    expect(describeInjectionAttempts({})).toEqual(['no injection source was set']);
  });

  it('reads a plain env injection', () => {
    const resolved = resolveServiceRoleToken({ SUPABASE_SERVICE_ROLE_KEY: 'token-a' });
    expect(resolved?.token).toBe('token-a');
    expect(resolved?.source).toBe('env:SUPABASE_SERVICE_ROLE_KEY');
  });

  it('reads a mounted secret file', () => {
    const path = join(dir, 'key');
    writeFileSync(path, 'token-b\n');
    const resolved = resolveServiceRoleToken({ SUPABASE_SERVICE_ROLE_KEY_FILE: path });
    expect(resolved?.token).toBe('token-b');
    expect(resolved?.source).toBe('file:SUPABASE_SERVICE_ROLE_KEY_FILE');
  });

  it('reads a secrets-manager JSON blob from env and from disk', () => {
    const blob = JSON.stringify({ service_role_key: 'token-c' });
    expect(resolveServiceRoleToken({ AURA_INJECTED_SECRETS_JSON: blob })?.token).toBe('token-c');

    const path = join(dir, 'secrets.json');
    writeFileSync(path, JSON.stringify({ SUPABASE_SERVICE_ROLE_KEY: 'token-d' }));
    const resolved = resolveServiceRoleToken({ AURA_INJECTED_SECRETS_FILE: path });
    expect(resolved?.token).toBe('token-d');
    expect(resolved?.source).toBe('json-file:AURA_INJECTED_SECRETS_FILE');
  });

  it('ignores unusable sources and falls through', () => {
    const resolved = resolveServiceRoleToken({
      SUPABASE_SERVICE_ROLE_KEY_FILE: join(dir, 'missing'),
      AURA_INJECTED_SECRETS_JSON: 'not-json',
      SUPABASE_SERVICE_ROLE_KEY: '',
      AURA_INJECTED_SECRETS_FILE: (() => {
        const p = join(dir, 'ok.json');
        writeFileSync(p, JSON.stringify({ serviceRoleKey: 'token-e' }));
        return p;
      })(),
    });
    expect(resolved?.token).toBe('token-e');
  });

  it('fingerprints without revealing the token', () => {
    const fp = fingerprint('super-secret');
    expect(fp.startsWith('sha256:')).toBe(true);
    expect(fp).not.toContain('super-secret');
    expect(fp).toBe(fingerprint('super-secret'));
  });
});
