/**
 * Department Classification for Digital Twin Recommendations
 * Classifies use cases into one of 12 enterprise departments
 */

export type Department =
  | 'Supply Chain'
  | 'Operations'
  | 'Procurement'
  | 'Finance'
  | 'HR / People / Workforce'
  | 'IT / Engineering'
  | 'Compliance / Risk'
  | 'Customer Service'
  | 'Sales'
  | 'Marketing'
  | 'Manufacturing / Production'
  | 'Logistics / Fleet';

interface DepartmentPattern {
  department: Department;
  keywords: string[];
  contextKeywords: string[];
}

const departmentPatterns: DepartmentPattern[] = [
  {
    department: 'Supply Chain',
    keywords: ['supply chain', 'inventory', 'procurement planning', 'vendor management', 's&op', 'demand planning', 'forecasting'],
    contextKeywords: ['sku', 'stock', 'replenishment', 'distribution', 'dc'],
  },
  {
    department: 'Operations',
    keywords: ['operations', 'ops', 'process', 'workflow', 'operational', 'store operations', 'facility operations'],
    contextKeywords: ['efficiency', 'optimization', 'throughput', 'utilization'],
  },
  {
    department: 'Procurement',
    keywords: ['procurement', 'purchasing', 'sourcing', 'vendor', 'supplier', 'contract management', 'spend'],
    contextKeywords: ['negotiate', 'rfq', 'rfp', 'purchase order'],
  },
  {
    department: 'Finance',
    keywords: ['finance', 'accounting', 'fp&a', 'treasury', 'budget', 'financial planning', 'credit', 'collections'],
    contextKeywords: ['revenue', 'expense', 'cashflow', 'profitability', 'margin'],
  },
  {
    department: 'HR / People / Workforce',
    keywords: ['hr', 'human resources', 'workforce', 'staffing', 'scheduling', 'talent', 'recruiting', 'onboarding', 'performance'],
    contextKeywords: ['employee', 'headcount', 'shift', 'labor', 'training'],
  },
  {
    department: 'IT / Engineering',
    keywords: ['it', 'engineering', 'infrastructure', 'devops', 'platform', 'systems', 'network', 'security'],
    contextKeywords: ['deployment', 'uptime', 'incident', 'release', 'code'],
  },
  {
    department: 'Compliance / Risk',
    keywords: ['compliance', 'risk', 'audit', 'regulatory', 'governance', 'gxp', 'sox', 'gdpr'],
    contextKeywords: ['violation', 'policy', 'control', 'validation', 'certification'],
  },
  {
    department: 'Customer Service',
    keywords: ['customer service', 'support', 'contact center', 'helpdesk', 'customer care', 'service desk'],
    contextKeywords: ['ticket', 'resolution', 'sla', 'escalation', 'satisfaction'],
  },
  {
    department: 'Sales',
    keywords: ['sales', 'revenue', 'pipeline', 'deal', 'quota', 'territory', 'account management'],
    contextKeywords: ['opportunity', 'win rate', 'forecast', 'commission', 'lead'],
  },
  {
    department: 'Marketing',
    keywords: ['marketing', 'campaign', 'brand', 'promotion', 'advertising', 'content', 'seo', 'digital marketing'],
    contextKeywords: ['engagement', 'conversion', 'roi', 'attribution', 'audience'],
  },
  {
    department: 'Manufacturing / Production',
    keywords: ['manufacturing', 'production', 'assembly', 'plant', 'factory', 'line', 'throughput', 'yield'],
    contextKeywords: ['oee', 'downtime', 'scrap', 'quality', 'batch'],
  },
  {
    department: 'Logistics / Fleet',
    keywords: ['logistics', 'fleet', 'transportation', 'shipping', 'delivery', 'routing', 'last mile', 'freight'],
    contextKeywords: ['driver', 'truck', 'route', 'dispatch', 'carrier'],
  },
];

/**
 * Count whole-word occurrences of a keyword.
 *
 * Plain substring matching made short keywords fire constantly: "it" matched
 * inside "digital", "unit" and "monitor", which pushed unrelated content into
 * IT / Engineering. Word boundaries keep short keywords usable.
 */
function countWord(content: string, keyword: string): number {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (content.match(new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'g')) || []).length;
}

/** The distinctive words in a department label, e.g. "IT / Engineering" -> it, engineering. */
function departmentNameTokens(department: Department): string[] {
  return department
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

/**
 * Classify a use case into a department based on content
 */
export function classifyDepartment(content: string): Department {
  const normalizedContent = content.toLowerCase();
  
  const scores: Array<{ department: Department; score: number }> = [];
  
  for (const pattern of departmentPatterns) {
    let score = 0;
    
    // Primary keywords (higher weight)
    for (const keyword of pattern.keywords) {
      const keywordCount = countWord(normalizedContent, keyword);
      score += keywordCount * 3;
    }
    
    // Context keywords (lower weight)
    for (const keyword of pattern.contextKeywords) {
      const keywordCount = countWord(normalizedContent, keyword);
      score += keywordCount;
    }

    // Naming the department itself is the strongest available signal, and it
    // outranks generic nouns that several departments share ("network",
    // "infrastructure", "systems").
    if (departmentNameTokens(pattern.department).some((token) => countWord(normalizedContent, token) > 0)) {
      score += 5;
    }
    
    if (score > 0) {
      scores.push({ department: pattern.department, score });
    }
  }
  
  // Sort by score and return highest
  scores.sort((a, b) => b.score - a.score);
  
  if (scores.length > 0) {
    console.log(`[DepartmentClassifier] Matched: ${scores[0].department} (score: ${scores[0].score})`);
    return scores[0].department;
  }

  // Default fallback
  console.log('[DepartmentClassifier] No match found, defaulting to Operations');
  return 'Operations';
}

/**
 * Get multiple department matches with scores
 */
export function classifyDepartments(content: string, topN: number = 3): Array<{ department: Department; score: number }> {
  const normalizedContent = content.toLowerCase();
  
  const scores: Array<{ department: Department; score: number }> = [];
  
  for (const pattern of departmentPatterns) {
    let score = 0;
    
    for (const keyword of pattern.keywords) {
      const keywordCount = (normalizedContent.match(new RegExp(keyword, 'g')) || []).length;
      score += keywordCount * 3;
    }
    
    for (const keyword of pattern.contextKeywords) {
      const keywordCount = (normalizedContent.match(new RegExp(keyword, 'g')) || []).length;
      score += keywordCount;
    }
    
    if (score > 0) {
      scores.push({ department: pattern.department, score });
    }
  }
  
  scores.sort((a, b) => b.score - a.score);
  
  return scores.slice(0, topN);
}

/**
 * Check if a department is allowed for marketing initiatives in a given industry
 */
export function isMarketingAllowedForIndustry(industry: string): boolean {
  const marketingAllowedIndustries = [
    'Fashion / Apparel Retail',
    'Travel / Transportation',
    'Software / Enterprise SaaS',
    'Education / EdTech',
  ];
  
  return marketingAllowedIndustries.some(i => industry.includes(i));
}
