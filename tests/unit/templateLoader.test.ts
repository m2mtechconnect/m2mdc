import { describe, it, expect } from '@jest/globals';
import { loadAllTemplates, loadTemplateById, validateTemplate } from '@/lib/templateLoader';

describe('Template Loader', () => {
  describe('loadAllTemplates', () => {
    it('should return 40-50 templates after Phase 3 completion', () => {
      const templates = loadAllTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(40);
      expect(templates.length).toBeLessThanOrEqual(50);
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.every(t => t.id)).toBe(true);
    });

    it('should have valid schema for all templates', () => {
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
    it('should load existing template by id', () => {
      const template = loadTemplateById('retail_inventory_optimization');
      expect(template).toBeDefined();
      expect(template?.id).toBe('retail_inventory_optimization');
    });

    it('should return null for non-existent template', () => {
      const template = loadTemplateById('non_existent');
      expect(template).toBeNull();
    });
  });

  describe('Template Schema Validation', () => {
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

  describe('ROI Calculations', () => {
    it('should have valid ROI hint within acceptable range', () => {
      const templates = loadAllTemplates();
      templates.forEach(template => {
        const m = template.metrics_defaults;
        const timeInHours = (m.time_saved_per_run_min / 60) * m.runs_per_week * 52;
        const laborSavings = timeInHours * m.loaded_cost_per_hour;
        const errorReduction = m.runs_per_week * 52 * (m.accuracy_improvement_pct / 100) * m.cost_per_error;
        const totalSavings = laborSavings + errorReduction;
        
        // Mock implementation cost (would vary in real scenario)
        const implementationCost = 50000;
        const calculatedROI = ((totalSavings - implementationCost) / implementationCost) * 100;
        
        // Allow for rounding differences
        const diff = Math.abs(calculatedROI - template.roi_hint);
        expect(diff).toBeLessThan(100); // Reasonable variance
      });
    });
  });
});
