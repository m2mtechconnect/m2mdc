import { describe, expect, it } from 'vitest';
import {
  mergeAgentModelConfig,
  modelCanBeSelected,
  runtimeStatusForModel,
} from '../modelPolicy';

const AURA_READY = { selectedProvider: 'aura-managed', auraManaged: { configured: true } };
const NVIDIA_READY = { selectedProvider: 'nvidia-hosted', nvidia: { configured: true } };
const PRIVATE_READY = { selectedProvider: 'private-compatible', privateCompatible: { configured: true } };

describe('agent model policy', () => {
  it('fails closed for portable profiles until the selected provider is proven ready', () => {
    expect(runtimeStatusForModel('profile:fast')).toBe('requires-provider');
    expect(runtimeStatusForModel('profile:reasoning', AURA_READY)).toBe('runtime-supported');
    expect(runtimeStatusForModel('profile:supervisor', NVIDIA_READY)).toBe('runtime-supported');
  });

  it('keeps known legacy Google IDs usable only through a ready AURA-managed provider', () => {
    expect(modelCanBeSelected('google/gemini-2.5-flash')).toBe(false);
    expect(modelCanBeSelected('google/gemini-2.5-flash', AURA_READY)).toBe(true);
    expect(runtimeStatusForModel('google/gemini-3-pro-preview', NVIDIA_READY)).toBe('requires-provider');
  });

  it('requires a ready matching NVIDIA-capable provider for NVIDIA IDs', () => {
    expect(runtimeStatusForModel('nvidia/nemotron-3.5-lightning-30b-a3b')).toBe('requires-provider');
    expect(runtimeStatusForModel('nvidia/nemotron-3.5-lightning-30b-a3b', NVIDIA_READY)).toBe('runtime-supported');
    expect(runtimeStatusForModel('nvidia/nemotron-3.5-lightning-30b-a3b', PRIVATE_READY)).toBe('runtime-supported');
  });

  it('treats unimplemented marketplace entries as catalog-only', () => {
    expect(runtimeStatusForModel('anthropic/claude-opus-4', AURA_READY)).toBe('catalog-only');
    expect(runtimeStatusForModel('mistral/mistral-large-2', AURA_READY)).toBe('catalog-only');
    expect(runtimeStatusForModel('deepseek/deepseek-v3', AURA_READY)).toBe('catalog-only');
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
