import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateCorsOrigin, handleCorsPreflightRequest } from '../../supabase/functions/_shared/cors';

const BROWSERLESS_ENTRYPOINTS = new Set(['zapier-webhook', 'zapier-webhook-trigger']);
const FUNCTIONS_DIR = 'supabase/functions';

function allTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return allTypeScriptFiles(path);
    return path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : [];
  });
}

function functionEntrypoints(): string[] {
  return readdirSync(FUNCTIONS_DIR)
    .map((name) => join(FUNCTIONS_DIR, name, 'index.ts'))
    .filter((path) => {
      try { return statSync(path).isFile(); } catch { return false; }
    });
}

function wildcardCorsSource(source: string): boolean {
  const literalHeader = /["'`]Access-Control-Allow-Origin["'`]\s*:\s*["'`]\*["'`]/;
  const headerMutation = /(?:headers?\.)?(?:set|append)\(\s*["'`]Access-Control-Allow-Origin["'`]\s*,\s*["'`]\*["'`]\s*\)/i;
  const indirectHeader = /(?:const|let|var)\s+\w+\s*=\s*["'`]\*["'`][\s\S]{0,320}["'`]Access-Control-Allow-Origin["'`]/;
  const indirectWildcard = /["'`]Access-Control-Allow-Origin["'`][\s\S]{0,160}:\s*\w+[\s\S]{0,320}(?:const|let|var)\s+\w+\s*=\s*["'`]\*["'`]/;
  return [literalHeader, headerMutation, indirectHeader, indirectWildcard]
    .some((pattern) => pattern.test(source));
}

describe('edge function CORS source guard', () => {
  it('scans entrypoints and shared helpers for literal or indirect wildcard CORS', () => {
    const allSources = allTypeScriptFiles(FUNCTIONS_DIR);
    expect(allSources).toContain('supabase/functions/_shared/handler.ts');
    expect(allSources).toContain('supabase/functions/_shared/cors.ts');

    const corsFiles = allSources.filter((path) =>
      readFileSync(path, 'utf8').includes('Access-Control-Allow-Origin'));
    const offenders = corsFiles.filter((path) => {
      if (BROWSERLESS_ENTRYPOINTS.has(path.split('/')[2])) return false;
      return wildcardCorsSource(readFileSync(path, 'utf8'));
    });
    expect(offenders).toEqual([]);
  });

  it('uses the shared policy wherever browser CORS is emitted', () => {
    const offenders = allTypeScriptFiles(FUNCTIONS_DIR).filter((path) => {
      const name = path.split('/')[2];
      if (BROWSERLESS_ENTRYPOINTS.has(name)) return false;
      const source = readFileSync(path, 'utf8');
      if (!source.includes('Access-Control-Allow-Origin')) return false;
      if (path === 'supabase/functions/_shared/cors.ts') return false;
      return !source.includes('_shared/cors.ts') && !source.includes('./cors.ts');
    });
    expect(offenders).toEqual([]);
  });

  it('covers every Edge Function entrypoint', () => {
    expect(functionEntrypoints()).toHaveLength(163);
  });

  it('keeps browserless webhooks denying every browser origin', () => {
    for (const name of BROWSERLESS_ENTRYPOINTS) {
      expect(readFileSync(join(FUNCTIONS_DIR, name, 'index.ts'), 'utf8'))
        .toContain("'Access-Control-Allow-Origin': 'null'");
    }
  });
});

describe('shared CORS response policy', () => {
  const production = {
    environment: 'production',
    configuredOrigins: 'https://auradc.m2mtechconnect.com,https://console.example.com',
  };

  it('echoes only an exact allowed production origin with Vary', () => {
    const decision = evaluateCorsOrigin('https://console.example.com', production);
    expect(decision.allowed).toBe(true);
    expect(decision.headers['Access-Control-Allow-Origin']).toBe('https://console.example.com');
    expect(decision.headers.Vary).toBe('Origin');
    expect(decision.headers['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('fails closed when the production allowlist is not configured', () => {
    const decision = evaluateCorsOrigin('https://auradc.m2mtechconnect.com', {
      environment: 'production', configuredOrigins: '',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.headers).not.toHaveProperty('Access-Control-Allow-Origin');
  });

  it.each([
    'https://evil.example.com',
    'https://console.example.com.evil.test',
    'https://console.example.com/path',
  ])('denies unlisted, lookalike, or malformed origin %s', (origin) => {
    const decision = evaluateCorsOrigin(origin, production);
    expect(decision.allowed).toBe(false);
    expect(decision.headers).not.toHaveProperty('Access-Control-Allow-Origin');
  });

  it('allows originless server requests without emitting a browser grant', () => {
    const decision = evaluateCorsOrigin(null, production);
    expect(decision.allowed).toBe(true);
    expect(decision.headers).not.toHaveProperty('Access-Control-Allow-Origin');
    expect(decision.headers.Vary).toBe('Origin');
  });

  it('fails closed for missing or denied preflight origins', () => {
    const missing = handleCorsPreflightRequest(
      new Request('https://edge.test', {
        method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'POST' },
      }), production);
    const denied = handleCorsPreflightRequest(new Request('https://edge.test', {
      method: 'OPTIONS', headers: {
        Origin: 'https://evil.example.com', 'Access-Control-Request-Method': 'POST',
      },
    }), production);
    expect(missing.status).toBe(403);
    expect(denied.status).toBe(403);
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('returns a scoped successful preflight response', () => {
    const response = handleCorsPreflightRequest(new Request('https://edge.test', {
      method: 'OPTIONS', headers: {
        Origin: 'https://console.example.com', 'Access-Control-Request-Method': 'POST',
      },
    }), production);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://console.example.com');
    expect(response.headers.get('Access-Control-Allow-Headers')?.split(/,\s*/))
      .toContain('x-organization-id');
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it('permits localhost only in explicit development mode', () => {
    const origin = 'http://localhost:5173';
    expect(evaluateCorsOrigin(origin, production).allowed).toBe(false);
    expect(evaluateCorsOrigin(origin, {
      environment: 'development', configuredOrigins: production.configuredOrigins,
    }).allowed).toBe(true);
  });

  it('never combines credentials with a wildcard', () => {
    for (const origin of ['https://console.example.com', 'https://evil.example.com', null]) {
      const headers = evaluateCorsOrigin(origin, production).headers;
      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    }
  });
});
