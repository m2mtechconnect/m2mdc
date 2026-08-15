/**
 * Runtime derivative selection must follow the recorded manifest decision.
 * These tests prove that moving the camera further away can never select a
 * derivative that is objectively more expensive than the nearer choice.
 */
import { describe, it, expect } from 'vitest';
import {
  DISTANCE_BANDS,
  bandForDistance,
  derivativeCost,
  listAssets,
  listAssetsForRole,
  resolveRoleAssetForBand,
  SEMANTIC_ROLE_LABEL,
  type SemanticRole,
} from '../assetRegistry';

const ROLES = Object.keys(SEMANTIC_ROLE_LABEL) as SemanticRole[];

describe('derivative quality policy', () => {
  it('maps distances to bands', () => {
    expect(bandForDistance(1)).toBe('selected');
    expect(bandForDistance(8)).toBe('nearby');
    expect(bandForDistance(40)).toBe('overview');
    expect(DISTANCE_BANDS).toHaveLength(3);
  });

  it('never selects a more expensive derivative as the camera moves away', () => {
    for (const role of ROLES) {
      const near = resolveRoleAssetForBand(role, 'nearby');
      const far = resolveRoleAssetForBand(role, 'overview');
      if (!near || !far) continue;
      const cn = derivativeCost(near.entry);
      const cf = derivativeCost(far.entry);
      const strictlyWorse =
        cf.triangles > cn.triangles && cf.drawCalls >= cn.drawCalls && cf.sizeBytes > cn.sizeBytes;
      expect(strictlyWorse, `${role}: overview derivative ${far.entry.assetId} is more expensive than ${near.entry.assetId}`).toBe(false);
    }
  });

  it('records a decision for every runtime-eligible derivative', () => {
    for (const entry of listAssets()) {
      if (entry.runtimeEligible !== true || !entry.qualityLevel) continue;
      expect(entry.qualityDecision, entry.assetId).toBeTruthy();
      expect(entry.qualityMetrics, entry.assetId).toBeTruthy();
      expect(typeof entry.renderCostRank, entry.assetId).toBe('number');
    }
  });

  it('excludes derivatives the manifest rejects for runtime', () => {
    for (const role of ROLES) {
      for (const band of DISTANCE_BANDS) {
        const picked = resolveRoleAssetForBand(role, band);
        if (!picked) continue;
        expect(picked.entry.runtimePreferred, `${role}/${band}`).not.toBe(false);
        expect(picked.entry.runtimeEligible).toBe(true);
      }
    }
  });

  it('keeps rejected LODs in the manifest for audit', () => {
    const rejected = listAssets().filter((a) => a.runtimePreferred === false && a.qualityLevel === 'lod');
    expect(rejected.length).toBeGreaterThan(0);
    for (const entry of rejected) {
      expect(entry.qualityDecision).toMatch(/rejected|quarantin|Lineage/i);
      const role = entry.semanticRole as SemanticRole | undefined;
      if (!role) continue;
      for (const band of DISTANCE_BANDS) {
        expect(resolveRoleAssetForBand(role, band)?.entry.assetId).not.toBe(entry.assetId);
      }
    }
  });

  it('never resolves the blocked switch derivative for any role', () => {
    const blocked = listAssets().filter((a) => a.assetId.includes('qm8700_f_01'));
    expect(blocked.length).toBeGreaterThan(0);
    for (const entry of blocked) {
      expect(entry.runtimeEligible).not.toBe(true);
      expect(entry.glbUrl).toBeNull();
    }
    const ids = listAssetsForRole('network-switch').map((a) => a.assetId);
    expect(ids.some((id) => id.includes('qm8700_f_01'))).toBe(false);
  });
});
