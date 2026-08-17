/**
 * Enhanced Digital Twin Validators with Industry + Department Awareness
 * Strict filtering and scoring based on 20 industries × 12 departments
 */

import type { Industry } from './industryClassifier';
import type { Department } from './departmentClassifier';
import { getAllowedTwinTypes, getBlockedTwinTypes } from './industryClassifier';
import { isMarketingAllowedForIndustry } from './departmentClassifier';
import { getTwinTemplate } from './twinTemplates';

export interface EnhancedValidationResult {
  isValid: boolean;
  reasons: string[];
  scores: {
    industryFit: number;      // 0-35
    departmentFit: number;    // 0-35
    twinSpecificity: number;  // 0-20
    integrationDepth: number; // 0-10
    total: number;            // 0-100
  };
}

/** Systems of record whose mention proves a real integration surface. */
const NAMED_DATA_SOURCES = [
  'erp', 'wms', 'tms', 'pos', 'hris', 'iot', 'scada', 'mes', 'ehr', 'crm',
] as const;

/**
 * Score how well a recommendation matches one allowed twin type.
 *
 * Exact phrase matching alone scored almost everything at zero: an allowed
 * type of "GxP Compliance" never appears verbatim in "GxP Validation &
 * Compliance Tracking". Partial credit for the type's significant words keeps
 * genuinely on-target recommendations above the acceptance threshold.
 */
function allowedTypeScore(text: string, allowedType: string): number {
  const lower = allowedType.toLowerCase();
  if (text.includes(lower)) return 10;

  const tokens = lower.split(/[^a-z0-9]+/).filter((t) => t.length > 3);
  if (tokens.length === 0) return 0;

  const hits = tokens.filter((t) => text.includes(t)).length;
  if (hits === tokens.length) return 8;
  if (hits * 2 >= tokens.length) return 5;
  return 0;
}

/**
 * Validate a recommendation against industry + department requirements
 */
export function validateDigitalTwinWithContext(
  recommendation: any,
  industry: Industry,
  department: Department
): EnhancedValidationResult {
  const reasons: string[] = [];
  const scores = {
    industryFit: 0,
    departmentFit: 0,
    twinSpecificity: 0,
    integrationDepth: 0,
    total: 0,
  };

  const title = (recommendation.title || '').toLowerCase();
  const description = (recommendation.description || '').toLowerCase();
  const text = `${title} ${description}`;

  // Get context
  const allowedTypes = getAllowedTwinTypes(industry);
  const blockedTypes = getBlockedTwinTypes(industry);
  const template = getTwinTemplate(industry, department);

  // ========== HARD REJECTIONS ==========

  // 0. Policy rejections first.
  //    Whether a department is permitted for an industry is a policy decision
  //    and must be reported as such. Evaluating it after the content checks
  //    meant a blocked recommendation was rejected for vague wording instead,
  //    hiding the real reason from the caller.
  if (department === 'Marketing' && !isMarketingAllowedForIndustry(industry)) {
    reasons.push(`REJECTED: Marketing not allowed for ${industry}`);
    return { isValid: false, reasons, scores };
  }

  // 1. Check if recommendation is in blocked categories
  for (const blocked of blockedTypes) {
    if (text.includes(blocked.toLowerCase())) {
      reasons.push(`BLOCKED: Contains banned type "${blocked}" for ${industry}`);
      return { isValid: false, reasons, scores };
    }
  }

  // 2. Reject generic AI initiatives
  const genericAIPatterns = [
    'ai upskilling program',
    'ai innovation workshop',
    'ai strategy',
    'ai literacy',
    'ai awareness training',
    'ai readiness assessment',
  ];
  
  for (const pattern of genericAIPatterns) {
    if (text.includes(pattern)) {
      reasons.push(`REJECTED: Generic AI initiative "${pattern}" - not a digital twin`);
      return { isValid: false, reasons, scores };
    }
  }

  // 3. Reject if no digital twin mention AND no operational process
  const hasDigitalTwinMention = 
    text.includes('digital twin') ||
    text.includes('twin for') ||
    text.includes('operational twin');

  const hasOperationalProcess =
    text.includes('supply chain') ||
    text.includes('inventory') ||
    text.includes('warehouse') ||
    text.includes('logistics') ||
    text.includes('workforce') ||
    text.includes('production') ||
    text.includes('manufacturing') ||
    // "operations" on its own is filler ("Improve Business Operations"); it
    // only signals a real process when it names one.
    /\b(store|facility|network|fleet|warehouse|data ?cent(re|er)|field|plant|retail|branch|site)\s+operations\b/.test(text) ||
    text.includes('fleet') ||
    text.includes('compliance');

  if (!hasDigitalTwinMention && !hasOperationalProcess) {
    reasons.push('REJECTED: No digital twin or operational process mentioned');
    return { isValid: false, reasons, scores };
  }

  // 5. Reject if missing critical digital twin elements
  const hasDataSources =
    text.includes('erp') ||
    text.includes('wms') ||
    text.includes('tms') ||
    text.includes('pos') ||
    text.includes('hris') ||
    text.includes('iot') ||
    text.includes('scada') ||
    text.includes('mes') ||
    text.includes('ehr') ||
    text.includes('crm');

  const hasEvents =
    text.includes('trigger') ||
    text.includes('event') ||
    text.includes('alert') ||
    text.includes('forecast') ||
    text.includes('schedule') ||
    text.includes('monitor');

  const hasKPIs =
    text.includes('%') ||
    text.includes('efficiency') ||
    text.includes('optimization') ||
    text.includes('accuracy') ||
    text.includes('reduction') ||
    text.includes('improvement');

  // Vague phrasing with no named system is a generic pitch, not a twin. It is
  // reported under its own reason rather than the data-source reason, because
  // adding an acronym would not make it specific.
  const hasGenericPhrases =
    text.includes('improve efficiency') ||
    text.includes('enhance performance') ||
    text.includes('optimize processes') ||
    text.includes('leverage ai');

  if (hasGenericPhrases && !hasDataSources) {
    reasons.push('REJECTED: Generic AI phrasing without specific digital twin context');
    return { isValid: false, reasons, scores };
  }

  if (!hasDataSources) {
    reasons.push('REJECTED: No data sources or systems integration mentioned');
    return { isValid: false, reasons, scores };
  }

  if (!hasEvents && !hasKPIs) {
    reasons.push('REJECTED: Missing both event triggers and KPIs');
    return { isValid: false, reasons, scores };
  }

  // ========== SCORING ==========

  // Industry Fit (0-35 points)
  let industryScore = 0;
  for (const allowedType of allowedTypes) {
    industryScore += allowedTypeScore(text, allowedType);
  }
  
  // Check template keywords
  for (const keyword of template.processDescription.toLowerCase().split(' ')) {
    if (keyword.length > 4 && text.includes(keyword)) {
      industryScore += 2;
    }
  }
  
  scores.industryFit = Math.min(35, industryScore);

  // Department Fit (0-35 points)
  let departmentScore = 0;
  const deptLower = department.toLowerCase();
  
  // Direct department mention
  if (text.includes(deptLower)) {
    departmentScore += 15;
  }
  
  // Template data sources
  for (const dataSource of template.dataSources) {
    if (text.includes(dataSource.toLowerCase())) {
      departmentScore += 5;
    }
  }
  
  // Template KPIs
  for (const kpi of template.kpis) {
    if (text.includes(kpi.toLowerCase())) {
      departmentScore += 3;
    }
  }
  
  scores.departmentFit = Math.min(35, departmentScore);

  // Twin Specificity (0-20 points)
  let specificityScore = 0;
  
  if (hasDigitalTwinMention) {
    specificityScore += 8;
  }
  
  if (hasDataSources) {
    specificityScore += 4;
  }
  
  if (hasEvents) {
    specificityScore += 4;
  }
  
  if (hasKPIs) {
    specificityScore += 4;
  }
  
  scores.twinSpecificity = Math.min(20, specificityScore);

  // Integration Depth (0-10 points)
  let integrationScore = 0;
  const integrationKeywords = ['integration', 'connect', 'api', 'data flow', 'system', 'platform'];
  
  for (const keyword of integrationKeywords) {
    if (text.includes(keyword)) {
      integrationScore += 2;
    }
  }

  // Naming concrete systems of record is the strongest integration signal
  // there is, and it was previously worth nothing unless the generic word
  // "system" also happened to appear.
  for (const source of NAMED_DATA_SOURCES) {
    if (text.includes(source)) {
      integrationScore += 2;
    }
  }
  
  scores.integrationDepth = Math.min(10, integrationScore);

  // Calculate total
  scores.total = scores.industryFit + scores.departmentFit + scores.twinSpecificity + scores.integrationDepth;

  // Apply generic penalty if detected
  if (hasGenericPhrases && !hasDigitalTwinMention) {
    scores.total -= 30;
    reasons.push('PENALTY: Generic AI phrasing without specific digital twin context');
  }

  // Minimum threshold
  const MIN_SCORE = 40;
  const isValid = scores.total >= MIN_SCORE;

  if (!isValid) {
    reasons.push(`REJECTED: Total score ${scores.total} below minimum ${MIN_SCORE}`);
  }

  return {
    isValid,
    reasons,
    scores,
  };
}

/**
 * Filter and rank recommendations based on industry + department
 */
export function filterAndRankRecommendations(
  recommendations: any[],
  industry: Industry,
  department: Department,
  topN: number = 3
): Array<{ recommendation: any; validation: EnhancedValidationResult }> {
  const validatedRecs = recommendations
    .map(rec => ({
      recommendation: rec,
      validation: validateDigitalTwinWithContext(rec, industry, department),
    }))
    .filter(({ validation }) => validation.isValid)
    .sort((a, b) => b.validation.scores.total - a.validation.scores.total);

  return validatedRecs.slice(0, topN);
}

/**
 * Batch validate recommendations for multiple departments
 */
export function validateForMultipleDepartments(
  recommendations: any[],
  industry: Industry,
  departments: Department[]
): Map<Department, Array<{ recommendation: any; validation: EnhancedValidationResult }>> {
  const results = new Map<Department, Array<{ recommendation: any; validation: EnhancedValidationResult }>>();

  for (const department of departments) {
    const filtered = filterAndRankRecommendations(recommendations, industry, department, 3);
    results.set(department, filtered);
  }

  return results;
}

/**
 * Get summary statistics for a set of recommendations
 */
export function getValidationStats(recommendations: any[], industry: Industry, department: Department): {
  total: number;
  valid: number;
  rejected: number;
  avgScore: number;
  topReasons: Array<{ reason: string; count: number }>;
} {
  const validations = recommendations.map(rec =>
    validateDigitalTwinWithContext(rec, industry, department)
  );

  const valid = validations.filter(v => v.isValid).length;
  const rejected = validations.filter(v => !v.isValid).length;
  const avgScore = validations.reduce((sum, v) => sum + v.scores.total, 0) / validations.length;

  const reasonCounts = new Map<string, number>();
  for (const validation of validations) {
    for (const reason of validation.reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    }
  }

  const topReasons = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total: recommendations.length,
    valid,
    rejected,
    avgScore: Math.round(avgScore),
    topReasons,
  };
}
