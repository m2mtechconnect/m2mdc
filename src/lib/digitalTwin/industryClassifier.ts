/**
 * Industry Classification for Digital Twin Recommendations
 * Classifies companies into one of 20 industry categories
 */

/**
 * The complete industry vocabulary, exported as data so callers and tests read
 * the same list instead of maintaining a second hand-copied copy that drifts.
 */
export const INDUSTRIES = [
  'Enterprise Retail',
  'Fashion / Apparel Retail',
  'Grocery & Food Retail',
  'Logistics / Supply Chain / 3PL',
  'Manufacturing – Automotive',
  'Manufacturing – Industrial',
  'Manufacturing – Consumer Goods',
  'Energy / Utilities',
  'Healthcare / Hospitals',
  'Pharmaceuticals & Life Sciences',
  'Financial Services / Banking',
  'Insurance',
  'Real Estate / PropTech',
  'Construction / Engineering',
  'Telecommunications',
  'Travel / Transportation',
  'Education / EdTech',
  'Agriculture / Agritech',
  'Government / Public Sector',
  'Software / Enterprise SaaS',
] as const;

export type Industry = (typeof INDUSTRIES)[number];

/** Exposed so tests can assert the patterns stay domain-shaped. */
export function industryDomainPatterns(): Array<{ industry: Industry; patterns: string[] }> {
  return industryPatterns.map((p) => ({ industry: p.industry, patterns: p.domainPatterns }));
}

interface IndustryPattern {
  industry: Industry;
  /**
   * Host fragments, matched against the lowercased domain.
   *
   * These must be domain-shaped. Human-readable names containing spaces
   * ("cleveland clinic", "whole foods") can never match a hostname, so every
   * such entry was dead weight that silently pushed the company into the
   * default SaaS bucket.
   */
  domainPatterns: string[];
  keywords: string[];
  exclusions?: string[];
}

const industryPatterns: IndustryPattern[] = [
  {
    industry: 'Enterprise Retail',
    domainPatterns: ['walmart.com', 'target.com', 'homedepot.com', 'lowes.com', 'bestbuy.com'],
    keywords: ['retail', 'stores', 'merchandise', 'shopping', 'distribution center', 'point of sale', 'inventory management'],
  },
  {
    industry: 'Fashion / Apparel Retail',
    domainPatterns: ['nike.com', 'adidas.com', 'gap.com', 'zara.com', 'h&m.com', 'uniqlo.com'],
    keywords: ['fashion', 'apparel', 'clothing', 'footwear', 'accessories', 'style', 'collection'],
  },
  {
    industry: 'Grocery & Food Retail',
    // Costco's operating model is grocery and fresh-goods led, so it belongs
    // here rather than in general enterprise retail.
    domainPatterns: ['kroger.com', 'albertsons.com', 'wholefoods.com', 'wholefoodsmarket.com', 'safeway.com', 'costco.com', 'loblaws.ca', 'sobeys.com'],
    keywords: ['grocery', 'food retail', 'supermarket', 'fresh produce', 'perishable', 'refrigeration'],
  },
  {
    industry: 'Logistics / Supply Chain / 3PL',
    domainPatterns: ['fedex.com', 'ups.com', 'dhl.com', 'maersk.com', 'coyote.com', 'chrobinson.com'],
    keywords: ['logistics', '3pl', 'freight', 'shipping', 'warehousing', 'last mile', 'fleet management', 'transportation management'],
  },
  {
    industry: 'Manufacturing – Automotive',
    domainPatterns: ['ford.com', 'gm.com', 'toyota.com', 'tesla.com', 'bmw.com', 'mercedes'],
    keywords: ['automotive', 'vehicle', 'assembly line', 'oem', 'tier 1', 'powertrain', 'chassis'],
  },
  {
    industry: 'Manufacturing – Industrial',
    domainPatterns: ['ge.com', 'siemens.com', 'honeywell.com', '3m.com', 'emerson.com'],
    keywords: ['industrial equipment', 'machinery', 'automation', 'controls', 'sensors', 'actuators', 'plc'],
  },
  {
    industry: 'Manufacturing – Consumer Goods',
    domainPatterns: ['pg.com', 'unilever.com', 'nestle.com', 'pepsico.com', 'coca-cola'],
    keywords: ['consumer goods', 'fmcg', 'cpg', 'packaged goods', 'brand manufacturing'],
  },
  {
    industry: 'Energy / Utilities',
    domainPatterns: ['shell.com', 'bp.com', 'exxon', 'duke-energy', 'nextera'],
    keywords: ['energy', 'utilities', 'power generation', 'grid', 'renewable', 'oil and gas', 'electricity'],
  },
  {
    industry: 'Healthcare / Hospitals',
    domainPatterns: ['mayoclinic.org', 'clevelandclinic.org', 'hopkinsmedicine.org', 'johnshopkins.edu', 'kaiserpermanente.org', 'kp.org'],
    keywords: ['hospital', 'healthcare', 'patient care', 'clinical', 'medical center', 'health system'],
  },
  {
    industry: 'Pharmaceuticals & Life Sciences',
    domainPatterns: ['pfizer.com', 'novartis.com', 'roche.com', 'merck.com', 'abbvie.com'],
    keywords: ['pharmaceutical', 'life sciences', 'drug development', 'clinical trials', 'gxp', 'fda', 'regulatory'],
  },
  {
    industry: 'Financial Services / Banking',
    domainPatterns: ['jpmorgan', 'wellsfargo.com', 'td.com', 'bankofamerica', 'citigroup'],
    keywords: ['banking', 'financial services', 'credit', 'lending', 'treasury', 'wealth management'],
  },
  {
    industry: 'Insurance',
    domainPatterns: ['metlife.com', 'prudential.com', 'allstate.com', 'statefarm.com', 'aig.com', 'manulife.com', 'sunlife.com', 'intact.ca'],
    keywords: ['insurance', 'underwriting', 'claims', 'actuarial', 'risk assessment', 'policy'],
  },
  {
    industry: 'Real Estate / PropTech',
    domainPatterns: ['zillow.com', 'redfin.com', 'cbre.com', 'cushmanwakefield.com', 'colliers.com'],
    keywords: ['real estate', 'property', 'proptech', 'leasing', 'facilities', 'building management'],
  },
  {
    industry: 'Construction / Engineering',
    domainPatterns: ['bechtel.com', 'fluor.com', 'jacobs.com', 'aecom.com'],
    keywords: ['construction', 'engineering', 'project management', 'infrastructure', 'building', 'site management'],
  },
  {
    industry: 'Telecommunications',
    domainPatterns: ['verizon.com', 'att.com', 't-mobile.com', 'vodafone.com', 'bell.ca', 'telus.com', 'rogers.com'],
    keywords: ['telecom', 'telecommunications', 'network', '5g', 'wireless', 'carrier'],
  },
  {
    industry: 'Travel / Transportation',
    domainPatterns: ['delta.com', 'united.com', 'marriott.com', 'hilton.com', 'expedia.com', 'aircanada.com'],
    keywords: ['travel', 'hospitality', 'airline', 'hotel', 'booking', 'passenger'],
  },
  {
    industry: 'Education / EdTech',
    domainPatterns: ['coursera.org', 'coursera.com', 'udemy.com', 'blackboard.com', 'instructure.com', '.edu'],
    keywords: ['education', 'edtech', 'learning', 'university', 'school', 'training platform'],
  },
  {
    industry: 'Agriculture / Agritech',
    domainPatterns: ['johndeere.com', 'deere.com', 'cargill.com', 'monsanto.com', 'syngenta.com'],
    keywords: ['agriculture', 'agritech', 'farming', 'crop', 'livestock', 'precision agriculture'],
  },
  {
    industry: 'Government / Public Sector',
    // canada.ca is the Government of Canada's primary domain and carries no
    // .gc.ca suffix, so it has to be listed explicitly.
    domainPatterns: ['.gov', '.gc.ca', '.mil', 'canada.ca', 'gouv.qc.ca', 'ontario.ca'],
    keywords: ['government', 'public sector', 'municipality', 'federal', 'state', 'civic'],
  },
  {
    industry: 'Software / Enterprise SaaS',
    domainPatterns: ['salesforce.com', 'sap.com', 'oracle.com', 'microsoft.com', 'workday.com', 'servicenow'],
    keywords: ['enterprise software', 'saas', 'cloud platform', 'erp', 'crm', 'enterprise solution'],
  },
];

/**
 * Classify a company into an industry based on domain and content
 */
export function classifyIndustry(domain: string, content?: string): Industry {
  const normalizedDomain = domain.toLowerCase();
  const normalizedContent = (content || '').toLowerCase();

  // First pass: exact domain matches
  for (const pattern of industryPatterns) {
    for (const domainPattern of pattern.domainPatterns) {
      if (normalizedDomain.includes(domainPattern)) {
        console.log(`[IndustryClassifier] Matched domain pattern: ${domainPattern} → ${pattern.industry}`);
        return pattern.industry;
      }
    }
  }

  // Second pass: keyword matching in content
  const scores: Array<{ industry: Industry; score: number }> = [];
  
  for (const pattern of industryPatterns) {
    let score = 0;
    
    for (const keyword of pattern.keywords) {
      const keywordCount = (normalizedContent.match(new RegExp(keyword, 'g')) || []).length;
      score += keywordCount;
    }
    
    // Check exclusions
    if (pattern.exclusions) {
      for (const exclusion of pattern.exclusions) {
        if (normalizedContent.includes(exclusion)) {
          score -= 10;
        }
      }
    }
    
    if (score > 0) {
      scores.push({ industry: pattern.industry, score });
    }
  }
  
  // Sort by score and return highest
  scores.sort((a, b) => b.score - a.score);
  
  if (scores.length > 0 && scores[0].score > 2) {
    console.log(`[IndustryClassifier] Keyword match: ${scores[0].industry} (score: ${scores[0].score})`);
    return scores[0].industry;
  }

  // Default fallback
  console.log('[IndustryClassifier] No match found, defaulting to Software / Enterprise SaaS');
  return 'Software / Enterprise SaaS';
}

/**
 * Get allowed twin types for an industry
 */
export function getAllowedTwinTypes(industry: Industry): string[] {
  const mapping: Record<Industry, string[]> = {
    'Enterprise Retail': [
      'Supply Chain & Inventory',
      'Warehouse / DC Operations',
      'Store Operations & Workforce',
      'Logistics & Last Mile',
      'Loss Prevention',
      'Forecasting & Replenishment',
      'ESG & Sustainability',
    ],
    'Fashion / Apparel Retail': [
      'Supply Chain & Inventory',
      'Warehouse Operations',
      'Store Operations',
      'Demand Forecasting',
      'Returns & Reverse Logistics',
    ],
    'Grocery & Food Retail': [
      'Supply Chain & Inventory',
      'Cold Chain Management',
      'Store Operations',
      'Waste Reduction',
      'Freshness Optimization',
    ],
    'Logistics / Supply Chain / 3PL': [
      'Fleet Management',
      'Route Optimization',
      'Warehouse Operations',
      'Freight Matching',
      'Last Mile Delivery',
    ],
    'Manufacturing – Automotive': [
      'Production Line Optimization',
      'Quality Control',
      'Supply Chain',
      'Predictive Maintenance',
      'Assembly Planning',
    ],
    'Manufacturing – Industrial': [
      'Equipment Maintenance',
      'Production Scheduling',
      'Quality Assurance',
      'Energy Optimization',
      'Safety Monitoring',
    ],
    'Manufacturing – Consumer Goods': [
      'Production Planning',
      'Supply Chain',
      'Quality Control',
      'Packaging Optimization',
      'Distribution',
    ],
    'Energy / Utilities': [
      'Grid Management',
      'Asset Maintenance',
      'Demand Forecasting',
      'Outage Response',
      'Renewable Integration',
    ],
    'Healthcare / Hospitals': [
      'Patient Flow',
      'Staffing Optimization',
      'Bed Management',
      'Surgical Scheduling',
      'Supply Chain',
    ],
    'Pharmaceuticals & Life Sciences': [
      'GxP Compliance',
      'Clinical Trial Management',
      'Manufacturing Optimization',
      'Supply Chain',
      'Regulatory Tracking',
    ],
    'Financial Services / Banking': [
      'Credit Risk',
      'Fraud Detection',
      'Trading Operations',
      'Compliance Monitoring',
      'Customer Onboarding',
    ],
    'Insurance': [
      'Underwriting Automation',
      'Claims Processing',
      'Risk Assessment',
      'Fraud Detection',
      'Policy Management',
    ],
    'Real Estate / PropTech': [
      'Facility Management',
      'Lease Management',
      'Energy Optimization',
      'Maintenance Scheduling',
      'Tenant Services',
    ],
    'Construction / Engineering': [
      'Project Management',
      'Resource Allocation',
      'Safety Monitoring',
      'Equipment Tracking',
      'Cost Control',
    ],
    'Telecommunications': [
      'Network Optimization',
      'Capacity Planning',
      'Outage Management',
      'Customer Experience',
      'Infrastructure Planning',
    ],
    'Travel / Transportation': [
      'Fleet Management',
      'Route Optimization',
      'Booking Optimization',
      'Customer Service',
      'Revenue Management',
    ],
    'Education / EdTech': [
      'Enrollment Management',
      'Learning Analytics',
      'Resource Allocation',
      'Student Success',
      'Curriculum Optimization',
    ],
    'Agriculture / Agritech': [
      'Crop Management',
      'Equipment Maintenance',
      'Yield Optimization',
      'Supply Chain',
      'Weather Integration',
    ],
    'Government / Public Sector': [
      'Service Delivery',
      'Resource Allocation',
      'Compliance Tracking',
      'Infrastructure Management',
      'Citizen Services',
    ],
    'Software / Enterprise SaaS': [
      'Product Operations',
      'Customer Success',
      'Engineering Velocity',
      'Sales Operations',
      'Support Automation',
    ],
  };

  return mapping[industry] || [];
}

/**
 * Get blocked twin types for an industry
 */
export function getBlockedTwinTypes(industry: Industry): string[] {
  // Enterprise retail blocks pure CX/marketing personalization
  if (industry === 'Enterprise Retail' || industry === 'Fashion / Apparel Retail' || industry === 'Grocery & Food Retail') {
    return [
      'Customer Personalization',
      'Marketing Automation',
      'Loyalty Optimization',
      'Customer Journey Mapping',
    ];
  }

  // B2B industries block consumer-focused initiatives
  if (industry === 'Software / Enterprise SaaS' || industry === 'Financial Services / Banking' || industry === 'Pharmaceuticals & Life Sciences') {
    return [
      'Consumer Marketing',
      'Social Media Marketing',
      'Brand Awareness',
    ];
  }

  return [];
}
