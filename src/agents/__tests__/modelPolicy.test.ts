import { describe, expect, it } from 'vitest';
import {
  mergeAgentModelConfig,
  modelCanBeSelected,
  runtimeStatusForModel,
} from '../modelPolicy';

describe('agent model policy', () => {
  it('keeps provider-neutral profiles selectable', () => {
    expect(runtimeStatusForModel('profile:fast')).toBe('runtime-supported');
    expect(runtimeStatusForModel('profile:reasoning')).toBe('runtime-supported');
    expect(runtimeStatusForModel('profile:supervisor')).toBe('runtime-supported');
  });

  it('keeps known legacy Google IDs backward-compatible', () => {
    expect(modelCanBeSelected('google/gemini-2.5-flash')).toBe(true);
    expect(modelCanBeSelected('google/gemini-3-pro-preview')).toBe(true);
  });

  it('requires an explicitly configured NVIDIA provider before NVIDIA IDs are selectable', () => {
    expect(runtimeStatusForModel('nvidia/nemotron-3.5-lightning-30b-a3b')).toBe('requires-provider');
    expect(runtimeStatusForModel(
      'nvidia/nemotron-3.5-lightning-30b-a3b',
      { selectedProvider: 'nvidia-build', nvidia: { configured: true } },
    )).toBe('runtime-supported');
  });

  it('treats unimplemented marketplace entries as catalog-only', () => {
    expect(runtimeStatusForModel('anthropic/claude-opus-4')).toBe('catalog-only');
    expect(runtimeStatusForModel('mistral/mistral-large-2')).toBe('catalog-only');
    expect(runtimeStatusForModel('deepseek/deepseek-v3')).toBe('catalog-only');
  });

  it('preserves unrelated config when selecting a model', () => {
    const existing = {
      system_prompt: 'preserve me',
      temperature: 0.2,
      tools: ['sensor.read'],
      ragSettings: { topK: 10 },
    };
    expect(mergeAgentModelConfig(existing, {
      model: 'profile:reasoning',
      ragSettings: { topK: 20, topN: 6 },
    })).toEqual({
      system_prompt: 'preserve me',
      temperature: 0.2,
      tools: ['sensor.read'],
      model: 'profile:reasoning',
      ragSettings: { topK: 20, topN: 6 },
    });
  });

  it('handles absent or malformed existing config safely', () => {
    expect(mergeAgentModelConfig(null, { model: 'profile:fast' })).toEqual({ model: 'profile:fast' });
    expect(mergeAgentModelConfig([], { model: 'profile:fast' })).toEqual({ model: 'profile:fast' });
  });
});
