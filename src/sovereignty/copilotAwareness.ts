/**
 * CoPilot Sovereignty Awareness
 * Provides context and answers for sovereignty-related questions
 */

import type { SovereigntyEngineResult, JurisdictionCode, ComplianceFrameworkId } from './types';
import { getJurisdictionDisplayName } from './mockData';

export interface SovereigntyCoPilotContext {
  sovereigntyScore: number;
  violationCount: number;
  crossBorderFlows: number;
  certifiedFrameworks: number;
  auditReadinessScore: number;
  riskLevel: string;
  primaryJurisdiction: JurisdictionCode;
  violationSummary: string;
  frameworkSummary: string;
  dataClassification: {
    sovereign: number;
    sensitive: number;
    public: number;
  };
}

/**
 * Build CoPilot context for sovereignty-related questions
 */
export function buildSovereigntyCoPilotContext(
  result: SovereigntyEngineResult,
  primaryJurisdiction: JurisdictionCode = 'CA-QC'
): SovereigntyCoPilotContext {
  const violationSummary = result.violations.length === 0
    ? 'No active sovereignty violations detected.'
    : `${result.violations.length} violation(s) detected: ${result.violations
        .slice(0, 3)
        .map(v => v.description)
        .join('; ')}${result.violations.length > 3 ? '...' : ''}`;

  // Since frameworkSummary only has counts, we'll create a simple summary
  const certifiedCount = result.frameworkSummary.certified;

  const frameworkSummary = certifiedCount === 0
    ? 'No compliance frameworks currently certified.'
    : `${certifiedCount} compliance framework(s) currently certified.`;

  return {
    sovereigntyScore: result.sovereigntyScore,
    violationCount: result.violations.length,
    crossBorderFlows: result.crossBorderFlowCount,
    certifiedFrameworks: result.frameworkSummary.certified,
    auditReadinessScore: result.auditReadinessScore,
    riskLevel: result.riskLevel,
    primaryJurisdiction,
    violationSummary,
    frameworkSummary,
    dataClassification: {
      sovereign: Math.round(result.dataClassificationDistribution.sovereign),
      sensitive: Math.round(result.dataClassificationDistribution.sensitive),
      public: Math.round(result.dataClassificationDistribution.public),
    },
  };
}

/**
 * Sovereignty-specific CoPilot suggestion chips
 */
export const SOVEREIGNTY_COPILOT_CHIPS = [
  {
    label: 'Sovereignty score',
    question: "What's my current sovereignty score and what factors affect it?",
  },
  {
    label: 'Data residency violations',
    question: 'Where are my data residency violations and how can I fix them?',
  },
  {
    label: 'Risky jurisdictions',
    question: 'Which jurisdictions are risky for my data flows?',
  },
  {
    label: 'Compliance frameworks',
    question: 'Which compliance frameworks are certified and which need attention?',
  },
  {
    label: 'Cross-border flows',
    question: 'Show me all cross-border data flows and their compliance status.',
  },
  {
    label: 'Simulate violation',
    question: 'Simulate a cross-border data sovereignty violation scenario.',
  },
  {
    label: 'Audit readiness',
    question: 'How ready am I for a compliance audit and what should I improve?',
  },
  {
    label: 'Data classification',
    question: 'What percentage of my data is classified as sovereign vs sensitive vs public?',
  },
] as const;

/**
 * Generate CoPilot response for sovereignty questions
 */
export function generateSovereigntyResponse(
  question: string,
  context: SovereigntyCoPilotContext
): string {
  const lowerQuestion = question.toLowerCase();

  // Sovereignty score questions
  if (lowerQuestion.includes('sovereignty score') || lowerQuestion.includes('current score')) {
    return `Your current sovereignty score is **${context.sovereigntyScore}%**. 

${context.sovereigntyScore >= 95 
  ? '✅ Excellent! Your data sovereignty compliance is strong.' 
  : context.sovereigntyScore >= 80 
    ? '⚠️ Good, but there\'s room for improvement.' 
    : '🚨 This needs attention. Consider reviewing your data flows and policies.'}

**Factors affecting your score:**
- Active violations: ${context.violationCount}
- Cross-border flows: ${context.crossBorderFlows}
- Certified frameworks: ${context.certifiedFrameworks}
- Audit readiness: ${context.auditReadinessScore}%

[Open the Sovereignty tab for a detailed view →](/data-centre-twin?tab=sovereignty)`;
  }

  // Violation questions
  if (lowerQuestion.includes('violation') || lowerQuestion.includes('residency')) {
    return `**Data Residency Status:**

${context.violationSummary}

${context.violationCount > 0 
  ? `**Recommended Actions:**
1. Review blocked data flows in the Sovereignty tab
2. Check cross-border routing policies
3. Verify data classification for affected assets

[View the Sovereignty & Safety Audit page for full violations timeline →](/compliance)` 
  : '✅ All data flows are compliant with your sovereignty policies.'}`;
  }

  // Jurisdiction risk questions
  if (lowerQuestion.includes('jurisdiction') || lowerQuestion.includes('risky')) {
    return `**Jurisdiction Risk Assessment:**

Your primary jurisdiction is **${getJurisdictionDisplayName(context.primaryJurisdiction)}**.

**Risk Level:** ${context.riskLevel.charAt(0).toUpperCase() + context.riskLevel.slice(1)}

${context.crossBorderFlows > 0 
  ? `You have **${context.crossBorderFlows}** cross-border data flows that require monitoring.` 
  : 'No active cross-border flows detected.'}

**Data Classification:**
- Sovereign: ${context.dataClassification.sovereign}%
- Sensitive: ${context.dataClassification.sensitive}%
- Public: ${context.dataClassification.public}%

${context.dataClassification.sovereign > 50 
  ? '✅ Good sovereign data ratio. Keep monitoring cross-border flows.' 
  : '⚠️ Consider increasing sovereign data classification for sensitive workloads.'}`;
  }

  // Framework questions
  if (lowerQuestion.includes('framework') || lowerQuestion.includes('certified') || lowerQuestion.includes('compliance')) {
    return `**Compliance Framework Status:**

${context.frameworkSummary}

**Audit Readiness Score:** ${context.auditReadinessScore}%

${context.auditReadinessScore >= 90 
  ? '✅ You\'re well-prepared for compliance audits.' 
  : context.auditReadinessScore >= 70 
    ? '⚠️ Some frameworks need attention before your next audit.' 
    : '🚨 Consider prioritizing framework certifications.'}

[View compliance reports on the Sovereignty & Safety Audit page →](/compliance)`;
  }

  // Audit readiness questions
  if (lowerQuestion.includes('audit') || lowerQuestion.includes('ready')) {
    return `**Audit Readiness Assessment:**

Your audit readiness score is **${context.auditReadinessScore}%**.

**Current Status:**
- Sovereignty Score: ${context.sovereigntyScore}%
- Active Violations: ${context.violationCount}
- Certified Frameworks: ${context.certifiedFrameworks}

${context.auditReadinessScore >= 90 
  ? '✅ You\'re ready for a compliance audit.' 
  : `**Recommendations to improve:**
1. Resolve any active violations (${context.violationCount} remaining)
2. Complete in-progress framework certifications
3. Review and update data classification for all assets`}`;
  }

  // Data classification questions
  if (lowerQuestion.includes('classification') || lowerQuestion.includes('sovereign') || lowerQuestion.includes('sensitive')) {
    return `**Data Classification Distribution:**

- **Sovereign Data:** ${context.dataClassification.sovereign}%
- **Sensitive Data:** ${context.dataClassification.sensitive}%
- **Public Data:** ${context.dataClassification.public}%

${context.dataClassification.sovereign >= 50 
  ? '✅ Strong sovereign data ratio. Your most sensitive data is well-protected.' 
  : '⚠️ Consider reviewing assets to ensure proper classification of sensitive workloads.'}`;
  }

  // Simulation questions
  if (lowerQuestion.includes('simulate') || lowerQuestion.includes('scenario')) {
    return `**Sovereignty Simulation Scenarios:**

You can simulate the following sovereignty-related scenarios:

1. **Cross-Border Violation** - Simulate unauthorized data transfer to non-compliant region
2. **Policy Tightening** - Test impact of stricter data residency policies
3. **Region Migration** - Simulate moving workloads to compliant jurisdictions

[Run a simulation in the Data Centre Twin →](/data-centre-twin?view=simulation)

These simulations will show you the impact on your sovereignty score, violations, and compliance status.`;
  }

  // Default response
  return `I can help you with sovereignty and compliance questions. Here's your current status:

**Sovereignty Score:** ${context.sovereigntyScore}%
**Violations:** ${context.violationCount}
**Cross-Border Flows:** ${context.crossBorderFlows}
**Risk Level:** ${context.riskLevel}

Try asking about:
- "What's my current sovereignty score?"
- "Where are my data residency violations?"
- "Which jurisdictions are risky?"
- "Which compliance frameworks are certified?"
- "Simulate a cross-border violation"`;
}
