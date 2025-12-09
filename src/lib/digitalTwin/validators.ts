/**
 * Digital Twin Recommendation Validators
 * 
 * These functions ensure recommendations are true Digital Twin Blueprints,
 * not generic AI initiatives or B2C personalization projects.
 */

export interface ValidationResult {
  isValid: boolean;
  reasons: string[];
  score: number; // 0-100
}

/**
 * Check if a recommendation is a true Digital Twin Blueprint
 */
export function isDigitalTwinBlueprint(recommendation: any): ValidationResult {
  const reasons: string[] = [];
  let score = 100;
  
  const title = (recommendation.title || '').toLowerCase();
  const description = (recommendation.description || '').toLowerCase();
  const text = `${title} ${description}`;
  
  // CRITICAL: Must mention digital twin OR operational process
  const hasDigitalTwinMention = 
    text.includes('digital twin') ||
    text.includes('twin for') ||
    text.includes('operational twin');
  
  const hasOperationalProcess =
    text.includes('supply chain') ||
    text.includes('inventory') ||
    text.includes('warehouse') ||
    text.includes('distribution') ||
    text.includes('logistics') ||
    text.includes('workforce') ||
    text.includes('store operations') ||
    text.includes('last mile') ||
    text.includes('forecasting') ||
    text.includes('replenishment') ||
    text.includes('loss prevention') ||
    text.includes('fleet') ||
    text.includes('transportation');
  
  if (!hasDigitalTwinMention && !hasOperationalProcess) {
    reasons.push('Does not mention digital twin or operational process');
    score -= 50;
  }
  
  // Must have data sources mentioned
  const hasDataSources =
    text.includes('pos') ||
    text.includes('wms') ||
    text.includes('tms') ||
    text.includes('erp') ||
    text.includes('hris') ||
    text.includes('iot') ||
    text.includes('sensor') ||
    text.includes('transaction data') ||
    text.includes('inventory data');
  
  if (!hasDataSources) {
    reasons.push('No data sources or systems mentioned');
    score -= 20;
  }
  
  // Should mention events or triggers
  const hasEventTriggers =
    text.includes('trigger') ||
    text.includes('event') ||
    text.includes('alert') ||
    text.includes('forecast run') ||
    text.includes('low stock') ||
    text.includes('inbound') ||
    text.includes('shipment');
  
  if (!hasEventTriggers) {
    reasons.push('No event triggers mentioned');
    score -= 10;
  }
  
  // Should have operational metrics/impact
  const hasOperationalImpact =
    text.includes('reduction') ||
    text.includes('efficiency') ||
    text.includes('accuracy') ||
    text.includes('optimization') ||
    text.includes('improve') ||
    text.includes('%') ||
    text.includes('stockout') ||
    text.includes('labor') ||
    text.includes('cost');
  
  if (!hasOperationalImpact) {
    reasons.push('No operational impact metrics mentioned');
    score -= 10;
  }
  
  const isValid = score >= 60; // Must score at least 60/100
  
  return {
    isValid,
    reasons,
    score: Math.max(0, score),
  };
}

/**
 * Check if a recommendation is operationally relevant for a given industry
 */
export function isOperationallyRelevant(
  recommendation: any,
  industry: string
): ValidationResult {
  const reasons: string[] = [];
  let score = 100;
  
  const title = (recommendation.title || '').toLowerCase();
  const description = (recommendation.description || '').toLowerCase();
  const text = `${title} ${description}`;
  const normalizedIndustry = industry.toLowerCase();
  
  // CRITICAL: Block B2C personalization for enterprise retail
  if (normalizedIndustry.includes('retail') || normalizedIndustry.includes('enterprise retail')) {
    const bannedTerms = [
      'customer personalization',
      'personalized shopping',
      'marketing personalization',
      'customer experience',
      'shopping experience',
      'merchandising',
      'loyalty optimization',
      'customer journey',
      'enhance customer',
      'improve customer',
      'personalization engine',
    ];
    
    for (const term of bannedTerms) {
      if (text.includes(term)) {
        reasons.push(`Contains banned B2C term for retail: "${term}"`);
        score -= 40; // Heavy penalty
      }
    }
    
    // Must have operational focus for retail
    const hasRetailOps =
      text.includes('supply chain') ||
      text.includes('warehouse') ||
      text.includes('store operations') ||
      text.includes('logistics') ||
      text.includes('workforce') ||
      text.includes('inventory') ||
      text.includes('distribution');
    
    if (!hasRetailOps) {
      reasons.push('No operational focus for enterprise retail');
      score -= 30;
    }
  }
  
  // Generic "AI upskilling" without operational tie-in
  const isGenericUpskilling =
    (text.includes('upskilling') || text.includes('training')) &&
    !text.includes('store manager') &&
    !text.includes('planner') &&
    !text.includes('scheduler') &&
    !text.includes('operational role');
  
  if (isGenericUpskilling) {
    reasons.push('Generic upskilling not tied to operational roles');
    score -= 30;
  }
  
  const isValid = score >= 60;
  
  return {
    isValid,
    reasons,
    score: Math.max(0, score),
  };
}

/**
 * Validate a complete recommendation against all Digital Twin criteria
 */
export function validateDigitalTwinRecommendation(
  recommendation: any,
  industry?: string
): ValidationResult {
  const twinCheck = isDigitalTwinBlueprint(recommendation);
  const opsCheck = industry 
    ? isOperationallyRelevant(recommendation, industry)
    : { isValid: true, reasons: [], score: 100 };
  
  const combinedScore = (twinCheck.score * 0.6) + (opsCheck.score * 0.4);
  const allReasons = [...twinCheck.reasons, ...opsCheck.reasons];
  
  return {
    isValid: twinCheck.isValid && opsCheck.isValid,
    reasons: allReasons,
    score: Math.round(combinedScore),
  };
}

/**
 * Filter recommendations to only include valid Digital Twins
 */
export function filterValidDigitalTwins(
  recommendations: any[],
  industry?: string
): { valid: any[]; rejected: Array<{ rec: any; validation: ValidationResult }> } {
  const valid: any[] = [];
  const rejected: Array<{ rec: any; validation: ValidationResult }> = [];
  
  for (const rec of recommendations) {
    const validation = validateDigitalTwinRecommendation(rec, industry);
    
    if (validation.isValid) {
      valid.push(rec);
    } else {
      rejected.push({ rec, validation });
      console.warn(
        `[DigitalTwinValidator] Rejected "${rec.title}":`,
        validation.reasons.join(', '),
        `Score: ${validation.score}/100`
      );
    }
  }
  
  return { valid, rejected };
}
