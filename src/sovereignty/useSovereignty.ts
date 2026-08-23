/**
 * useSovereignty - React hook for sovereignty engine
 */

import { useState, useMemo, useCallback } from 'react';
import { getSovereigntyEngine } from './SovereigntyEngine';
import {
  mockDataAssets,
  mockDataFlows,
  mockSovereigntyPolicies,
  mockComplianceFrameworks,
  mockAuditEvents,
} from './mockData';
import type {
  SovereigntyEngineResult,
  SovereigntyAuditEvent,
  JurisdictionCode,
} from './types';

interface UseSovereigntyOptions {
  twinId?: string;
  primaryJurisdiction?: JurisdictionCode;
}

interface UseSovereigntyReturn {
  // Engine results
  result: SovereigntyEngineResult;
  
  // Blueprint data
  assets: typeof mockDataAssets;
  flows: typeof mockDataFlows;
  policies: typeof mockSovereigntyPolicies;
  frameworks: typeof mockComplianceFrameworks;
  auditEvents: SovereigntyAuditEvent[];
  
  // Derived values
  sovereigntyScore: number;
  violationCount: number;
  crossBorderFlows: number;
  certifiedFrameworks: number;
  auditReadinessScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Simulation actions
  simulateViolation: (type: 'cross_border' | 'region_block' | 'sovereign_leakage') => void;
  simulatePolicyTightening: (blockedJurisdictions: JurisdictionCode[]) => void;
  simulateRegionMigration: (targetJurisdiction: JurisdictionCode) => void;
  resetSimulation: () => void;
  
  // State
  isSimulating: boolean;
  simulationDelta: {
    scoreDelta: number;
    violationDelta: number;
    flowDelta: number;
  } | null;
}

export function useSovereignty(options: UseSovereigntyOptions = {}): UseSovereigntyReturn {
  const { primaryJurisdiction = 'CA-QC' } = options;
  
  const engine = getSovereigntyEngine();
  
  // Base evaluation result
  const baseResult = useMemo(() => {
    return engine.evaluate(
      mockDataFlows,
      mockDataAssets,
      mockSovereigntyPolicies,
      mockComplianceFrameworks,
      primaryJurisdiction
    );
  }, [engine, primaryJurisdiction]);
  
  // Simulation state
  const [simulatedResult, setSimulatedResult] = useState<SovereigntyEngineResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Current result (simulated or base)
  const result = simulatedResult || baseResult;
  
  // Simulation delta
  const simulationDelta = useMemo(() => {
    if (!simulatedResult) return null;
    return {
      scoreDelta: simulatedResult.sovereigntyScore - baseResult.sovereigntyScore,
      violationDelta: simulatedResult.violations.length - baseResult.violations.length,
      flowDelta: simulatedResult.crossBorderFlowCount - baseResult.crossBorderFlowCount,
    };
  }, [simulatedResult, baseResult]);
  
  // Simulate violation
  const simulateViolation = useCallback((type: 'cross_border' | 'region_block' | 'sovereign_leakage') => {
    setIsSimulating(true);
    const newResult = engine.simulateViolation(result, type);
    setSimulatedResult(newResult);
  }, [engine, result]);
  
  // Simulate policy tightening
  const simulatePolicyTightening = useCallback((blockedJurisdictions: JurisdictionCode[]) => {
    setIsSimulating(true);
    const newResult = engine.simulatePolicyTightening(
      mockDataFlows,
      mockDataAssets,
      mockSovereigntyPolicies,
      mockComplianceFrameworks,
      primaryJurisdiction,
      blockedJurisdictions
    );
    setSimulatedResult(newResult);
  }, [engine, primaryJurisdiction]);
  
  // Simulate region migration
  const simulateRegionMigration = useCallback((targetJurisdiction: JurisdictionCode) => {
    setIsSimulating(true);
    const newResult = engine.simulateRegionMigration(
      mockDataFlows,
      mockDataAssets,
      mockSovereigntyPolicies,
      mockComplianceFrameworks,
      primaryJurisdiction,
      targetJurisdiction
    );
    setSimulatedResult(newResult);
  }, [engine, primaryJurisdiction]);
  
  // Reset simulation
  const resetSimulation = useCallback(() => {
    setSimulatedResult(null);
    setIsSimulating(false);
  }, []);
  
  return {
    result,
    assets: mockDataAssets,
    flows: mockDataFlows,
    policies: mockSovereigntyPolicies,
    frameworks: mockComplianceFrameworks,
    auditEvents: mockAuditEvents,
    sovereigntyScore: result.sovereigntyScore,
    violationCount: result.violations.length,
    crossBorderFlows: result.crossBorderFlowCount,
    certifiedFrameworks: result.frameworkSummary.certified,
    auditReadinessScore: result.auditReadinessScore,
    riskLevel: result.riskLevel,
    simulateViolation,
    simulatePolicyTightening,
    simulateRegionMigration,
    resetSimulation,
    isSimulating,
    simulationDelta,
  };
}
