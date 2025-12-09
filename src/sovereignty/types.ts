/**
 * Sovereignty & Compliance Engine - Type Definitions
 * Extends the Data Centre Blueprint with comprehensive sovereignty concepts
 */

// ============================================================================
// JURISDICTION & CLASSIFICATION
// ============================================================================

export type JurisdictionCode = 
  | 'CA' | 'CA-QC' | 'CA-ON' | 'CA-AB' | 'CA-BC' 
  | 'US' | 'US-EAST' | 'US-WEST' 
  | 'EU' | 'EU-DE' | 'EU-FR' | 'EU-NL'
  | 'UK' 
  | 'APAC' | 'APAC-SG' | 'APAC-JP'
  | string;

export type DataClassification = 'sovereign' | 'sensitive' | 'public';

export type ComplianceFrameworkId =
  | 'SOC2_TYPE_II'
  | 'ISO_27001'
  | 'PIPEDA'
  | 'GDPR_ADEQUATE'
  | 'HIPAA'
  | 'PCI_DSS'
  | 'FedRAMP'
  | string;

// ============================================================================
// DATA ASSETS
// ============================================================================

export interface DataAsset {
  id: string;
  name: string;
  system: string; // e.g. "GPU Cluster Alpha", "Logs Bucket X"
  classification: DataClassification;
  primaryJurisdiction: JurisdictionCode;
  secondaryJurisdictions?: JurisdictionCode[];
  dataType: 'compute' | 'storage' | 'logs' | 'backup' | 'model' | 'dataset';
  sizeGb: number;
  owner: string;
  createdAt: string;
  lastAccessedAt: string;
}

// ============================================================================
// DATA FLOWS
// ============================================================================

export interface SovereigntyViolation {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reasonCode:
    | 'UNAPPROVED_CROSS_BORDER'
    | 'UNAPPROVED_CLOUD_REGION'
    | 'MISSING_DPA'
    | 'UNCLASSIFIED_ASSET'
    | 'POLICY_MISMATCH'
    | 'SOVEREIGN_DATA_LEAKAGE'
    | 'ENCRYPTION_MISSING';
  description: string;
  flowId?: string;
  assetId?: string;
  jurisdiction: JurisdictionCode;
  targetJurisdiction?: JurisdictionCode;
  detectedAt: string;
  resolvedAt?: string;
  policyViolated?: string;
  recommendedMitigation?: string;
}

export interface SovereigntyDataFlow {
  id: string;
  name: string;
  sourceAssetId: string;
  targetAssetId: string;
  sourceJurisdiction: JurisdictionCode;
  targetJurisdiction: JurisdictionCode;
  isCrossBorder: boolean;
  isRealTime: boolean;
  volumeGbPerDay: number;
  flowType: 'replication' | 'backup' | 'sync' | 'export' | 'import' | 'processing';
  dataClassification: DataClassification;
  encrypted: boolean;
  lastEvaluatedAt: string;
  status: 'active' | 'paused' | 'blocked';
  violations: SovereigntyViolation[];
}

// ============================================================================
// COMPLIANCE FRAMEWORKS
// ============================================================================

export interface ComplianceFrameworkStatus {
  id: ComplianceFrameworkId;
  name: string;
  description: string;
  status: 'certified' | 'in_progress' | 'not_applicable' | 'expired';
  lastAuditDate?: string;
  nextAuditDate?: string;
  auditReadinessScore: number; // 0–100
  certificationExpiry?: string;
  auditor?: string;
  controls: {
    total: number;
    passed: number;
    failed: number;
    notApplicable: number;
  };
}

// ============================================================================
// SOVEREIGNTY POLICIES
// ============================================================================

export interface CrossBorderPair {
  from: JurisdictionCode;
  to: JurisdictionCode;
  requiresApproval: boolean;
  dpaRequired: boolean;
}

export interface SovereigntyPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  allowedJurisdictions: JurisdictionCode[];
  blockedJurisdictions: JurisdictionCode[];
  allowedCrossBorderPairs: CrossBorderPair[];
  restrictedClassifications?: DataClassification[];
  requireEncryption: boolean;
  maxCrossBorderVolumeGbPerDay?: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SOVEREIGNTY BLUEPRINT EXTENSION
// ============================================================================

export interface SovereigntyBlueprint {
  primaryJurisdiction: JurisdictionCode;
  legalEntity: string;
  dataAssets: DataAsset[];
  dataFlows: SovereigntyDataFlow[];
  policies: SovereigntyPolicy[];
  frameworks: ComplianceFrameworkStatus[];
  settings: {
    sovereignDataMustNotLeave: boolean;
    crossBorderRequiresApproval: boolean;
    autoBlockViolations: boolean;
    auditRetentionDays: number;
  };
}

// ============================================================================
// ENGINE RESULTS
// ============================================================================

export interface SovereigntyEngineResult {
  sovereigntyScore: number; // 0–100
  violations: SovereigntyViolation[];
  crossBorderFlowCount: number;
  monitoredFlowCount: number;
  blockedFlowCount: number;
  dataClassificationDistribution: Record<DataClassification, number>; // percentages
  auditReadinessScore: number;
  jurisdictionBreakdown: Record<JurisdictionCode, number>; // asset counts
  frameworkSummary: {
    certified: number;
    inProgress: number;
    expired: number;
    notApplicable: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastEvaluatedAt: string;
}

// ============================================================================
// AUDIT EVENTS
// ============================================================================

export interface SovereigntyAuditEvent {
  id: string;
  timestamp: string;
  eventType: 
    | 'VIOLATION_DETECTED'
    | 'VIOLATION_RESOLVED'
    | 'FLOW_BLOCKED'
    | 'POLICY_UPDATED'
    | 'FRAMEWORK_AUDIT'
    | 'SOVEREIGNTY_CHECK'
    | 'CROSS_BORDER_APPROVED'
    | 'CROSS_BORDER_DENIED';
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  details: Record<string, any>;
  source: string; // system/agent that generated event
  flowId?: string;
  assetId?: string;
  violationId?: string;
}
