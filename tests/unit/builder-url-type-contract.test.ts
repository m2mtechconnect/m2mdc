/**
 * Regression contract: an unknown `?type=` URL parameter must never reach
 * `builders-create`. The server enum accepts only agent | process_twin |
 * 3d_twin; anything else is rejected with HTTP 400 VALIDATION_ERROR.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const createSpy = vi.fn(async () => ({
  id: 'draft-1',
  builder: {
    id: 'draft-1',
    name: 'Untitled Build',
    description: null,
    status: 'draft',
    config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
}));

vi.mock('@/services/builderService', () => ({
  builderService: {
    create: (...args: unknown[]) => createSpy(...(args as [])),
    update: vi.fn(async () => ({})),
    get: vi.fn(async () => ({ builder: {} })),
    deploy: vi.fn(async () => ({})),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
    from: vi.fn(),
  },
}));

const SERVER_ACCEPTED = ['agent', 'process_twin', '3d_twin'];

async function initWithType(typeParam: string | null) {
  vi.resetModules();
  createSpy.mockClear();
  const { useWizardBuilderStore } = await import('@/stores/wizardBuilderStore');
  const { useBlueprintStore } = await import('@/stores/blueprintStore');
  useBlueprintStore.getState().clearBlueprint?.();
  useWizardBuilderStore.getState().reset?.();

  const params = new URLSearchParams({ new: 'true', source: 'dashboard' });
  if (typeParam !== null) params.set('type', typeParam);
  await useWizardBuilderStore.getState().initializeBuilder(params);
  return createSpy.mock.calls[0]?.[0] as { type?: string } | undefined;
}

describe('builder ?type= URL contract', () => {
  beforeEach(() => {
    createSpy.mockClear();
  });

  it('drops an invalid URL type instead of sending it to builders-create', async () => {
    for (const invalid of ['operational', 'workforce', 'twin', 'AGENT ']) {
      const payload = await initWithType(invalid);
      expect(payload).toBeDefined();
      expect(payload?.type).toBeUndefined();
    }
  });

  it('preserves each valid URL type', async () => {
    for (const valid of SERVER_ACCEPTED) {
      const payload = await initWithType(valid);
      expect(payload?.type).toBe(valid);
    }
  });
});
