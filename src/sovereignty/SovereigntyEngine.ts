/**
 * Sovereignty Engine - Core evaluation logic for data sovereignty compliance
 */

import type {
  DataAsset,
  SovereigntyDataFlow,
  SovereigntyPolicy,
  ComplianceFrameworkStatus,
  SovereigntyEngineResult,
  SovereigntyViolation,
  DataClassification,
  JurisdictionCode,
} from './types';

/**
 * Main Sovereignty Engine class
 */
export class SovereigntyEngine {
  /**
   * Evaluate sovereignty compliance across all flows, assets, and policies
   */
  evaluate(
    flows: SovereigntyDataFlow[],
    assets: DataAsset[],
    policies: SovereigntyPolicy[],
    frameworks: ComplianceFrameworkStatus[],
    primaryJurisdiction: JurisdictionCode
  ): SovereigntyEngineResult {
    const violations: SovereigntyViolation[] = [];
    const now = new Date().toISOString();

    // Collect existing violations from flows
    for (const flow of flows) {
      violations.push(...flow.violations);
    }

    // Run policy evaluations
    const enabledPolicies = policies.filter(p => p.enabled);
    
    for (const flow of flows) {
      for (const policy of enabledPolicies) {
        // Check: Cross-border flow not in allowed pairs
        if (flow.isCrossBorder) {
          const isAllowed = policy.allowedCrossBorderPairs.some(
            pair => pair.from === flow.sourceJurisdiction && pair.to === flow.targetJurisdiction
          );
          const isBlocked = policy.blockedJurisdictions.includes(flow.targetJurisdiction);

          if (!isAllowed || isBlocked) {
            const existing = violations.find(
              v => v.flowId === flow.id && v.reasonCode === 'UNAPPROVED_CROSS_BORDER'
            );
            if (!existing) {
              violations.push({
                id: `viol-${flow.id}-xborder`,
                severity: flow.dataClassification === 'sovereign' ? 'critical' : 'high',
                reasonCode: 'UNAPPROVED_CROSS_BORDER',
                description: `Cross-border data flow from ${flow.sourceJurisdiction} to ${flow.targetJurisdiction} is not approved`,
                flowId: flow.id,
                jurisdiction: flow.sourceJurisdiction,
                targetJurisdiction: flow.targetJurisdiction,
                detectedAt: now,
                policyViolated: policy.name,
                recommendedMitigation: 'Review and approve cross-border transfer or route through approved jurisdiction',
              });
            }
          }
        }

        // Check: Target jurisdiction in blocked list
        if (policy.blockedJurisdictions.includes(flow.targetJurisdiction)) {
          const existing = violations.find(
            v => v.flowId === flow.id && v.reasonCode === 'UNAPPROVED_CLOUD_REGION'
          );
          if (!existing) {
            violations.push({
              id: `viol-${flow.id}-blocked`,
              severity: 'high',
              reasonCode: 'UNAPPROVED_CLOUD_REGION',
              description: `Data flow targets blocked jurisdiction: ${flow.targetJurisdiction}`,
              flowId: flow.id,
              jurisdiction: flow.targetJurisdiction,
              detectedAt: now,
              policyViolated: policy.name,
              recommendedMitigation: 'Redirect flow to approved jurisdiction or update policy',
            });
          }
        }

        // Check: Sovereign data leaving primary jurisdiction
        if (
          flow.dataClassification === 'sovereign' &&
          flow.targetJurisdiction !== primaryJurisdiction &&
          !flow.targetJurisdiction.startsWith(primaryJurisdiction.split('-')[0])
        ) {
          const existing = violations.find(
            v => v.flowId === flow.id && v.reasonCode === 'SOVEREIGN_DATA_LEAKAGE'
          );
          if (!existing) {
            violations.push({
              id: `viol-${flow.id}-sovereign`,
              severity: 'critical',
              reasonCode: 'SOVEREIGN_DATA_LEAKAGE',
              description: `Sovereign-classified data leaving primary jurisdiction ${primaryJurisdiction}`,
              flowId: flow.id,
              jurisdiction: flow.sourceJurisdiction,
              targetJurisdiction: flow.targetJurisdiction,
              detectedAt: now,
              policyViolated: 'Sovereign Data Residency',
              recommendedMitigation: 'Block transfer immediately and review data classification',
            });
          }
        }

        // Check: Missing encryption
        if (policy.requireEncryption && !flow.encrypted) {
          const existing = violations.find(
            v => v.flowId === flow.id && v.reasonCode === 'ENCRYPTION_MISSING'
          );
          if (!existing) {
            violations.push({
              id: `viol-${flow.id}-encrypt`,
              severity: 'medium',
              reasonCode: 'ENCRYPTION_MISSING',
              description: `Data flow ${flow.name} lacks required encryption`,
              flowId: flow.id,
              jurisdiction: flow.sourceJurisdiction,
              detectedAt: now,
              policyViolated: policy.name,
              recommendedMitigation: 'Enable encryption for this data flow',
            });
          }
        }
      }
    }

    // Check: Unclassified assets
    for (const asset of assets) {
      if (!asset.classification) {
        violations.push({
          id: `viol-${asset.id}-unclass`,
          severity: 'medium',
          reasonCode: 'UNCLASSIFIED_ASSET',
          description: `Data asset "${asset.name}" has no classification assigned`,
          assetId: asset.id,
          jurisdiction: asset.primaryJurisdiction,
          detectedAt: now,
          recommendedMitigation: 'Classify this asset as sovereign, sensitive, or public',
        });
      }
    }

    // Calculate metrics
    const crossBorderFlowCount = flows.filter(f => f.isCrossBorder).length;
    const monitoredFlowCount = flows.length;
    const blockedFlowCount = flows.filter(f => f.status === 'blocked').length;

    // Data classification distribution
    const classificationCounts: Record<DataClassification, number> = {
      sovereign: 0,
      sensitive: 0,
      public: 0,
    };
    for (const asset of assets) {
      if (asset.classification && classificationCounts[asset.classification] !== undefined) {
        classificationCounts[asset.classification]++;
      }
    }
    const totalAssets = assets.length || 1;
    const dataClassificationDistribution: Record<DataClassification, number> = {
      sovereign: Math.round((classificationCounts.sovereign / totalAssets) * 100),
      sensitive: Math.round((classificationCounts.sensitive / totalAssets) * 100),
      public: Math.round((classificationCounts.public / totalAssets) * 100),
    };

    // Jurisdiction breakdown
    const jurisdictionBreakdown: Record<JurisdictionCode, number> = {};
    for (const asset of assets) {
      const j = asset.primaryJurisdiction;
      jurisdictionBreakdown[j] = (jurisdictionBreakdown[j] || 0) + 1;
    }

    // Framework summary
    const frameworkSummary = {
      certified: frameworks.filter(f => f.status === 'certified').length,
      inProgress: frameworks.filter(f => f.status === 'in_progress').length,
      expired: frameworks.filter(f => f.status === 'expired').length,
      notApplicable: frameworks.filter(f => f.status === 'not_applicable').length,
    };

    // Audit readiness score (average of certified frameworks)
    const certifiedFrameworks = frameworks.filter(f => f.status === 'certified');
    const auditReadinessScore = certifiedFrameworks.length > 0
      ? Math.round(certifiedFrameworks.reduce((sum, f) => sum + f.auditReadinessScore, 0) / certifiedFrameworks.length)
      : 0;

    // Calculate sovereignty score
    const sovereigntyScore = this.calculateSovereigntyScore(violations);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(sovereigntyScore, violations);

    return {
      sovereigntyScore,
      violations: violations.filter(v => !v.resolvedAt), // Only unresolved
      crossBorderFlowCount,
      monitoredFlowCount,
      blockedFlowCount,
      dataClassificationDistribution,
      auditReadinessScore,
      jurisdictionBreakdown,
      frameworkSummary,
      riskLevel,
      lastEvaluatedAt: now,
    };
  }

  /**
   * Calculate sovereignty score based on violations
   * Start from 100, subtract weighted penalties
   */
  private calculateSovereigntyScore(violations: SovereigntyViolation[]): number {
    let score = 100;
    const unresolvedViolations = violations.filter(v => !v.resolvedAt);

    for (const violation of unresolvedViolations) {
      switch (violation.severity) {
        case 'critical':
          score -= 8;
          break;
        case 'high':
          score -= 5;
          break;
        case 'medium':
          score -= 2;
          break;
        case 'low':
          score -= 1;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine overall risk level
   */
  private determineRiskLevel(
    score: number,
    violations: SovereigntyViolation[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCount = violations.filter(v => v.severity === 'critical' && !v.resolvedAt).length;
    const highCount = violations.filter(v => v.severity === 'high' && !v.resolvedAt).length;

    if (criticalCount > 0 || score < 50) return 'critical';
    if (highCount > 2 || score < 70) return 'high';
    if (score < 85) return 'medium';
    return 'low';
  }

  /**
   * Simulate a sovereignty violation scenario
   */
  simulateViolation(
    currentResult: SovereigntyEngineResult,
    violationType: 'cross_border' | 'region_block' | 'sovereign_leakage'
  ): SovereigntyEngineResult {
    const newViolations = [...currentResult.violations];
    const now = new Date().toISOString();

    switch (violationType) {
      case 'cross_border':
        newViolations.push({
          id: `sim-viol-xborder-${Date.now()}`,
          severity: 'high',
          reasonCode: 'UNAPPROVED_CROSS_BORDER',
          description: 'Simulated: Unapproved cross-border data transfer detected',
          jurisdiction: 'CA-QC',
          targetJurisdiction: 'US-EAST',
          detectedAt: now,
          recommendedMitigation: 'Review and approve or block the transfer',
        });
        break;
      case 'region_block':
        newViolations.push({
          id: `sim-viol-region-${Date.now()}`,
          severity: 'high',
          reasonCode: 'UNAPPROVED_CLOUD_REGION',
          description: 'Simulated: Data routed to blocked cloud region',
          jurisdiction: 'EU',
          detectedAt: now,
          recommendedMitigation: 'Redirect to approved region',
        });
        break;
      case 'sovereign_leakage':
        newViolations.push({
          id: `sim-viol-sovereign-${Date.now()}`,
          severity: 'critical',
          reasonCode: 'SOVEREIGN_DATA_LEAKAGE',
          description: 'Simulated: Sovereign data leaving primary jurisdiction',
          jurisdiction: 'CA-QC',
          targetJurisdiction: 'US',
          detectedAt: now,
          recommendedMitigation: 'Immediately block and investigate',
        });
        break;
    }

    const newScore = this.calculateSovereigntyScore(newViolations);
    const newRiskLevel = this.determineRiskLevel(newScore, newViolations);

    return {
      ...currentResult,
      sovereigntyScore: newScore,
      violations: newViolations,
      riskLevel: newRiskLevel,
      lastEvaluatedAt: now,
    };
  }

  /**
   * Simulate policy tightening
   */
  simulatePolicyTightening(
    flows: SovereigntyDataFlow[],
    assets: DataAsset[],
    policies: SovereigntyPolicy[],
    frameworks: ComplianceFrameworkStatus[],
    primaryJurisdiction: JurisdictionCode,
    additionalBlockedJurisdictions: JurisdictionCode[]
  ): SovereigntyEngineResult {
    // Create tightened policies
    const tightenedPolicies = policies.map(p => ({
      ...p,
      blockedJurisdictions: [...p.blockedJurisdictions, ...additionalBlockedJurisdictions],
    }));

    return this.evaluate(flows, assets, tightenedPolicies, frameworks, primaryJurisdiction);
  }

  /**
   * Simulate region migration (moving workloads to approved jurisdiction)
   */
  simulateRegionMigration(
    flows: SovereigntyDataFlow[],
    assets: DataAsset[],
    policies: SovereigntyPolicy[],
    frameworks: ComplianceFrameworkStatus[],
    primaryJurisdiction: JurisdictionCode,
    targetJurisdiction: JurisdictionCode
  ): SovereigntyEngineResult {
    // Simulate migrating cross-border flows to target jurisdiction
    const migratedFlows = flows.map(f => {
      if (f.isCrossBorder && f.targetJurisdiction !== targetJurisdiction) {
        return {
          ...f,
          targetJurisdiction,
          isCrossBorder: !targetJurisdiction.startsWith(primaryJurisdiction.split('-')[0]),
          violations: [], // Clear violations after migration
        };
      }
      return f;
    });

    return this.evaluate(migratedFlows, assets, policies, frameworks, primaryJurisdiction);
  }
}

// Singleton instance
let engineInstance: SovereigntyEngine | null = null;

export function getSovereigntyEngine(): SovereigntyEngine {
  if (!engineInstance) {
    engineInstance = new SovereigntyEngine();
  }
  return engineInstance;
}

export function resetSovereigntyEngine(): void {
  engineInstance = null;
}
