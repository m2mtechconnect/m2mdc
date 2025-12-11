/**
 * Sovereignty Engine Reference Data
 * Industry-accurate Canadian data sovereignty and compliance data
 * Sources: PIPEDA, Quebec Bill 64, Canadian Cloud Council, Treasury Board of Canada
 */

import type {
  DataAsset,
  SovereigntyDataFlow,
  SovereigntyPolicy,
  ComplianceFrameworkStatus,
  SovereigntyBlueprint,
  SovereigntyAuditEvent,
} from './types';

// ============================================================================
// DATA ASSETS - Canadian Sovereign AI Data Centre
// Based on typical hyperscale AI training infrastructure
// ============================================================================

export const mockDataAssets: DataAsset[] = [
  {
    id: 'asset-dgx-cluster-alpha',
    name: 'DGX H100 Cluster Alpha - LLM Training',
    system: 'NVIDIA DGX SuperPOD',
    classification: 'sovereign',
    primaryJurisdiction: 'CA-QC',
    dataType: 'compute',
    sizeGb: 8000,
    owner: 'ML Engineering',
    createdAt: '2024-01-15T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: 'asset-dgx-cluster-beta',
    name: 'DGX H100 Cluster Beta - Inference',
    system: 'NVIDIA DGX BasePOD',
    classification: 'sovereign',
    primaryJurisdiction: 'CA-QC',
    dataType: 'model',
    sizeGb: 3500,
    owner: 'ML Engineering',
    createdAt: '2024-02-01T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: 'asset-dcim-telemetry',
    name: 'DCIM Telemetry Store',
    system: 'Schneider EcoStruxure',
    classification: 'sensitive',
    primaryJurisdiction: 'CA-QC',
    dataType: 'logs',
    sizeGb: 450,
    owner: 'Facilities Operations',
    createdAt: '2024-01-01T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: 'asset-backup-vault-ca',
    name: 'Canadian Backup Vault (DR)',
    system: 'NetApp StorageGRID',
    classification: 'sovereign',
    primaryJurisdiction: 'CA-ON',
    secondaryJurisdictions: ['CA-QC'],
    dataType: 'backup',
    sizeGb: 15000,
    owner: 'IT Infrastructure',
    createdAt: '2023-12-01T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: 'asset-public-api-cache',
    name: 'Public API Response Cache',
    system: 'CloudFront CA Edge',
    classification: 'public',
    primaryJurisdiction: 'CA-QC',
    secondaryJurisdictions: ['CA-ON'],
    dataType: 'storage',
    sizeGb: 200,
    owner: 'Platform Team',
    createdAt: '2024-03-01T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: 'asset-training-datasets',
    name: 'Sovereign Training Datasets',
    system: 'Weka Data Platform',
    classification: 'sovereign',
    primaryJurisdiction: 'CA-QC',
    dataType: 'dataset',
    sizeGb: 25000,
    owner: 'Data Science',
    createdAt: '2024-01-20T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: 'asset-model-registry',
    name: 'Model Registry - Production',
    system: 'MLflow Enterprise',
    classification: 'sovereign',
    primaryJurisdiction: 'CA-QC',
    dataType: 'model',
    sizeGb: 4500,
    owner: 'ML Engineering',
    createdAt: '2024-02-15T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: 'asset-scada-telemetry',
    name: 'BMS/SCADA Facility Telemetry',
    system: 'Siemens Desigo CC',
    classification: 'sensitive',
    primaryJurisdiction: 'CA-QC',
    dataType: 'logs',
    sizeGb: 150,
    owner: 'Facilities',
    createdAt: '2024-01-01T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
];

// ============================================================================
// DATA FLOWS - Canadian Sovereign Data Movement Patterns
// Based on PIPEDA and Quebec Bill 64 requirements
// ============================================================================

export const mockDataFlows: SovereigntyDataFlow[] = [
  {
    id: 'flow-training-backup',
    name: 'Training Data Backup (QC → ON)',
    sourceAssetId: 'asset-dgx-cluster-alpha',
    targetAssetId: 'asset-backup-vault-ca',
    sourceJurisdiction: 'CA-QC',
    targetJurisdiction: 'CA-ON',
    isCrossBorder: false,  // Inter-provincial, not cross-border
    isRealTime: false,
    volumeGbPerDay: 250,
    flowType: 'backup',
    dataClassification: 'sovereign',
    encrypted: true,
    lastEvaluatedAt: new Date().toISOString(),
    status: 'active',
    violations: [],
  },
  {
    id: 'flow-model-deployment',
    name: 'Model Deployment Pipeline',
    sourceAssetId: 'asset-model-registry',
    targetAssetId: 'asset-dgx-cluster-beta',
    sourceJurisdiction: 'CA-QC',
    targetJurisdiction: 'CA-QC',
    isCrossBorder: false,
    isRealTime: true,
    volumeGbPerDay: 80,
    flowType: 'sync',
    dataClassification: 'sovereign',
    encrypted: true,
    lastEvaluatedAt: new Date().toISOString(),
    status: 'active',
    violations: [],
  },
  {
    id: 'flow-api-cache-sync',
    name: 'API Cache Synchronization',
    sourceAssetId: 'asset-public-api-cache',
    targetAssetId: 'asset-public-api-cache',
    sourceJurisdiction: 'CA-QC',
    targetJurisdiction: 'CA-ON',
    isCrossBorder: false,
    isRealTime: true,
    volumeGbPerDay: 50,
    flowType: 'replication',
    dataClassification: 'public',
    encrypted: true,
    lastEvaluatedAt: new Date().toISOString(),
    status: 'active',
    violations: [],
  },
  {
    id: 'flow-dcim-archive',
    name: 'DCIM Log Archive',
    sourceAssetId: 'asset-dcim-telemetry',
    targetAssetId: 'asset-backup-vault-ca',
    sourceJurisdiction: 'CA-QC',
    targetJurisdiction: 'CA-ON',
    isCrossBorder: false,
    isRealTime: false,
    volumeGbPerDay: 15,
    flowType: 'backup',
    dataClassification: 'sensitive',
    encrypted: true,
    lastEvaluatedAt: new Date().toISOString(),
    status: 'active',
    violations: [],
  },
  {
    id: 'flow-scada-export',
    name: 'BMS Telemetry Export',
    sourceAssetId: 'asset-scada-telemetry',
    targetAssetId: 'asset-dcim-telemetry',
    sourceJurisdiction: 'CA-QC',
    targetJurisdiction: 'CA-QC',
    isCrossBorder: false,
    isRealTime: true,
    volumeGbPerDay: 8,
    flowType: 'export',
    dataClassification: 'sensitive',
    encrypted: true,
    lastEvaluatedAt: new Date().toISOString(),
    status: 'active',
    violations: [],
  },
];

// ============================================================================
// COMPLIANCE FRAMEWORKS - Canadian Data Centre Requirements
// Sources: Treasury Board of Canada, CISA, SOC 2, ISO 27001
// ============================================================================

export const mockComplianceFrameworks: ComplianceFrameworkStatus[] = [
  {
    id: 'SOC2_TYPE_II',
    name: 'SOC 2 Type II',
    description: 'Service Organization Control 2 Type II - Security, Availability, Confidentiality',
    status: 'certified',
    lastAuditDate: '2024-09-15',
    nextAuditDate: '2025-09-15',
    auditReadinessScore: 96,
    certificationExpiry: '2025-09-15',
    auditor: 'Deloitte Canada',
    controls: { total: 120, passed: 118, failed: 0, notApplicable: 2 },
  },
  {
    id: 'ISO_27001',
    name: 'ISO 27001:2022',
    description: 'Information Security Management Systems - International Standard',
    status: 'certified',
    lastAuditDate: '2024-06-20',
    nextAuditDate: '2025-06-20',
    auditReadinessScore: 94,
    certificationExpiry: '2027-06-20',
    auditor: 'BSI Canada',
    controls: { total: 93, passed: 90, failed: 1, notApplicable: 2 },
  },
  {
    id: 'PIPEDA',
    name: 'PIPEDA Compliance',
    description: 'Personal Information Protection and Electronic Documents Act (Federal)',
    status: 'certified',
    lastAuditDate: '2024-08-01',
    nextAuditDate: '2025-08-01',
    auditReadinessScore: 98,
    auditor: 'Internal Audit',
    controls: { total: 45, passed: 45, failed: 0, notApplicable: 0 },
  },
  {
    id: 'QUEBEC_BILL_64',
    name: 'Quebec Bill 64 (Law 25)',
    description: 'Act to modernize legislative provisions respecting the protection of personal information',
    status: 'certified',
    lastAuditDate: '2024-09-22',
    nextAuditDate: '2025-09-22',
    auditReadinessScore: 97,
    auditor: 'Commission d\'accès à l\'information',
    controls: { total: 52, passed: 51, failed: 0, notApplicable: 1 },
  },
  {
    id: 'PROTECTED_B',
    name: 'Protected B (GC)',
    description: 'Government of Canada Protected B security classification for sensitive data',
    status: 'in_progress',
    auditReadinessScore: 88,
    controls: { total: 85, passed: 78, failed: 3, notApplicable: 4 },
  },
  {
    id: 'CSA_STAR',
    name: 'CSA STAR Level 2',
    description: 'Cloud Security Alliance Security, Trust, Assurance, and Risk certification',
    status: 'certified',
    lastAuditDate: '2024-07-10',
    nextAuditDate: '2025-07-10',
    auditReadinessScore: 92,
    certificationExpiry: '2025-07-10',
    auditor: 'A-LIGN',
    controls: { total: 197, passed: 189, failed: 2, notApplicable: 6 },
  },
];

// ============================================================================
// SOVEREIGNTY POLICIES - Canadian Data Residency Requirements
// Based on PIPEDA, Quebec Bill 64, Treasury Board directives
// ============================================================================

export const mockSovereigntyPolicies: SovereigntyPolicy[] = [
  {
    id: 'policy-sovereign-residency',
    name: 'Canadian Sovereign Data Residency',
    description: 'All sovereign-classified data must remain within Canadian jurisdiction per PIPEDA and Quebec Bill 64',
    enabled: true,
    allowedJurisdictions: ['CA-QC', 'CA-ON', 'CA-AB', 'CA-BC', 'CA'],
    blockedJurisdictions: ['US', 'EU', 'APAC'],
    allowedCrossBorderPairs: [
      { from: 'CA-QC', to: 'CA-ON', requiresApproval: false, dpaRequired: false },
      { from: 'CA-QC', to: 'CA-AB', requiresApproval: false, dpaRequired: false },
      { from: 'CA-ON', to: 'CA-QC', requiresApproval: false, dpaRequired: false },
      { from: 'CA-BC', to: 'CA-QC', requiresApproval: false, dpaRequired: false },
    ],
    restrictedClassifications: ['sovereign'],
    requireEncryption: true,
    maxCrossBorderVolumeGbPerDay: 2000,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'policy-public-data',
    name: 'Public Data Distribution Policy',
    description: 'Public data may be cached in Canadian edge locations only (no US/EU replication)',
    enabled: true,
    allowedJurisdictions: ['CA-QC', 'CA-ON', 'CA-BC', 'CA-AB'],
    blockedJurisdictions: [],
    allowedCrossBorderPairs: [
      { from: 'CA-QC', to: 'CA-ON', requiresApproval: false, dpaRequired: false },
      { from: 'CA-QC', to: 'CA-BC', requiresApproval: false, dpaRequired: false },
    ],
    restrictedClassifications: [],
    requireEncryption: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'policy-sensitive-restricted',
    name: 'Sensitive Data Transfer Controls',
    description: 'Sensitive data requires Privacy Officer approval for any inter-provincial transfer',
    enabled: true,
    allowedJurisdictions: ['CA-QC', 'CA-ON', 'CA-AB', 'CA-BC'],
    blockedJurisdictions: ['US', 'EU', 'APAC'],
    allowedCrossBorderPairs: [
      { from: 'CA-QC', to: 'CA-ON', requiresApproval: true, dpaRequired: false },
      { from: 'CA-QC', to: 'CA-BC', requiresApproval: true, dpaRequired: false },
    ],
    restrictedClassifications: ['sensitive'],
    requireEncryption: true,
    maxCrossBorderVolumeGbPerDay: 500,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
];

// ============================================================================
// AUDIT EVENTS - Sovereignty Monitoring Events
// ============================================================================

export const mockAuditEvents: SovereigntyAuditEvent[] = [
  {
    id: 'audit-sovereignty-001',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    eventType: 'SOVEREIGNTY_CHECK',
    severity: 'info',
    description: 'Hourly sovereignty scan completed - all assets within Canadian jurisdiction',
    details: { assetsChecked: 8, flowsChecked: 5, violations: 0, duration_ms: 1245 },
    source: 'Sovereignty Sentinel Agent',
  },
  {
    id: 'audit-crossborder-block',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    eventType: 'CROSS_BORDER_DENIED',
    severity: 'warning',
    description: 'Blocked attempted model export to US-East-1 (Virginia) - violates sovereign data policy',
    details: { 
      sourceJurisdiction: 'CA-QC', 
      targetJurisdiction: 'US-EAST', 
      dataVolume: '85GB',
      blockReason: 'PIPEDA Section 7 - sovereign data cannot leave Canadian jurisdiction'
    },
    source: 'Sovereignty Sentinel Agent',
    flowId: 'flow-blocked-us-export',
  },
  {
    id: 'audit-soc2-complete',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    eventType: 'FRAMEWORK_AUDIT',
    severity: 'info',
    description: 'SOC 2 Type II annual audit completed by Deloitte Canada - certification renewed',
    details: { framework: 'SOC2_TYPE_II', score: 96, controlsPassed: 118, auditor: 'Deloitte Canada' },
    source: 'Compliance System',
  },
  {
    id: 'audit-bill64-update',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    eventType: 'POLICY_UPDATED',
    severity: 'info',
    description: 'Quebec Bill 64 (Law 25) compliance policy updated for September 2024 requirements',
    details: { 
      policyId: 'policy-sovereign-residency', 
      changes: 'Added consent management controls per Law 25 Section 12'
    },
    source: 'Privacy Officer',
  },
  {
    id: 'audit-encryption-fix',
    timestamp: new Date(Date.now() - 259200000).toISOString(),
    eventType: 'VIOLATION_RESOLVED',
    severity: 'info',
    description: 'TLS 1.3 encryption enabled for DCIM telemetry archive flow',
    details: { 
      flowId: 'flow-dcim-archive', 
      resolution: 'Upgraded from TLS 1.2 to TLS 1.3 with AES-256-GCM'
    },
    source: 'Security Team',
    violationId: 'viol-encryption-001',
  },
];

// ============================================================================
// COMPLETE SOVEREIGNTY BLUEPRINT
// Represents full sovereignty configuration for a Canadian AI Data Centre
// ============================================================================

export const mockSovereigntyBlueprint: SovereigntyBlueprint = {
  primaryJurisdiction: 'CA-QC',
  legalEntity: 'Sovereign AI DataCentre Québec Inc.',
  dataAssets: mockDataAssets,
  dataFlows: mockDataFlows,
  policies: mockSovereigntyPolicies,
  frameworks: mockComplianceFrameworks,
  settings: {
    sovereignDataMustNotLeave: true,
    crossBorderRequiresApproval: true,
    autoBlockViolations: true,
    auditRetentionDays: 730, // 2 years per PIPEDA requirements
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get human-readable jurisdiction name
 * Includes Canadian provinces and international regions
 */
export function getJurisdictionDisplayName(code: string): string {
  const names: Record<string, string> = {
    // Canada
    'CA': 'Canada',
    'CA-QC': 'Québec, Canada',
    'CA-ON': 'Ontario, Canada',
    'CA-AB': 'Alberta, Canada',
    'CA-BC': 'British Columbia, Canada',
    'CA-MB': 'Manitoba, Canada',
    'CA-SK': 'Saskatchewan, Canada',
    'CA-NS': 'Nova Scotia, Canada',
    'CA-NB': 'New Brunswick, Canada',
    // United States
    'US': 'United States',
    'US-EAST': 'US East (Virginia)',
    'US-WEST': 'US West (Oregon)',
    'US-GOVCLOUD': 'AWS GovCloud (US)',
    // Europe
    'EU': 'European Union',
    'EU-DE': 'Germany (EU)',
    'EU-FR': 'France (EU)',
    'EU-NL': 'Netherlands (EU)',
    'EU-IE': 'Ireland (EU)',
    'UK': 'United Kingdom',
    // Asia-Pacific
    'APAC': 'Asia-Pacific',
    'APAC-SG': 'Singapore',
    'APAC-JP': 'Japan',
    'APAC-AU': 'Australia',
  };
  return names[code] || code;
}

/**
 * Get semantic color class for data classification
 * Uses design system tokens
 */
export function getClassificationColor(classification: string): string {
  switch (classification) {
    case 'sovereign': return 'text-primary';      // Blue - highest protection
    case 'sensitive': return 'text-warning';      // Amber - elevated protection
    case 'public': return 'text-success';         // Green - standard protection
    default: return 'text-muted-foreground';
  }
}

/**
 * Get semantic color class for severity levels
 * Uses design system tokens
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-destructive';
    case 'high': return 'text-destructive';
    case 'medium': return 'text-warning';
    case 'low': return 'text-info';
    case 'info': return 'text-muted-foreground';
    default: return 'text-muted-foreground';
  }
}
