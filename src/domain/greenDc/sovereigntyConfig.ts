/**
 * Sovereignty Rules Configuration
 * Region + Industry specific compliance requirements
 * Used by: Sovereignty & Safety Audit page
 */

import { KPIKey } from './kpiCatalog';

export interface SovereigntyRule {
  id: string;
  label: string;
  description: string;
  appliesToRegions: string[]; // e.g. ['CA-*', 'US-*'], '*' for all
  appliesToIndustries: string[]; // e.g. ['finance', 'healthcare'], '*' for all
  kpiKey?: KPIKey; // Associated KPI for scoring
  checklistItems: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  documentationUrl?: string;
}

// Master sovereignty rules catalog
export const SOVEREIGNTY_RULES: SovereigntyRule[] = [
  // Canadian Rules
  {
    id: 'pipeda',
    label: 'PIPEDA / Canadian Privacy',
    description: 'Personal Information Protection and Electronic Documents Act compliance',
    appliesToRegions: ['CA-*'],
    appliesToIndustries: ['*'],
    kpiKey: KPIKey.PIPEDA_COMPLIANT,
    checklistItems: [
      'Primary data stored in Canada',
      'Backups stored in Canada',
      'Cross-border transfers documented',
      'Consent mechanisms in place',
      'Privacy impact assessment completed',
    ],
    severity: 'high',
    documentationUrl: 'https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/',
  },
  {
    id: 'osfi-b10',
    label: 'OSFI B-10 Readiness',
    description: 'Third-party risk management for Canadian financial institutions',
    appliesToRegions: ['CA-*'],
    appliesToIndustries: ['finance_core_banking_green_twin'],
    kpiKey: KPIKey.OSFI_B10_READY,
    checklistItems: [
      'Third-party risk documented',
      'Exit strategy defined',
      'Business continuity tested',
      'Subcontracting controls in place',
      'Board oversight documented',
    ],
    severity: 'critical',
    documentationUrl: 'https://www.osfi-bsif.gc.ca/Eng/fi-if/rg-ro/gdn-ort/gl-ld/Pages/b10.aspx',
  },
  {
    id: 'protected-b',
    label: 'Protected B Classification',
    description: 'Government of Canada Protected B data handling requirements',
    appliesToRegions: ['CA-*'],
    appliesToIndustries: ['gov_sovereign_cloud_twin'],
    kpiKey: KPIKey.SOVEREIGN_COMPLIANCE,
    checklistItems: [
      'Data classified as Protected B',
      'Physical security controls verified',
      'Personnel security clearances valid',
      'Encryption at rest and in transit',
      'Audit logging enabled',
      'Incident response plan tested',
    ],
    severity: 'critical',
    documentationUrl: 'https://www.canada.ca/en/government/system/digital-government/digital-government-innovations/cloud-services/government-canada-cloud-adoption-strategy.html',
  },
  {
    id: 'quebec-law-25',
    label: 'Quebec Law 25',
    description: 'Quebec private sector privacy modernization',
    appliesToRegions: ['CA-QC'],
    appliesToIndustries: ['*'],
    kpiKey: KPIKey.DATA_RESIDENCY,
    checklistItems: [
      'Privacy officer designated',
      'Privacy impact assessments conducted',
      'Consent mechanisms updated',
      'Breach notification procedures in place',
      'Data inventory maintained',
    ],
    severity: 'high',
    documentationUrl: 'https://www.cai.gouv.qc.ca/documents/CAI_Loi25_guide.pdf',
  },

  // US Rules
  {
    id: 'hipaa',
    label: 'HIPAA / PHI Handling',
    description: 'Health Insurance Portability and Accountability Act compliance',
    appliesToRegions: ['US-*'],
    appliesToIndustries: ['healthcare_phi_twin'],
    kpiKey: KPIKey.HIPAA_COVERED,
    checklistItems: [
      'BAA (Business Associate Agreement) in place',
      'PHI audit logs retained ≥ 6 years',
      'Access controls implemented',
      'Encryption standards met',
      'Security risk assessment completed',
      'Breach notification procedures documented',
    ],
    severity: 'critical',
    documentationUrl: 'https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html',
  },
  {
    id: 'fedramp',
    label: 'FedRAMP Authorization',
    description: 'Federal Risk and Authorization Management Program',
    appliesToRegions: ['US-*'],
    appliesToIndustries: ['gov_sovereign_cloud_twin'],
    kpiKey: KPIKey.COMPLIANCE_SCORE,
    checklistItems: [
      'FedRAMP authorization level determined',
      'Security controls implemented',
      'Continuous monitoring in place',
      'POA&M maintained',
      'Annual assessment scheduled',
    ],
    severity: 'critical',
    documentationUrl: 'https://www.fedramp.gov/',
  },
  {
    id: 'sox',
    label: 'SOX Compliance',
    description: 'Sarbanes-Oxley Act financial controls',
    appliesToRegions: ['US-*'],
    appliesToIndustries: ['finance_core_banking_green_twin'],
    kpiKey: KPIKey.COMPLIANCE_SCORE,
    checklistItems: [
      'Internal controls documented',
      'Audit trail maintained',
      'Access controls verified',
      'Change management in place',
      'Financial reporting integrity verified',
    ],
    severity: 'high',
    documentationUrl: 'https://www.sec.gov/spotlight/sarbanes-oxley.htm',
  },

  // EU Rules
  {
    id: 'gdpr',
    label: 'GDPR Compliance',
    description: 'General Data Protection Regulation',
    appliesToRegions: ['EU-*'],
    appliesToIndustries: ['*'],
    kpiKey: KPIKey.DATA_RESIDENCY,
    checklistItems: [
      'DPO (Data Protection Officer) designated',
      'DPIA (Data Protection Impact Assessment) completed',
      'Lawful basis for processing documented',
      'Data subject rights procedures in place',
      'Cross-border transfer mechanisms established',
      'Breach notification procedures documented',
    ],
    severity: 'critical',
    documentationUrl: 'https://gdpr.eu/',
  },

  // Global / Industry-specific
  {
    id: 'pci-dss',
    label: 'PCI-DSS Compliance',
    description: 'Payment Card Industry Data Security Standard',
    appliesToRegions: ['*'],
    appliesToIndustries: ['retail_ecommerce_green_twin', 'retail_hyperscale_green_twin', 'finance_core_banking_green_twin'],
    kpiKey: KPIKey.COMPLIANCE_SCORE,
    checklistItems: [
      'Cardholder data environment defined',
      'Network segmentation verified',
      'Access controls implemented',
      'Encryption standards met',
      'Vulnerability management in place',
      'Quarterly scans completed',
    ],
    severity: 'critical',
    documentationUrl: 'https://www.pcisecuritystandards.org/',
  },
  {
    id: 'iso-27001',
    label: 'ISO 27001 Certification',
    description: 'Information Security Management System',
    appliesToRegions: ['*'],
    appliesToIndustries: ['*'],
    kpiKey: KPIKey.COMPLIANCE_SCORE,
    checklistItems: [
      'ISMS scope defined',
      'Risk assessment completed',
      'Security controls implemented',
      'Internal audits scheduled',
      'Management review conducted',
    ],
    severity: 'medium',
    documentationUrl: 'https://www.iso.org/isoiec-27001-information-security.html',
  },
  {
    id: 'soc2-type2',
    label: 'SOC 2 Type II',
    description: 'Service Organization Control compliance',
    appliesToRegions: ['*'],
    appliesToIndustries: ['saas_multitenant_ai_twin', 'finance_core_banking_green_twin'],
    kpiKey: KPIKey.COMPLIANCE_SCORE,
    checklistItems: [
      'Trust service criteria defined',
      'Controls operating effectively',
      'Annual audit completed',
      'Remediation items addressed',
      'Report distributed to customers',
    ],
    severity: 'high',
    documentationUrl: 'https://www.aicpa.org/soc4so',
  },
  {
    id: 'carbon-neutral',
    label: 'Carbon Neutrality Commitment',
    description: 'Net-zero carbon operations',
    appliesToRegions: ['*'],
    appliesToIndustries: ['*'],
    kpiKey: KPIKey.EMISSIONS_VS_TARGET,
    checklistItems: [
      'Carbon footprint measured (Scope 1, 2, 3)',
      'Reduction targets set',
      'Renewable energy sources verified',
      'Carbon offset strategy documented',
      'Annual reporting published',
    ],
    severity: 'medium',
  },
];

// Helper: Get rules for region + industry combination
export function getSovereigntyRulesForContext(
  regionCode: string,
  industryId: string
): SovereigntyRule[] {
  return SOVEREIGNTY_RULES.filter(rule => {
    // Check region match
    const regionMatch = rule.appliesToRegions.includes('*') ||
      rule.appliesToRegions.some(r => {
        if (r.endsWith('*')) {
          return regionCode.startsWith(r.replace('*', ''));
        }
        return r === regionCode;
      });

    if (!regionMatch) return false;

    // Check industry match
    const industryMatch = rule.appliesToIndustries.includes('*') ||
      rule.appliesToIndustries.includes(industryId);

    return industryMatch;
  });
}

// Helper: Get all rules
export function getAllSovereigntyRules(): SovereigntyRule[] {
  return SOVEREIGNTY_RULES;
}

// Helper: Get rules by severity
export function getSovereigntyRulesBySeverity(
  severity: 'critical' | 'high' | 'medium' | 'low'
): SovereigntyRule[] {
  return SOVEREIGNTY_RULES.filter(r => r.severity === severity);
}

// Helper: Get Canadian-specific rules
export function getCanadianSovereigntyRules(industryId: string): SovereigntyRule[] {
  return getSovereigntyRulesForContext('CA-ON', industryId);
}

// Helper: Get US-specific rules
export function getUSSovereigntyRules(industryId: string): SovereigntyRule[] {
  return getSovereigntyRulesForContext('US-EAST', industryId);
}
