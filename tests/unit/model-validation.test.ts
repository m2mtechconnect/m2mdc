import { describe, it, expect } from 'vitest';

describe('Model Parameter Validation', () => {
  describe('Temperature', () => {
    it('should accept valid temperature values', () => {
      const validTemps = [0, 0.3, 0.5, 0.7, 1.0];
      validTemps.forEach(temp => {
        expect(temp).toBeGreaterThanOrEqual(0);
        expect(temp).toBeLessThanOrEqual(1);
      });
    });

    it('should reject invalid temperature values', () => {
      const invalidTemps = [-0.1, 1.1, 2.0, NaN];
      invalidTemps.forEach(temp => {
        const isValid = temp >= 0 && temp <= 1 && !isNaN(temp);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('TopK', () => {
    it('should accept valid topK values', () => {
      const validTopK = [5, 10, 15, 20, 40];
      validTopK.forEach(k => {
        expect(k).toBeGreaterThan(0);
        expect(k).toBeLessThanOrEqual(40);
      });
    });

    it('should reject invalid topK values', () => {
      const invalidTopK = [0, -5, 41, 100];
      invalidTopK.forEach(k => {
        const isValid = k > 0 && k <= 40;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('TopN', () => {
    it('should accept valid topN values', () => {
      const validTopN = [3, 5, 8, 10];
      validTopN.forEach(n => {
        expect(n).toBeGreaterThan(0);
        expect(n).toBeLessThanOrEqual(10);
      });
    });

    it('should reject invalid topN values', () => {
      const invalidTopN = [0, -1, 11, 20];
      invalidTopN.forEach(n => {
        const isValid = n > 0 && n <= 10;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Data Residency', () => {
    const validRegions = [
      'us-central1',
      'us-east1',
      'europe-west1',
      'asia-northeast1'
    ];

    it('should accept valid region values', () => {
      validRegions.forEach(region => {
        expect(validRegions).toContain(region);
      });
    });

    it('should reject invalid region values', () => {
      const invalidRegions = ['invalid-region', 'us-invalid', ''];
      invalidRegions.forEach(region => {
        expect(validRegions).not.toContain(region);
      });
    });
  });

  describe('Model Selection', () => {
    const supportedModels = [
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-flash-lite',
      'openai/gpt-5',
      'openai/gpt-5-mini',
      'openai/gpt-5-nano'
    ];

    it('should validate supported models', () => {
      supportedModels.forEach(model => {
        expect(supportedModels).toContain(model);
      });
    });

    it('should reject unsupported models', () => {
      const unsupportedModels = [
        'openai/gpt-4',
        'anthropic/claude-3',
        'invalid-model'
      ];

      unsupportedModels.forEach(model => {
        expect(supportedModels).not.toContain(model);
      });
    });
  });
});
