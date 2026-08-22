import { describe, expect, it } from 'vitest';
import {
  UnsafeTestBackendError,
  resolveTestSupabaseConfig,
  resolveTestUserCredentials,
} from '../helpers/testSupabaseClient';

describe('loopback-only test Supabase configuration', () => {
  it.each([
    'http://127.0.0.1:54321',
    'http://localhost:54321',
    'http://[::1]:54321',
  ])('accepts a loopback backend: %s', (url) => {
    expect(resolveTestSupabaseConfig({ TEST_SUPABASE_URL: url })).toEqual({
      url,
      anonKey: 'test-placeholder-anon-key',
    });
  });

  it.each([
    'https://example-project.supabase.co',
    'https://example.com',
    'http://10.0.0.5:54321',
  ])('rejects a remote backend before any request: %s', (url) => {
    expect(() => resolveTestSupabaseConfig({ TEST_SUPABASE_URL: url })).toThrow(
      UnsafeTestBackendError,
    );
  });

  it.each([
    'not-a-url',
    'file:///tmp/database',
    'http://127.0.0.1:54321/rest/v1',
    'http://user:password@127.0.0.1:54321',
  ])('rejects malformed or unsafe loopback configuration: %s', (url) => {
    expect(() => resolveTestSupabaseConfig({ TEST_SUPABASE_URL: url })).toThrow(
      UnsafeTestBackendError,
    );
  });

  it('does not include credential material in configuration errors', () => {
    const credential = 'do-not-print-this-value';
    let message = '';

    try {
      resolveTestSupabaseConfig({
        TEST_SUPABASE_URL: `http://user:${credential}@127.0.0.1:54321`,
        TEST_SUPABASE_ANON_KEY: credential,
      });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).not.toContain(credential);
  });

  it('requires pre-seeded user credentials at runtime without exposing values', () => {
    const password = crypto.randomUUID();
    expect(() => resolveTestUserCredentials({})).toThrow(
      'Pre-seeded test user credentials are not configured',
    );
    expect(resolveTestUserCredentials({
      TEST_USER_EMAIL: 'runner-user@example.invalid',
      TEST_USER_PASSWORD: password,
    })).toEqual({
      email: 'runner-user@example.invalid',
      password,
    });
  });
});
