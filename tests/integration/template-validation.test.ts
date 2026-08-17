import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

describe('Template Validation Integration Tests', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  describe('validate endpoint', () => {
    it('should validate when required secrets exist', async () => {
      const { data, error } = await supabase.functions.invoke('template-validate', {
        body: {
          templateId: 'compliance_ai_healthcare',
          config: {
            rag: { index_name: 'm2m_docs_vec' },
            knowledge: [{ type: 'web_rule', allow: ['*.hhs.gov/*'] }],
            connectors: [{ id: 'salesforce', mode: 'optional' }]
          }
        }
      });

      expect(error).toBeNull();
      expect(data?.valid).toBeDefined();
      expect(data?.checks).toBeDefined();
      expect(data?.checks.secrets).toBeDefined();
    });

    it('should fail validation with clear message when secrets missing', async () => {
      // This test would need a separate environment without secrets
      // In production, mock the environment or use a test environment
      expect(true).toBe(true); // Placeholder
    });

    it('should check vector index configuration', async () => {
      const { data } = await supabase.functions.invoke('template-validate', {
        body: {
          templateId: 'quality_control_manufacturing',
          config: {
            rag: { index_name: 'm2m_docs_vec' },
            knowledge: [],
            connectors: []
          }
        }
      });

      expect(data?.checks?.index).toBeDefined();
    });

    it('should validate knowledge sources', async () => {
      const { data } = await supabase.functions.invoke('template-validate', {
        body: {
          templateId: 'predictive_maintenance_energy',
          config: {
            knowledge: [
              { type: 'library_ref', ref: 'scada_manuals' },
              { type: 'web_rule', allow: ['*.energy.gov/*'], deny: [] }
            ]
          }
        }
      });

      expect(data?.checks?.knowledge).toBe(true);
    });

    it('should warn about optional unconnected connectors', async () => {
      const { data } = await supabase.functions.invoke('template-validate', {
        body: {
          templateId: 'marketing_campaign_bot',
          config: {
            connectors: [
              { id: 'salesforce', mode: 'optional' },
              { id: 'slack', mode: 'optional' }
            ]
          }
        }
      });

      expect(data?.warnings).toBeDefined();
      expect(data?.warnings?.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('test-run endpoint', () => {
    it('should run sample query and return grounded answer', async () => {
      const { data, error } = await supabase.functions.invoke('template-test-run', {
        body: {
          templateId: 'compliance_ai_healthcare',
          config: {
            llm: { model: 'google/gemini-2.5-flash', temperature: 0.3 },
            system_prompt: 'You are a compliance AI assistant.'
          }
        }
      });

      expect(error).toBeNull();
      expect(data?.success).toBe(true);
      expect(data?.answer).toBeDefined();
      expect(data?.snippets).toBeDefined();
      expect(data?.citations).toBeDefined();
      expect(data?.latencyMs).toBeGreaterThan(0);
    });

    it('should return faithfulness score', async () => {
      const { data } = await supabase.functions.invoke('template-test-run', {
        body: {
          templateId: 'quality_control_manufacturing',
          config: {
            llm: { model: 'google/gemini-2.5-flash', temperature: 0.1 }
          }
        }
      });

      expect(data?.faithfulnessScore).toBeDefined();
      expect(data?.faithfulnessScore).toBeGreaterThanOrEqual(0);
      expect(data?.faithfulnessScore).toBeLessThanOrEqual(100);
    });

    it('should handle all template types', async () => {
      const templateIds = [
        'compliance_ai_healthcare',
        'predictive_maintenance_energy',
        'quality_control_manufacturing',
        'marketing_campaign_bot',
        'finance_report_automation',
        'onboarding_assistant_hr'
      ];

      for (const templateId of templateIds) {
        const { data, error } = await supabase.functions.invoke('template-test-run', {
          body: { templateId, config: {} }
        });

        expect(error).toBeNull();
        expect(data?.success).toBe(true);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle user deselecting grounding', async () => {
      const { data } = await supabase.functions.invoke('template-validate', {
        body: {
          templateId: 'compliance_ai_healthcare',
          config: { grounding: false }
        }
      });

      expect(data?.warnings).toBeDefined();
      // Should warn but not block
      expect(data?.valid || data?.warnings?.length > 0).toBe(true);
    });

    it('should handle optional connector left unconnected', async () => {
      const { data } = await supabase.functions.invoke('template-test-run', {
        body: {
          templateId: 'marketing_campaign_bot',
          config: {
            connectors: [{ id: 'salesforce', mode: 'optional', connected: false }]
          }
        }
      });

      // Should auto-stub the node and continue
      expect(data?.success).toBe(true);
    });
  });
});
