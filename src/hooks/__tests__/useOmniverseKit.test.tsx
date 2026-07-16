/**
 * useOmniverseKit — hook-level integration test.
 *
 * Verifies the runtime contract that Phase 1A.1 requires at the React layer:
 *   invalid Kit payload → `isConnected === false`, `provenance !== 'live'`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as clientModule from '@/integrations/omniverseKit/client';
import * as configModule from '@/integrations/omniverseKit/config';
import { useOmniverseKit } from '@/hooks/useOmniverseKit';

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.spyOn(configModule, 'readKitConfig').mockReturnValue({
    enabled: true, restBaseUrl: 'http://kit.test', streamEnabled: false,
    signalingHost: 'kit.test', signalingPort: 49100,
  });
});
afterEach(() => vi.restoreAllMocks());

describe('useOmniverseKit runtime provenance contract', () => {
  it('invalid outcome → not connected, provenance is demo (never live)', async () => {
    vi.spyOn(clientModule, 'fetchStatusValidated').mockResolvedValue({
      ok: false, reason: 'invalid',
      issues: [{ path: 'pue', code: 'invalid_type', message: 'expected number' }],
    });
    const { result } = renderHook(() => useOmniverseKit(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionState).toBe('unavailable');
    expect(result.current.provenance).not.toBe('live');
    expect(result.current.validationIssues.length).toBeGreaterThan(0);
  });

  it('disabled outcome → connectionState "disabled", provenance "demo"', async () => {
    vi.spyOn(clientModule, 'fetchStatusValidated').mockResolvedValue({
      ok: false, reason: 'disabled', message: 'no env',
    });
    const { result } = renderHook(() => useOmniverseKit(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.connectionState).toBe('disabled');
    expect(result.current.provenance).toBe('demo');
    expect(result.current.isConnected).toBe(false);
  });

  it('unavailable outcome → provenance "unavailable"', async () => {
    vi.spyOn(clientModule, 'fetchStatusValidated').mockResolvedValue({
      ok: false, reason: 'unavailable', message: 'Kit endpoint unreachable',
    });
    const { result } = renderHook(() => useOmniverseKit(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.connectionState).toBe('unavailable');
    expect(result.current.provenance).toBe('unavailable');
  });
});