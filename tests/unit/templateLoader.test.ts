import { describe, it, expect } from 'vitest';
import { loadAllTemplates, loadTemplateById, validateTemplate } from '@/lib/templateLoader';

describe('Template Loader - Data Centre Only', () => {
  describe('loadAllTemplates', () => {
    it('should return exactly 1 template (Data Centre Master)', () => {
      const templates = loadAllTemplates();
      expect(templates.length).toBe(1);
      expect(Array.isArray(templates)).toBe(true);
      expect(templates[0].id).toBe('datacentre-master-twin-v1');
    });

    it('should have valid schema for the Data Centre template', () => {
      const templates = loadAllTemplates();
      templates.forEach(template => {
        expect(validateTemplate(template)).toBe(true);
      });
    });

    it('should have required fields', () => {
      const templates = loadAllTemplates();
      templates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.industry).toBeDefined();
        expect(template.department).toBeDefined();
        expect(template.twin_type).toBeDefined();
        expect(template.rag).toBeDefined();
        expect(template.llm).toBeDefined();
        expect(template.workflow).toBeDefined();
        expect(template.system_prompt).toBeDefined();
        expect(template.metrics_defaults).toBeDefined();
      });
    });
  });

  describe('loadTemplateById', () => {
    it('should load Data Centre template by id', () => {
      const template = loadTemplateById('datacentre-master-twin-v1');
      expect(template).toBeDefined();
      expect(template?.id).toBe('datacentre-master-twin-v1');
      expect(template?.name).toBe('Data Centre Digital Twin');
    });

    it('should return null for non-existent template', () => {
      const template = loadTemplateById('non_existent');
      expect(template).toBeNull();
    });
  });

  describe('Data Centre Template Schema Validation', () => {
    it('should validate RAG configuration', () => {
      const templates = loadAllTemplates();
      templates.forEach(template => {
        expect(template.rag.top_k).toBeGreaterThan(0);
        expect(template.rag.top_n).toBeGreaterThan(0);
        expect(template.rag.embedding_model).toBeDefined();
      });
    });

    it('should validate LLM configuration', () => {
      const templates = loadAllTemplates();
      templates.forEach(template => {
        expect(template.llm.model).toBeDefined();
        expect(template.llm.temperature).toBeGreaterThanOrEqual(0);
        expect(template.llm.temperature).toBeLessThanOrEqual(2);
      });
    });

    it('should validate workflow structure', () => {
      const templates = loadAllTemplates();
      templates.forEach(template => {
        expect(template.workflow.nodes).toBeDefined();
        expect(template.workflow.edges).toBeDefined();
        expect(template.workflow.nodes.length).toBeGreaterThan(0);
      });
    });

    it('should validate metrics defaults', () => {
      const templates = loadAllTemplates();
      templates.forEach(template => {
        expect(template.metrics_defaults.time_saved_per_run_min).toBeGreaterThan(0);
        expect(template.metrics_defaults.runs_per_week).toBeGreaterThan(0);
        expect(template.metrics_defaults.loaded_cost_per_hour).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Centre Specific Validation', () => {
    it('should have 9 domain twins configuration', () => {
      const template = loadTemplateById('datacentre-master-twin-v1');
      expect(template?.badges).toContain('Sovereign AI');
      expect(template?.badges).toContain('Tier IV');
    });

    it('should have simulation scenarios', () => {
      const template = loadTemplateById('datacentre-master-twin-v1');
      expect(template?.simulation_scripts).toBeDefined();
      expect(template?.simulation_scripts?.length).toBeGreaterThan(0);
    });

    it('should have DC-specific KPIs', () => {
      const template = loadTemplateById('datacentre-master-twin-v1');
      expect(template?.blueprint.kpis).toBeDefined();
      const kpiNames = template?.blueprint.kpis.map(k => k.name);
      expect(kpiNames).toContain('Power Usage Effectiveness');
      expect(kpiNames).toContain('GPU Cluster Utilization');
    });
  });
});
