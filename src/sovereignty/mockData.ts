/**
 * Mock Data for Sovereignty Engine
 * Provides realistic test data for the sovereignty module
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
// DATA ASSETS
// ============================================================================

export const mockDataAssets: DataAsset[] = [
  {
    id: 'asset-gpu-cluster-alpha',
    name: 'GPU Cluster Alpha - Training Data',
    system: 'GPU Cluster Alpha',
    classification: 'sovereign',
    primaryJurisdiction: 'CA-QC',
    dataType: 'compute',
    sizeGb: 5000,
    owner: 'ML Engineering',
    createdAt: '2024-01-15T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: 'asset-gpu-cluster-beta',
    name: 'GPU Cluster Beta - Inference Models',
    system: 'GPU Cluster Beta',
    classification: 'sovereign',
    primaryJurisdiction: 'CA-QC',
    dataType: 'model',
    sizeGb: 2500,
    owner: 'ML Engineering',
    createdAt: '2024-02-01T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: 'asset-logs-primary',
    name: 'Primary Logs Storage',
    system: 'Logs Bucket Primary',
    classification: 'sensitive',
    primaryJurisdiction: 'CA-QC',
    dataType: 'logs',
    sizeGb: 1200,
    owner: 'Operations',
    createdAt: '2024-01-01T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: 'asset-backup-vault',
    name: 'Backup Vault - Critical Data',
    system: 'Backup Vault',
    classification: 'sovereign',
    primaryJurisdiction: 'CA-ON',
    secondaryJurisdictions: ['CA-QC'],
    dataType: 'backup',
    sizeGb: 8000,
    owner: 'IT Infrastructure',
    createdAt: '2023-12-01T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: 'asset-public-cdn',
    name: 'Public CDN Assets',
    system: 'CDN Edge',
    classification: 'public',
    primaryJurisdiction: 'CA-QC',
    secondaryJurisdictions: ['US', 'EU'],
    dataType: 'storage',
    sizeGb: 500,
    owner: 'Web Team',
    createdAt: '2024-03-01T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: 'asset-customer-datasets',
    name: 'Customer Training Datasets',
    system: 'Data Lake',
    classification: 'sensitive',
    primaryJurisdiction: 'CA-QC',
    dataType: 'dataset',
    sizeGb: 15000,
    owner: 'Data Science',
    createdAt: '2024-01-20T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: 'asset-model-registry',
    name: 'Model Registry - Production',
    system: 'ML Platform',
    classification: 'sovereign',
    primaryJurisdiction: 'CA-QC',
    dataType: 'model',
    sizeGb: 3000,
    owner: 'ML Engineering',
    createdAt: '2024-02-15T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: 'asset-telemetry',
    name: 'Facility Telemetry',
    system: 'SCADA',
    classification: 'sensitive',
    primaryJurisdiction: 'CA-QC',
    dataType: 'logs',
    sizeGb: 200,
    owner: 'Facilities',
    createdAt: '2024-01-01T00:00:00Z',
    lastAccessedAt: new Date().toISOString(),
  },
];

// ============================================================================
// DATA FLOWS
// ============================================================================

export const mockDataFlows: SovereigntyDataFlow[] = [
  {
    id: 'flow-training-sync',
    name: 'Training Data Sync',
    sourceAssetId: 'asset-gpu-cluster-alpha',
    targetAssetId: 'asset-backup-vault',
    sourceJurisdiction: 'CA-QC',
    targetJurisdiction: 'CA-ON',
    isCrossBorder: false,
    isRealTime: false,
    volumeGbPerDay: 100,
    flowType: 'backup',
    dataClassification: 'sovereign',
    encrypted: true,
    lastEvaluatedAt: new Date().toISOString(),
    status: 'active',
    violations: [],
  },
  {
    id: 'flow-model-deploy',
    name: 'Model Deployment Pipeline',
    sourceAssetId: 'asset-model-registry',
    targetAssetId: 'asset-gpu-cluster-beta',
    sourceJurisdiction: 'CA-QC',
    targetJurisdiction: 'CA-QC',
    isCrossBorder: false,
    isRealTime: true,
    volumeGbPerDay: 50,
    flowType: 'sync',
    dataClassification: 'sovereign',
    encrypted: true,
    lastEvaluatedAt: new Date().toISOString(),
    status: 'active',
    violations: [],
  },
  {
    id: 'flow-cdn-dist',
    name: 'CDN Content Distribution',
    sourceAssetId: 'asset-public-cdn',
    targetAssetId: 'asset-public-cdn',
    sourceJurisdiction: 'CA-QC',
    targetJurisdiction: 'US',
    isCrossBorder: true,
    isRealTime: true,
    volumeGbPerDay: 200,
    flowType: 'replication',
    dataClassification: 'public',
    encrypted: true,
    lastEvaluatedAt: new Date().toISOString(),
    status: 'active',
    violations: [],
  },
  {
    id: 'flow-log-archive',
    name: 'Log Archive Pipeline',
    sourceAssetId: 'asset-logs-primary',
    targetAssetId: 'asset-backup-vault',
    sourceJurisdiction: 'CA-QC',
    targetJurisdiction: 'CA-ON',
    isCrossBorder: false,
    isRealTime: false,
    volumeGbPerDay: 25,
    flowType: 'backup',
    dataClassification: 'sensitive',
    encrypted: true,
    lastEvaluatedAt: new Date().toISOString(),
    status: 'active',
    violations: [],
  },
  {
    id: 'flow-telemetry-export',
    name: 'Telemetry Export',
    sourceAssetId: 'asset-telemetry',
    targetAssetId: 'asset-logs-primary',
    sourceJurisdiction: 'CA-QC',
    targetJurisdiction: 'CA-QC',
    isCrossBorder: false,
    isRealTime: true,
    volumeGbPerDay: 10,
    flowType: 'export',
    dataClassification: 'sensitive',
    encrypted: true,
    lastEvaluatedAt: new Date().toISOString(),
    status: 'active',
    violations: [],
  },
];

// ============================================================================
// COMPLIANCE FRAMEWORKS
// ============================================================================

export const mockComplianceFrameworks: ComplianceFrameworkStatus[] = [
  {
    id: 'SOC2_TYPE_II',
    name: 'SOC 2 Type II',
    description: 'Service Organization Control 2 Type II certification for security, availability, and confidentiality',
    status: 'certified',
    lastAuditDate: '2024-09-15',
    nextAuditDate: '2025-09-15',
    auditReadinessScore: 96,
    certificationExpiry: '2025-09-15',
    auditor: 'Deloitte',
    controls: { total: 120, passed: 118, failed: 0, notApplicable: 2 },
  },
  {
    id: 'ISO_27001',
    name: 'ISO 27001',
    description: 'International standard for information security management systems',
    status: 'certified',
    lastAuditDate: '2024-06-20',
    nextAuditDate: '2025-06-20',
    auditReadinessScore: 94,
    certificationExpiry: '2027-06-20',
    auditor: 'BSI',
    controls: { total: 114, passed: 110, failed: 1, notApplicable: 3 },
  },
  {
    id: 'PIPEDA',
    name: 'PIPEDA',
    description: 'Personal Information Protection and Electronic Documents Act compliance',
    status: 'certified',
    lastAuditDate: '2024-08-01',
    nextAuditDate: '2025-08-01',
    auditReadinessScore: 98,
    auditor: 'Internal',
    controls: { total: 45, passed: 45, failed: 0, notApplicable: 0 },
  },
  {
    id: 'GDPR_ADEQUATE',
    name: 'GDPR Adequacy',
    description: 'European Union General Data Protection Regulation adequacy determination',
    status: 'in_progress',
    auditReadinessScore: 82,
    controls: { total: 99, passed: 85, failed: 5, notApplicable: 9 },
  },
  {
    id: 'HIPAA',
    name: 'HIPAA',
    description: 'Health Insurance Portability and Accountability Act',
    status: 'not_applicable',
    auditReadinessScore: 0,
    controls: { total: 0, passed: 0, failed: 0, notApplicable: 0 },
  },
];

// ============================================================================
// SOVEREIGNTY POLICIES
// ============================================================================

export const mockSovereigntyPolicies: SovereigntyPolicy[] = [
  {
    id: 'policy-canadian-residency',
    name: 'Canadian Data Residency',
    description: 'All sovereign and sensitive data must remain within Canadian jurisdiction',
    enabled: true,
    allowedJurisdictions: ['CA-QC', 'CA-ON', 'CA-AB', 'CA-BC', 'CA'],
    blockedJurisdictions: [],
    allowedCrossBorderPairs: [
      { from: 'CA-QC', to: 'CA-ON', requiresApproval: false, dpaRequired: false },
      { from: 'CA-QC', to: 'CA-AB', requiresApproval: false, dpaRequired: false },
      { from: 'CA-ON', to: 'CA-QC', requiresApproval: false, dpaRequired: false },
    ],
    restrictedClassifications: ['sovereign'],
    requireEncryption: true,
    maxCrossBorderVolumeGbPerDay: 1000,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'policy-public-data',
    name: 'Public Data Policy',
    description: 'Public data may be distributed globally with encryption',
    enabled: true,
    allowedJurisdictions: ['CA-QC', 'CA-ON', 'US', 'EU', 'UK', 'APAC'],
    blockedJurisdictions: [],
    allowedCrossBorderPairs: [
      { from: 'CA-QC', to: 'US', requiresApproval: false, dpaRequired: false },
      { from: 'CA-QC', to: 'EU', requiresApproval: false, dpaRequired: true },
      { from: 'CA-QC', to: 'UK', requiresApproval: false, dpaRequired: true },
    ],
    restrictedClassifications: [],
    requireEncryption: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'policy-sensitive-restricted',
    name: 'Sensitive Data Restrictions',
    description: 'Sensitive data requires approval for any cross-border transfer',
    enabled: true,
    allowedJurisdictions: ['CA-QC', 'CA-ON', 'CA-AB', 'CA-BC'],
    blockedJurisdictions: ['APAC'],
    allowedCrossBorderPairs: [
      { from: 'CA-QC', to: 'CA-ON', requiresApproval: false, dpaRequired: false },
      { from: 'CA-QC', to: 'US', requiresApproval: true, dpaRequired: true },
      { from: 'CA-QC', to: 'EU', requiresApproval: true, dpaRequired: true },
    ],
    restrictedClassifications: ['sensitive'],
    requireEncryption: true,
    maxCrossBorderVolumeGbPerDay: 500,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
];

// ============================================================================
// AUDIT EVENTS
// ============================================================================

export const mockAuditEvents: SovereigntyAuditEvent[] = [
  {
    id: 'audit-1',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    eventType: 'SOVEREIGNTY_CHECK',
    severity: 'info',
    description: 'All workload data confirmed within Canadian jurisdiction',
    details: { assetsChecked: 8, flowsChecked: 5, violations: 0 },
    source: 'Sovereignty Sentinel',
  },
  {
    id: 'audit-2',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    eventType: 'CROSS_BORDER_DENIED',
    severity: 'warning',
    description: 'Attempted data transfer to non-sovereign region blocked',
    details: { sourceJurisdiction: 'CA-QC', targetJurisdiction: 'US-EAST', dataVolume: '50GB' },
    source: 'Sovereignty Sentinel',
    flowId: 'flow-blocked-attempt',
  },
  {
    id: 'audit-3',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    eventType: 'FRAMEWORK_AUDIT',
    severity: 'info',
    description: 'SOC 2 Type II annual audit completed successfully',
    details: { framework: 'SOC2_TYPE_II', score: 96, controlsPassed: 118 },
    source: 'Compliance System',
  },
  {
    id: 'audit-4',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    eventType: 'POLICY_UPDATED',
    severity: 'info',
    description: 'Canadian Data Residency policy updated',
    details: { policyId: 'policy-canadian-residency', changes: 'Added CA-AB to allowed jurisdictions' },
    source: 'Policy Manager',
  },
  {
    id: 'audit-5',
    timestamp: new Date(Date.now() - 259200000).toISOString(),
    eventType: 'VIOLATION_RESOLVED',
    severity: 'info',
    description: 'Encryption violation resolved for Log Archive Pipeline',
    details: { flowId: 'flow-log-archive', resolution: 'TLS 1.3 encryption enabled' },
    source: 'Security Team',
    violationId: 'viol-resolved-1',
  },
];

// ============================================================================
// COMPLETE SOVEREIGNTY BLUEPRINT
// ============================================================================

export const mockSovereigntyBlueprint: SovereigntyBlueprint = {
  primaryJurisdiction: 'CA-QC',
  legalEntity: 'DataCentre Québec Inc.',
  dataAssets: mockDataAssets,
  dataFlows: mockDataFlows,
  policies: mockSovereigntyPolicies,
  frameworks: mockComplianceFrameworks,
  settings: {
    sovereignDataMustNotLeave: true,
    crossBorderRequiresApproval: true,
    autoBlockViolations: true,
    auditRetentionDays: 365,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getJurisdictionDisplayName(code: string): string {
  const names: Record<string, string> = {
    'CA': 'Canada',
    'CA-QC': 'Québec, Canada',
    'CA-ON': 'Ontario, Canada',
    'CA-AB': 'Alberta, Canada',
    'CA-BC': 'British Columbia, Canada',
    'US': 'United States',
    'US-EAST': 'US East',
    'US-WEST': 'US West',
    'EU': 'European Union',
    'EU-DE': 'Germany (EU)',
    'EU-FR': 'France (EU)',
    'EU-NL': 'Netherlands (EU)',
    'UK': 'United Kingdom',
    'APAC': 'Asia-Pacific',
    'APAC-SG': 'Singapore',
    'APAC-JP': 'Japan',
  };
  return names[code] || code;
}

export function getClassificationColor(classification: string): string {
  switch (classification) {
    case 'sovereign': return 'text-blue-600';
    case 'sensitive': return 'text-amber-600';
    case 'public': return 'text-green-600';
    default: return 'text-muted-foreground';
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-destructive';
    case 'high': return 'text-orange-600';
    case 'medium': return 'text-amber-600';
    case 'low': return 'text-blue-600';
    default: return 'text-muted-foreground';
  }
}
