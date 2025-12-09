import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './useDebounce';

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  config?: any;
}

export interface WorkflowEdge {
  id: string;
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
  toPort: string;
}

export interface NodeSuggestion {
  nodeType: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface OptimizationTip {
  tip: string;
  impact: 'high' | 'medium' | 'low';
}

export interface WorkflowSuggestions {
  nextNodes: NodeSuggestion[];
  optimizationTips: OptimizationTip[];
  healthScore: number;
  summary: string;
}

export function useWorkflowSuggestions(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  enabled: boolean = true
) {
  const [suggestions, setSuggestions] = useState<WorkflowSuggestions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce workflow changes to avoid excessive API calls - increased to 5 seconds
  const debouncedNodes = useDebounce(nodes, 5000);
  const debouncedEdges = useDebounce(edges, 5000);

  const fetchSuggestions = useCallback(async () => {
    if (!enabled || debouncedNodes.length === 0) {
      setSuggestions(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'workflow-ai-suggestions',
        {
          body: {
            nodes: debouncedNodes,
            edges: debouncedEdges
          }
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuggestions(data);
    } catch (err) {
      console.error('Error fetching workflow suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
      setSuggestions(null);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedNodes, debouncedEdges, enabled]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const refresh = useCallback(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return {
    suggestions,
    isLoading,
    error,
    refresh
  };
}
