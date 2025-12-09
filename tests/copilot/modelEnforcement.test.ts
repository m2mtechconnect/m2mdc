/**
 * Model Enforcement Tests for AURA Co-Pilot
 * 
 * Ensures Co-Pilot ALWAYS uses Gemini 3.x models across all routes
 */

import { describe, it, expect } from 'vitest';
import { 
  resolveLatestGeminiModel, 
  getFallbackGeminiModel,
  isGemini3x,
  enforceGemini3x,
  getGeminiDisplayName,
  getGeminiVersion
} from '../../src/lib/llm/modelResolver';

describe('Model Resolver - Gemini 3.x Enforcement', () => {
  it('should always resolve to Gemini 3.x primary model', () => {
    const model = resolveLatestGeminiModel();
    expect(model).toContain('gemini-3');
    expect(model).toBe('google/gemini-3-pro-preview');
  });

  it('should provide Gemini 3.x fallback model', () => {
    const fallback = getFallbackGeminiModel();
    expect(fallback).toContain('gemini-3');
    expect(fallback).toBe('google/gemini-3.0-pro');
  });

  it('should correctly identify Gemini 3.x models', () => {
    expect(isGemini3x('google/gemini-3-pro-preview')).toBe(true);
    expect(isGemini3x('google/gemini-3.0-pro')).toBe(true);
    expect(isGemini3x('google/gemini-3.5-pro')).toBe(true);
    expect(isGemini3x('gemini-3')).toBe(true);
  });

  it('should reject non-Gemini 3.x models', () => {
    expect(isGemini3x('google/gemini-2.5-flash')).toBe(false);
    expect(isGemini3x('google/gemini-2.5-pro')).toBe(false);
    expect(isGemini3x('google/gemini-1.5-pro')).toBe(false);
    expect(isGemini3x('openai/gpt-5')).toBe(false);
  });

  it('should throw error when enforcing non-3.x models', () => {
    expect(() => enforceGemini3x('google/gemini-2.5-flash')).toThrow();
    expect(() => enforceGemini3x('google/gemini-1.5-pro')).toThrow();
    expect(() => enforceGemini3x('openai/gpt-5')).toThrow();
  });

  it('should allow Gemini 3.x models through enforcement', () => {
    expect(() => enforceGemini3x('google/gemini-3-pro-preview')).not.toThrow();
    expect(() => enforceGemini3x('google/gemini-3.0-pro')).not.toThrow();
  });

  it('should provide correct display name', () => {
    const displayName = getGeminiDisplayName();
    expect(displayName).toBeTruthy();
    expect(displayName).toContain('Gemini');
  });

  it('should provide correct version number', () => {
    const version = getGeminiVersion();
    expect(version).toBeTruthy();
    expect(version).toMatch(/^3\./);
  });
});

describe('AI Client Configuration', () => {
  it('should never use legacy model strings', () => {
    const legacyModels = [
      'gemini-1.5',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.5-flash-lite',
      'gpt-5',
      'claude',
    ];

    const validModel = resolveLatestGeminiModel();
    legacyModels.forEach(legacy => {
      expect(validModel).not.toContain(legacy);
    });
  });

  it('should maintain fallback to stable Gemini 3.x', () => {
    const fallback = getFallbackGeminiModel();
    expect(fallback).toContain('gemini-3');
    expect(fallback).not.toContain('preview');
  });
});
