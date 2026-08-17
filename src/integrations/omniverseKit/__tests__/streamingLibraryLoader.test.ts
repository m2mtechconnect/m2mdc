import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadOmniverseStreamingLibrary,
  __resetStreamingLoader,
} from '../streamingLibraryLoader';

const alwaysHealthy = async () => true;

describe('omniverse streaming library loader', () => {
  beforeEach(() => __resetStreamingLoader());

  it('refuses when the provider was not selected', async () => {
    const res = await loadOmniverseStreamingLibrary({
      providerSelected: false,
      healthCheck: alwaysHealthy,
      hasPermission: true,
    });
    expect(res).toEqual({ loaded: false, refusal: 'provider-not-selected' });
  });

  it('refuses without permission', async () => {
    const res = await loadOmniverseStreamingLibrary({
      providerSelected: true,
      healthCheck: alwaysHealthy,
      hasPermission: false,
    });
    expect(res).toEqual({ loaded: false, refusal: 'permission-denied' });
  });

  it('refuses while the Kit provider is typed-unavailable', async () => {
    const res = await loadOmniverseStreamingLibrary({
      providerSelected: true,
      healthCheck: alwaysHealthy,
      hasPermission: true,
    });
    expect(res).toEqual({ loaded: false, refusal: 'provider-unavailable' });
  });

  it('never injects the vendor script during a refused load', async () => {
    await loadOmniverseStreamingLibrary({
      providerSelected: true,
      healthCheck: alwaysHealthy,
      hasPermission: true,
    });
    const injected = document.querySelectorAll(
      'script[src="/omniverse-webrtc-streaming-library.umd.js"]',
    );
    expect(injected.length).toBe(0);
  });
});
