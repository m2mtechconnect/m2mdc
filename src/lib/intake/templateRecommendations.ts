/**
 * Template Recommendation Engine
 * Routes users to appropriate templates based on their input
 * Sovereign Data Centre Digital Twin is the flagship template
 */

export interface TemplateRecommendation {
  templateId: string;
  confidence: number; // 0-1
  reason: string;
}

/**
 * Analyze content and recommend templates
 * Priority: Data Centre for infrastructure/compute use cases
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
  
  // Data Centre template - High priority for infrastructure/compute use cases
  const dataCentreKeywords = [
    'data centre', 'data center', 'datacenter', 'datacentre',
    'gpu', 'compute', 'hpc', 'high-performance', 'server', 'rack',
    'cooling', 'pue', 'power usage', 'energy efficiency',
    'carbon', 'emissions', 'sustainability', 'green energy',
    'sovereign', 'sovereignty', 'data residency', 'compliance',
    'colocation', 'colo', 'hyperscale', 'edge computing',
    'ups', 'power distribution', 'thermal', 'crac', 'crah',
    'infrastructure', 'facilities', 'noc', 'operations center',
    'ai training', 'machine learning', 'inference', 'workload',
    'kubernetes', 'slurm', 'cluster', 'orchestration'
  ];
  
  const dataCentreScore = dataCentreKeywords.filter(kw => allText.includes(kw)).length;
  
  if (dataCentreScore > 0) {
    recommendations.push({
      templateId: 'sovereign-data-center-twin',
      confidence: Math.min(0.95, 0.4 + (dataCentreScore * 0.1)),
      reason: `Detected data centre/infrastructure terminology (${dataCentreScore} relevant keywords). Sovereign Data Centre Digital Twin optimizes energy efficiency, carbon footprint, GPU workloads, and sovereignty compliance.`
    });
  }
  
  // Energy/utilities detection (also routes to Data Centre)
  const energyKeywords = [
    'energy management', 'power monitoring', 'grid', 'renewable',
    'carbon footprint', 'emissions tracking', 'esg', 'net zero'
  ];
  
  const energyScore = energyKeywords.filter(kw => allText.includes(kw)).length;
  
  if (energyScore > 0 && dataCentreScore === 0) {
    recommendations.push({
      templateId: 'sovereign-data-center-twin',
      confidence: Math.min(0.7, 0.3 + (energyScore * 0.15)),
      reason: `Detected energy/sustainability terminology. Data Centre template's carbon tracking and energy optimization patterns are applicable to energy-intensive operations.`
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
  
  // Data Centre for Technology/Infrastructure industry
  if (
    industry.includes('data cent') ||
    industry.includes('technology') ||
    industry.includes('infrastructure') ||
    industry.includes('cloud') ||
    industry.includes('computing')
  ) {
    recommendations.push({
      templateId: 'sovereign-data-center-twin',
      confidence: 0.95,
      reason: 'Technology/Infrastructure industry selected. Sovereign Data Centre Digital Twin provides comprehensive real-time operational intelligence for compute facilities.'
    });
  }
  
  // Data Centre for Operations departments dealing with infrastructure
  if (
    department.includes('operations') &&
    (answers.realTimeNeeds || (answers.integrationCount && answers.integrationCount > 5))
  ) {
    recommendations.push({
      templateId: 'sovereign-data-center-twin',
      confidence: 0.75,
      reason: 'Complex operations with real-time coordination needs. Data Centre template demonstrates multi-system orchestration patterns for infrastructure.'
    });
  }
  
  // Use case analysis
  if (
    useCase.includes('gpu') ||
    useCase.includes('compute') ||
    useCase.includes('cooling') ||
    useCase.includes('power') ||
    useCase.includes('energy') ||
    useCase.includes('carbon') ||
    useCase.includes('pue')
  ) {
    recommendations.push({
      templateId: 'sovereign-data-center-twin',
      confidence: 0.85,
      reason: 'Use case aligns with Data Centre template capabilities (GPU optimization, cooling, power management, carbon tracking).'
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
    templateId: 'sovereign-data-center-twin',
    confidence: 0.3,
    reason: 'Sovereign Data Centre Digital Twin serves as a reference implementation for complex infrastructure orchestration. You can adapt its patterns to your use case.'
  };
}
