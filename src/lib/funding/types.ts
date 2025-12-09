// Funding program types and interfaces

export interface FundingProgram {
  id?: string;
  program_name: string;
  agency: string;
  jurisdiction: 'Federal' | 'Provincial' | 'Regional' | 'Municipal';
  province?: string;
  url: string;
  focus_areas: string[];
  funding_type: string[];
  funding_amount_min?: number;
  funding_amount_max?: number;
  status: 'Open' | 'Closed' | 'Upcoming' | 'Continuous' | 'Unknown';
  eligibility_summary?: string;
  description?: string;
  last_scraped_at?: string;
  last_updated?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface ScraperConfig {
  name: string;
  baseUrl: string;
  enabled: boolean;
  rateLimit: number; // ms between requests
  selectors: {
    listContainer?: string;
    programName: string;
    programUrl?: string;
    description?: string;
    status?: string;
    fundingAmount?: string;
  };
  pagination?: {
    nextButton?: string;
    maxPages?: number;
  };
  jurisdiction: FundingProgram['jurisdiction'];
  province?: string;
  agency: string;
  defaultFocusAreas: string[];
  defaultFundingType: string[];
}

export interface ScraperResult {
  success: boolean;
  programsFound: number;
  programsInserted: number;
  programsUpdated: number;
  programsSkipped: number;
  errors: string[];
  programs: FundingProgram[];
}

export interface ScraperLog {
  id?: string;
  source_name: string;
  status: 'running' | 'success' | 'failed' | 'partial';
  programs_found: number;
  programs_inserted: number;
  programs_updated: number;
  programs_skipped: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  metadata?: Record<string, any>;
}
