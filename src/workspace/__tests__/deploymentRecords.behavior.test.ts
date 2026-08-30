import { beforeEach, describe, expect, it, vi } from 'vitest';

const { insertEvent } = vi.hoisted(() => ({
  insertEvent: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'deployment_events') {
        throw new Error(`Unexpected table in deployment record test: ${table}`);
      }
      return { insert: insertEvent };
    },
  },
}));

import {
  appendDeploymentEvent,
  classifyDeploymentTruth,
} from '../deploymentRecords';

beforeEach(() => {
  insertEvent.mockReset();
});

describe('canonical deployment evidence behavior', () => {
  it('rejects activation progress when immutable event persistence fails', async () => {
    insertEvent.mockResolvedValue({
      error: { code: '42501', message: 'row-level security denied event append' },
    });

    await expect(appendDeploymentEvent({
      deploymentId: 'deployment-1',
      systemId: 'system-1',
      actorId: 'actor-1',
      sequence: 1,
      stage: 'activation_started',
      status: 'started',
    })).rejects.toMatchObject({ code: '42501' });
  });

  it('writes one complete append-only event payload', async () => {
    insertEvent.mockResolvedValue({ error: null });

    await appendDeploymentEvent({
      deploymentId: 'deployment-1',
      systemId: 'system-1',
      actorId: 'actor-1',
      sequence: 2,
      stage: 'configuration_activated',
      status: 'succeeded',
      detail: { source: 'test' },
    });

    expect(insertEvent).toHaveBeenCalledWith([{
      deployment_id: 'deployment-1',
      system_id: 'system-1',
      actor_id: 'actor-1',
      sequence: 2,
      stage: 'configuration_activated',
      status: 'succeeded',
      detail: { source: 'test' },
    }]);
  });

  it('never promotes configuration-only evidence to runtime verified', () => {
    expect(classifyDeploymentTruth({
      status: 'active',
      runtime_url: null,
      health: 'HEALTHY',
    })).toBe('configuration_active');

    expect(classifyDeploymentTruth({
      status: 'active',
      runtime_url: 'https://runtime.example.test',
      health: 'HEALTHY',
    })).toBe('runtime_verified');
  });
});
