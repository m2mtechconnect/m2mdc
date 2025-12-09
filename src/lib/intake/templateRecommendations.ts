/**
 * Template Recommendation Engine
 * Routes users to appropriate templates based on their input
 * YVR Airport Operations Digital Twin is the flagship template
 */

export interface TemplateRecommendation {
  templateId: string;
  confidence: number; // 0-1
  reason: string;
}

/**
 * Analyze content and recommend templates
 * Priority: YVR for aviation/airport use cases
 */
export function recommendTemplatesFromContent(content: {
  text?: string;
  industry?: string;
  department?: string;
  keywords?: string[];
  url?: string;
}): TemplateRecommendation[] {
  const recommendations: TemplateRecommendation[] = [];
  const text = content.text?.toLowerCase() || '';
  const keywords = content.keywords?.map(k => k.toLowerCase()) || [];
  const industry = content.industry?.toLowerCase() || '';
  const department = content.department?.toLowerCase() || '';
  const url = content.url?.toLowerCase() || '';
  
  // Combine all text for analysis
  const allText = [text, ...keywords, industry, department, url].join(' ').toLowerCase();
  
  // YVR Airport template - High priority for aviation/airport/transportation
  const aviationKeywords = [
    'airport', 'aviation', 'flight', 'airline', 'runway', 'terminal', 
    'passenger', 'baggage', 'gate', 'aircraft', 'airside', 'landside',
    'departure', 'arrival', 'boarding', 'check-in', 'security screening',
    'air traffic', 'ground operations', 'ramp', 'tarmac', 'hangar',
    'cargo', 'freight', 'customs', 'immigration', 'TSA', 'FAA',
    'ICAO', 'IATA', 'tower', 'apron', 'taxiway', 'jet bridge'
  ];
  
  const aviationScore = aviationKeywords.filter(kw => allText.includes(kw)).length;
  
  if (aviationScore > 0) {
    recommendations.push({
      templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
      confidence: Math.min(0.9, 0.4 + (aviationScore * 0.1)),
      reason: `Detected aviation/airport terminology (${aviationScore} relevant keywords). YVR Airport Operations Digital Twin is optimized for real-time flight operations, baggage handling, passenger flow, and weather-aware scheduling.`
    });
  }
  
  // Transportation hub detection (also routes to YVR)
  const transportKeywords = [
    'transportation hub', 'transit', 'logistics hub', 'distribution center',
    'intermodal', 'smart infrastructure', 'traffic management'
  ];
  
  const transportScore = transportKeywords.filter(kw => allText.includes(kw)).length;
  
  if (transportScore > 0 && aviationScore === 0) {
    recommendations.push({
      templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
      confidence: Math.min(0.7, 0.3 + (transportScore * 0.15)),
      reason: `Detected transportation/logistics terminology. YVR template's multi-system coordination and real-time optimization patterns are applicable to transportation hubs.`
    });
  }
  
  // Sort by confidence descending
  recommendations.sort((a, b) => b.confidence - a.confidence);
  
  return recommendations;
}

/**
 * Analyze questionnaire answers and recommend templates
 */
export function recommendTemplatesFromQuestionnaire(answers: {
  industry?: string;
  department?: string;
  useCase?: string;
  scale?: string;
  realTimeNeeds?: boolean;
  integrationCount?: number;
}): TemplateRecommendation[] {
  const recommendations: TemplateRecommendation[] = [];
  
  const industry = answers.industry?.toLowerCase() || '';
  const department = answers.department?.toLowerCase() || '';
  const useCase = answers.useCase?.toLowerCase() || '';
  
  // YVR for Aviation industry
  if (
    industry.includes('aviation') ||
    industry.includes('airport') ||
    industry.includes('airline') ||
    industry.includes('transportation')
  ) {
    recommendations.push({
      templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
      confidence: 0.95,
      reason: 'Aviation/Airport industry selected. YVR Airport Operations Digital Twin provides comprehensive real-time operational intelligence.'
    });
  }
  
  // YVR for Operations departments dealing with complex coordination
  if (
    department.includes('operations') &&
    (answers.realTimeNeeds || (answers.integrationCount && answers.integrationCount > 5))
  ) {
    recommendations.push({
      templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
      confidence: 0.75,
      reason: 'Complex operations with real-time coordination needs. YVR template demonstrates multi-system orchestration patterns.'
    });
  }
  
  // Use case analysis
  if (
    useCase.includes('passenger') ||
    useCase.includes('baggage') ||
    useCase.includes('scheduling') ||
    useCase.includes('capacity') ||
    useCase.includes('delay') ||
    useCase.includes('throughput')
  ) {
    recommendations.push({
      templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
      confidence: 0.85,
      reason: 'Use case aligns with YVR template capabilities (scheduling, capacity optimization, delay management).'
    });
  }
  
  recommendations.sort((a, b) => b.confidence - a.confidence);
  return recommendations;
}

/**
 * Analyze uploaded document and recommend templates
 */
export function recommendTemplatesFromDocument(analysis: {
  industry?: string;
  department?: string;
  keywords?: string[];
  documentType?: string;
  summary?: string;
}): TemplateRecommendation[] {
  return recommendTemplatesFromContent({
    text: analysis.summary,
    industry: analysis.industry,
    department: analysis.department,
    keywords: analysis.keywords,
  });
}

/**
 * Get default recommendation if no specific match
 */
export function getDefaultRecommendation(): TemplateRecommendation {
  return {
    templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
    confidence: 0.3,
    reason: 'YVR Airport Operations Digital Twin serves as a reference implementation for complex multi-system orchestration. You can adapt its patterns to your use case.'
  };
}
