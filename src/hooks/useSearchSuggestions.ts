import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SuggestionType = 'url_scan' | 'agent' | 'template' | 'copilot_prompt' | 'generic_example';

export interface SearchSuggestion {
  id: string;
  type: SuggestionType;
  label: string; // SHORT: 2-6 words for UI display
  question: string; // FULL prompt to send to Co-Pilot
  score: number;
}

interface UseSearchSuggestionsOptions {
  pageContext?: string;
  query?: string;
  enabled?: boolean;
}

export function useSearchSuggestions({
  pageContext = 'dashboard',
  query = '',
  enabled = true,
}: UseSearchSuggestionsOptions = {}) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('search-suggestions', {
        body: { pageContext, query },
      });

      if (fetchError) throw fetchError;

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (err: any) {
      console.error('[useSearchSuggestions] Error:', err);
      setError(err.message || 'Failed to fetch suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [pageContext, query, enabled]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const refreshSuggestions = () => {
    fetchSuggestions();
  };

  return {
    suggestions,
    isLoading,
    error,
    refreshSuggestions,
  };
}
