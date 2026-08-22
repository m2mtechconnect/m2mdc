import { describe, expect, it } from 'vitest';
import {
  NVIDIA_DSX_CONTENT_PACK,
  canPublishDsxSourceGeometry,
  canUseDsxSourceInProduction,
} from '../sourceCatalog';

describe('NVIDIA DSX source catalogue', () => {
  it('tracks the official v2.1 NGC evaluation pack and expected root stage', () => {
    expect(NVIDIA_DSX_CONTENT_PACK.version).toBe('2.1');
    expect(NVIDIA_DSX_CONTENT_PACK.expectedRootStage).toBe('DSX_BP/Assembly/DSX_Main_BP.usda');
    expect(NVIDIA_DSX_CONTENT_PACK.licenceLabel).toBe('NVIDIA Sample Data License for Evaluation');
    expect(NVIDIA_DSX_CONTENT_PACK.signed).toBe(true);
  });

  it('fails closed for public redistribution and production use until rights are established', () => {
    expect(NVIDIA_DSX_CONTENT_PACK.repositoryPolicy).toBe('private-intake-only');
    expect(canPublishDsxSourceGeometry(NVIDIA_DSX_CONTENT_PACK)).toBe(false);
    expect(canUseDsxSourceInProduction(NVIDIA_DSX_CONTENT_PACK)).toBe(false);
  });
});
