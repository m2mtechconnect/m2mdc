// Registry of Canadian funding sources with scraper configurations

import { ScraperConfig } from './types';

export const FUNDING_SOURCES: Record<string, ScraperConfig> = {
  scaleai: {
    name: 'Scale AI',
    baseUrl: 'https://www.scaleai.ca',
    enabled: true,
    rateLimit: 2000,
    selectors: {
      programName: 'h1, h2.program-title',
      description: '.program-description, .content-section',
      fundingAmount: '.funding-amount, .grant-value',
    },
    jurisdiction: 'Federal',
    agency: 'Scale AI (AI-Powered Supply Chains Supercluster)',
    defaultFocusAreas: ['AI', 'Supply Chain', 'Manufacturing', 'Digital Transformation'],
    defaultFundingType: ['Grant', 'Contribution'],
  },
  
  irap: {
    name: 'NRC IRAP',
    baseUrl: 'https://nrc.canada.ca/en/support-technology-innovation/about-nrc-irap',
    enabled: true,
    rateLimit: 2000,
    selectors: {
      programName: 'h1, .program-title',
      description: '.field-body, .program-content',
      fundingAmount: '.funding-info',
    },
    jurisdiction: 'Federal',
    agency: 'National Research Council - Industrial Research Assistance Program',
    defaultFocusAreas: ['Innovation', 'Technology', 'R&D', 'Digital', 'AI'],
    defaultFundingType: ['Grant', 'Advisory Services'],
  },
  
  ngen: {
    name: 'NGen',
    baseUrl: 'https://www.ngen.ca',
    enabled: true,
    rateLimit: 2000,
    selectors: {
      programName: 'h1, h2.project-title',
      description: '.project-description, .content',
      fundingAmount: '.funding-details',
    },
    jurisdiction: 'Federal',
    agency: 'Next Generation Manufacturing Canada',
    defaultFocusAreas: ['Advanced Manufacturing', 'Industry 4.0', 'Digital Manufacturing', 'AI'],
    defaultFundingType: ['Contribution', 'Co-investment'],
  },
  
  cdap: {
    name: 'CDAP',
    baseUrl: 'https://www.ic.gc.ca/eic/site/152.nsf/eng/home',
    enabled: true,
    rateLimit: 2000,
    selectors: {
      programName: 'h1',
      description: '.content-section',
    },
    jurisdiction: 'Federal',
    agency: 'Innovation, Science and Economic Development Canada - Canada Digital Adoption Program',
    defaultFocusAreas: ['Digital Transformation', 'E-commerce', 'Technology Adoption'],
    defaultFundingType: ['Grant', 'Interest-free Loan'],
  },
  
  sdtc: {
    name: 'SDTC',
    baseUrl: 'https://www.sdtc.ca',
    enabled: true,
    rateLimit: 2000,
    selectors: {
      programName: 'h1, .program-title',
      description: '.program-info',
    },
    jurisdiction: 'Federal',
    agency: 'Sustainable Development Technology Canada',
    defaultFocusAreas: ['Cleantech', 'Sustainability', 'Climate Tech', 'Innovation'],
    defaultFundingType: ['Grant', 'Contribution'],
  },
  
  feddevOntario: {
    name: 'FedDev Ontario',
    baseUrl: 'https://www.feddevontario.gc.ca',
    enabled: true,
    rateLimit: 2000,
    selectors: {
      programName: 'h1',
      description: '.program-description',
    },
    jurisdiction: 'Regional',
    province: 'Ontario',
    agency: 'Federal Economic Development Agency for Southern Ontario',
    defaultFocusAreas: ['Regional Development', 'Innovation', 'Business Growth', 'Digital'],
    defaultFundingType: ['Grant', 'Repayable Contribution'],
  },
  
  investQuebec: {
    name: 'Investissement Québec',
    baseUrl: 'https://www.investquebec.com',
    enabled: true,
    rateLimit: 2000,
    selectors: {
      programName: 'h1, h2',
      description: '.program-content',
    },
    jurisdiction: 'Provincial',
    province: 'Quebec',
    agency: 'Investissement Québec',
    defaultFocusAreas: ['Innovation', 'Technology', 'Digital Transformation', 'AI'],
    defaultFundingType: ['Loan', 'Grant', 'Equity', 'Tax Credit'],
  },
};

// Helper to get enabled sources
export const getEnabledSources = (): ScraperConfig[] => {
  return Object.values(FUNDING_SOURCES).filter(source => source.enabled);
};

// Helper to get source by name
export const getSourceByName = (name: string): ScraperConfig | undefined => {
  return FUNDING_SOURCES[name];
};
