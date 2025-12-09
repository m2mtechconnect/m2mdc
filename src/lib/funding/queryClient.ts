// Client for querying funding programs from the frontend

import { supabase } from '@/integrations/supabase/client';
import { FundingProgram } from './types';

export interface FundingQueryParams {
  jurisdiction?: 'Federal' | 'Provincial' | 'Regional' | 'Municipal';
  province?: string;
  focus?: string;
  status?: 'Open' | 'Closed' | 'Upcoming' | 'Continuous' | 'Unknown';
  fundingType?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
}

export interface FundingQueryResult {
  success: boolean;
  count: number;
  programs: FundingProgram[];
  error?: string;
}

/**
 * Query funding programs from the database
 */
export const queryFundingPrograms = async (
  params: FundingQueryParams = {}
): Promise<FundingQueryResult> => {
  try {
    let query = supabase
      .from('funding_programs')
      .select('*')
      .order('last_updated', { ascending: false });

    // Apply filters
    if (params.jurisdiction) {
      query = query.eq('jurisdiction', params.jurisdiction);
    }

    if (params.province) {
      query = query.eq('province', params.province);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.focus) {
      query = query.contains('focus_areas', [params.focus]);
    }

    if (params.fundingType) {
      query = query.contains('funding_type', [params.fundingType]);
    }

    if (params.minAmount) {
      query = query.gte('funding_amount_min', params.minAmount);
    }

    if (params.maxAmount) {
      query = query.lte('funding_amount_max', params.maxAmount);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error querying funding programs:', error);
      return {
        success: false,
        count: 0,
        programs: [],
        error: error.message,
      };
    }

    return {
      success: true,
      count: data?.length || 0,
      programs: (data as FundingProgram[]) || [],
    };
  } catch (error) {
    console.error('Exception querying funding programs:', error);
    return {
      success: false,
      count: 0,
      programs: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get funding programs relevant to specific focus areas (for recommendation engine)
 */
export const getFundingForFocusAreas = async (
  focusAreas: string[],
  options: {
    status?: 'Open' | 'Continuous';
    limit?: number;
  } = {}
): Promise<FundingProgram[]> => {
  try {
    // Query for each focus area and combine results
    const promises = focusAreas.map(async (focus) => {
      const result = await queryFundingPrograms({
        focus,
        status: options.status || 'Open',
        limit: options.limit || 10,
      });
      return result.programs;
    });

    const results = await Promise.all(promises);
    const allPrograms = results.flat();

    // Deduplicate by URL
    const uniquePrograms = allPrograms.reduce((acc, program) => {
      if (!acc.find((p) => p.url === program.url)) {
        acc.push(program);
      }
      return acc;
    }, [] as FundingProgram[]);

    return uniquePrograms;
  } catch (error) {
    console.error('Error getting funding for focus areas:', error);
    return [];
  }
};

/**
 * Trigger funding scraper to refresh data
 */
export const triggerFundingScraper = async (): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('funding-scraper', {
      body: { action: 'scan' },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: `Scraper completed: ${data.programs_found} programs found`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get scraper logs
 */
export const getScraperLogs = async (limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .from('scraper_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching scraper logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching scraper logs:', error);
    return [];
  }
};
