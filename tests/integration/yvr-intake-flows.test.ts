/**
 * YVR Template Intake Flows Tests
 * Ensures YVR is correctly recommended from all intake methods
 */

import { describe, it, expect } from 'vitest';
import {
  recommendTemplatesFromContent,
  recommendTemplatesFromDocument,
  recommendTemplatesFromQuestionnaire,
} from '@/lib/intake/templateRecommendations';

describe('YVR Template Intake Recommendations', () => {
  describe('URL Scanner Intake', () => {
    it('should recommend YVR for airport URLs', () => {
      const recommendations = recommendTemplatesFromContent({
        url: 'https://www.yvr.ca',
        text: 'Vancouver International Airport operations',
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].templateId).toBe('YVR_AIRPORT_DIGITAL_TWIN');
      expect(recommendations[0].confidence).toBeGreaterThan(0.7);
    });

    it('should recommend YVR for aviation keywords', () => {
      const recommendations = recommendTemplatesFromContent({
        text: 'flight operations baggage handling passenger flow security',
        keywords: ['airport', 'aviation', 'terminal'],
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].templateId).toBe('YVR_AIRPORT_DIGITAL_TWIN');
    });

    it('should recommend YVR for airline content', () => {
      const recommendations = recommendTemplatesFromContent({
        text: 'airline operations gate management aircraft turnaround',
        industry: 'Aviation',
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].templateId).toBe('YVR_AIRPORT_DIGITAL_TWIN');
    });

    it('should recommend YVR for transportation hubs', () => {
      const recommendations = recommendTemplatesFromContent({
        text: 'transportation hub logistics real-time tracking',
        keywords: ['transit', 'distribution'],
      });

      expect(recommendations.length).toBeGreaterThan(0);
      // Should recommend YVR for transportation infrastructure
      const hasYVR = recommendations.some(r => r.templateId === 'YVR_AIRPORT_DIGITAL_TWIN');
      expect(hasYVR).toBe(true);
    });

    it('should NOT recommend YVR for unrelated content', () => {
      const recommendations = recommendTemplatesFromContent({
        text: 'e-commerce online shopping retail store',
        keywords: ['retail', 'ecommerce'],
      });

      // YVR should either not appear or have very low confidence
      const yvrRec = recommendations.find(r => r.templateId === 'YVR_AIRPORT_DIGITAL_TWIN');
      if (yvrRec) {
        expect(yvrRec.confidence).toBeLessThan(0.5);
      }
    });
  });

  describe('Document Upload Intake', () => {
    it('should recommend YVR for airport operation docs', () => {
      const recommendations = recommendTemplatesFromDocument({
        industry: 'Aviation',
        department: 'Operations',
        summary: 'Airport operations manual covering flight scheduling, baggage handling, and passenger services',
        keywords: ['airport', 'operations', 'passenger', 'baggage'],
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].templateId).toBe('YVR_AIRPORT_DIGITAL_TWIN');
      expect(recommendations[0].confidence).toBeGreaterThan(0.7);
    });

    it('should recommend YVR for aviation safety docs', () => {
      const recommendations = recommendTemplatesFromDocument({
        industry: 'Aviation',
        keywords: ['FAA', 'safety', 'compliance', 'runway'],
        summary: 'Aviation safety procedures and compliance documentation',
      });

      expect(recommendations.length).toBeGreaterThan(0);
      const hasYVR = recommendations.some(r => r.templateId === 'YVR_AIRPORT_DIGITAL_TWIN');
      expect(hasYVR).toBe(true);
    });

    it('should recommend YVR for ground operations docs', () => {
      const recommendations = recommendTemplatesFromDocument({
        department: 'Ground Operations',
        keywords: ['ramp', 'turnaround', 'baggage', 'gate'],
        summary: 'Ground handling operations procedures',
      });

      expect(recommendations.length).toBeGreaterThan(0);
      const hasYVR = recommendations.some(r => r.templateId === 'YVR_AIRPORT_DIGITAL_TWIN');
      expect(hasYVR).toBe(true);
    });
  });

  describe('Questionnaire Intake', () => {
    it('should recommend YVR for aviation industry', () => {
      const recommendations = recommendTemplatesFromQuestionnaire({
        industry: 'Aviation',
        department: 'Operations',
        useCase: 'Real-time flight operations monitoring',
        realTimeNeeds: true,
        integrationCount: 8,
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].templateId).toBe('YVR_AIRPORT_DIGITAL_TWIN');
      expect(recommendations[0].confidence).toBeGreaterThan(0.9);
    });

    it('should recommend YVR for airport industry', () => {
      const recommendations = recommendTemplatesFromQuestionnaire({
        industry: 'Airport',
        department: 'Passenger Services',
        useCase: 'Passenger flow optimization',
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].templateId).toBe('YVR_AIRPORT_DIGITAL_TWIN');
    });

    it('should recommend YVR for transportation industry with complexity', () => {
      const recommendations = recommendTemplatesFromQuestionnaire({
        industry: 'Transportation',
        department: 'Operations',
        realTimeNeeds: true,
        integrationCount: 10,
        useCase: 'Multi-system coordination',
      });

      expect(recommendations.length).toBeGreaterThan(0);
      const hasYVR = recommendations.some(r => r.templateId === 'YVR_AIRPORT_DIGITAL_TWIN');
      expect(hasYVR).toBe(true);
    });

    it('should recommend YVR for passenger-related use cases', () => {
      const recommendations = recommendTemplatesFromQuestionnaire({
        industry: 'Services',
        department: 'Operations',
        useCase: 'Passenger flow management and queue optimization',
      });

      expect(recommendations.length).toBeGreaterThan(0);
      const hasYVR = recommendations.some(r => r.templateId === 'YVR_AIRPORT_DIGITAL_TWIN');
      expect(hasYVR).toBe(true);
    });

    it('should recommend YVR for baggage use cases', () => {
      const recommendations = recommendTemplatesFromQuestionnaire({
        useCase: 'baggage tracking and handling optimization',
      });

      expect(recommendations.length).toBeGreaterThan(0);
      const hasYVR = recommendations.some(r => r.templateId === 'YVR_AIRPORT_DIGITAL_TWIN');
      expect(hasYVR).toBe(true);
    });
  });

  describe('Recommendation Quality', () => {
    it('should provide reasons for recommendations', () => {
      const recommendations = recommendTemplatesFromContent({
        text: 'airport flight baggage',
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].reason).toBeDefined();
      expect(typeof recommendations[0].reason).toBe('string');
      expect(recommendations[0].reason.length).toBeGreaterThan(20);
    });

    it('should have confidence scores', () => {
      const recommendations = recommendTemplatesFromContent({
        text: 'airport operations',
      });

      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach(rec => {
        expect(typeof rec.confidence).toBe('number');
        expect(rec.confidence).toBeGreaterThanOrEqual(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should sort by confidence descending', () => {
      const recommendations = recommendTemplatesFromContent({
        text: 'airport flight operations passenger baggage terminal',
      });

      if (recommendations.length > 1) {
        for (let i = 0; i < recommendations.length - 1; i++) {
          expect(recommendations[i].confidence).toBeGreaterThanOrEqual(
            recommendations[i + 1].confidence
          );
        }
      }
    });
  });

  describe('Keyword Detection Accuracy', () => {
    const aviationKeywords = [
      'airport', 'aviation', 'flight', 'airline', 'runway', 'terminal',
      'passenger', 'baggage', 'gate', 'aircraft', 'departure', 'arrival',
      'security screening', 'ground operations', 'cargo', 'customs',
    ];

    aviationKeywords.forEach(keyword => {
      it(`should detect aviation keyword: ${keyword}`, () => {
        const recommendations = recommendTemplatesFromContent({
          text: `System for ${keyword} management`,
        });

        const hasYVR = recommendations.some(r => r.templateId === 'YVR_AIRPORT_DIGITAL_TWIN');
        expect(hasYVR).toBe(true);
      });
    });
  });
});
