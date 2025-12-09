/**
 * Unified Intake Service Integration Tests
 * Tests the Phase 1 implementation of the unified intake system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  startBuilderFromIntake,
  startBuilderFromTemplate,
  startBuilderFromFile,
  startBuilderFromQuestionnaire,
  startBuilderFromUrl,
} from '@/lib/intake';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'test-session-id',
              owner_id: 'test-user',
              config: {
                blueprint: {
                  source: 'template',
                  name: 'Test Agent',
                },
              },
              goal: {},
              meta: {},
              step_completed: 1,
              created_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'test-template-id',
              name: 'Test Template',
              description: 'Test template description',
              industry: 'Construction',
              default_config: {},
            },
            error: null,
          })),
        })),
      })),
    })),
  },
}));

// Mock template loader
vi.mock('@/lib/templateLoader', () => ({
  loadAllTemplates: () => [
    {
      id: 'test-template-id',
      name: 'Test Template',
      description: 'Test template description',
      industry: 'Construction',
      default_config: {},
    },
  ],
}));

// Mock blueprint store
vi.mock('@/stores/blueprintStore', () => ({
  useBlueprintStore: {
    getState: () => ({
      setBlueprint: vi.fn(),
    }),
  },
}));

// Mock analytics
vi.mock('@/lib/analytics/intakeTracking', () => ({
  trackIntakeComplete: vi.fn(),
  trackBuilderOpened: vi.fn(),
}));

describe('Unified Intake Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startBuilderFromTemplate', () => {
    it('should create session and return result', async () => {
      const result = await startBuilderFromTemplate(
        'test-template-id',
        'test-user',
        'marketplace'
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('test-session-id');
      expect(result.blueprint).toBeDefined();
      expect(result.blueprint.source).toBe('template');
      expect(result.builderUrl).toContain('/builder?session=');
    });

    it('should set correct source in blueprint', async () => {
      const result = await startBuilderFromTemplate(
        'test-template-id',
        'test-user',
        'dashboard'
      );

      expect(result.blueprint.source).toBe('template');
    });
  });

  describe('startBuilderFromUrl', () => {
    it('should create minimal blueprint from URL', async () => {
      const result = await startBuilderFromUrl(
        'https://example.com',
        'test-user'
      );

      expect(result.success).toBe(true);
      expect(result.blueprint.source).toBe('url');
      expect(result.blueprint.knowledge.urls).toContain('https://example.com');
    });
  });

  describe('startBuilderFromIntake - Generic', () => {
    it('should handle template source', async () => {
      const result = await startBuilderFromIntake({
        source: 'template',
        userId: 'test-user',
        templateId: 'test-template-id',
      });

      expect(result.success).toBe(true);
      expect(result.blueprint.source).toBe('template');
    });

    it('should handle URL source', async () => {
      const result = await startBuilderFromIntake({
        source: 'url',
        userId: 'test-user',
        urlInput: 'https://example.com',
      });

      expect(result.success).toBe(true);
      expect(result.blueprint.source).toBe('url');
    });

    it('should handle missing required fields gracefully', async () => {
      const result = await startBuilderFromIntake({
        source: 'template',
        userId: 'test-user',
        // Missing templateId
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('templateId required');
    });

    it('should generate correct builder URL', async () => {
      const result = await startBuilderFromTemplate(
        'test-template-id',
        'test-user'
      );

      expect(result.builderUrl).toBe('/builder?session=test-session-id&step=1');
    });
  });

  describe('Error Handling', () => {
    it('should return error on invalid source', async () => {
      const result = await startBuilderFromIntake({
        source: 'invalid' as any,
        userId: 'test-user',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle conversion failures', async () => {
      const result = await startBuilderFromIntake({
        source: 'file',
        userId: 'test-user',
        // Missing fileJobId
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('fileJobId required');
    });
  });
});
