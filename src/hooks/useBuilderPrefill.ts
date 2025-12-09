import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRBAC } from '@/contexts/RBACContext';

interface PrefillData {
  capturedPageId?: string;
  action?: string;
  templateId?: string;
  knowledgeSourceIds?: string[];
  connectors?: Record<string, string>;
  workflowNodes?: any[];
  department?: string;
  industry?: string;
  contentType?: string;
  // From AI recommendations
  systemName?: string;
  outcome?: string;
  successMetric?: string;
  recommendationData?: any;
}

interface BuilderState {
  systemName: string;
  department: string;
  outcome: string;
  successMetric: string;
  selectedTemplate: string | null;
  geminiEnabled: boolean;
  vertexEnabled: boolean;
  hybridSearch: boolean;
  topK: number;
  topN: number;
  temperature: number;
  systemPrompt: string;
  connectors: Record<string, string>;
  workflowNodes: any[];
  recommendationData?: any;
}

interface PrefillResult {
  data: Partial<BuilderState> | null;
  loading: boolean;
  error: string | null;
  metadata: {
    prefillApplied: boolean;
    fieldsUpdated: string[];
    dataSource: string;
  };
}

/**
 * Hook to fetch and apply DB-aware prefill data for the Builder
 * Preserves user edits, enforces RBAC, ensures idempotency
 */
export function useBuilderPrefill(
  prefillData: PrefillData | null,
  currentState: BuilderState,
  systemId: string | null
): PrefillResult {
  const { userId, hasAccess } = useRBAC();
  const [result, setResult] = useState<PrefillResult>({
    data: null,
    loading: false,
    error: null,
    metadata: {
      prefillApplied: false,
      fieldsUpdated: [],
      dataSource: 'none'
    }
  });

  useEffect(() => {
    if (!prefillData || !userId) return;

    // Check idempotency: don't re-apply if already applied
    const prefillKey = `prefill_${prefillData.capturedPageId}_${prefillData.action}`;
    const alreadyApplied = sessionStorage.getItem(prefillKey);
    
    if (alreadyApplied) {
      setResult(prev => ({
        ...prev,
        metadata: { ...prev.metadata, prefillApplied: false }
      }));
      return;
    }

    fetchAndApplyPrefill();

    async function fetchAndApplyPrefill() {
      setResult(prev => ({ ...prev, loading: true, error: null }));

      try {
        // RBAC check
        if (!hasAccess(['executive', 'manager', 'engineer'])) {
          throw new Error('Insufficient permissions');
        }

        const updates: Partial<BuilderState> = {};
        const fieldsUpdated: string[] = [];

        // Handle direct field prefills from recommendations or templates
        if (prefillData!.systemName && !currentState.systemName) {
          updates.systemName = prefillData!.systemName;
          fieldsUpdated.push('systemName');
        }

        if (prefillData!.department && !currentState.department) {
          updates.department = prefillData!.department;
          fieldsUpdated.push('department');
        }

        if (prefillData!.outcome && !currentState.outcome) {
          updates.outcome = prefillData!.outcome;
          fieldsUpdated.push('outcome');
        }

        if (prefillData!.successMetric && !currentState.successMetric) {
          updates.successMetric = prefillData!.successMetric;
          fieldsUpdated.push('successMetric');
        }

        // Store recommendation data for later use (e.g., in AI summary)
        if (prefillData!.recommendationData) {
          (updates as any).recommendationData = prefillData!.recommendationData;
          fieldsUpdated.push('recommendationData');
        }

        // Fetch captured page data if pageId provided
        if (prefillData!.capturedPageId) {
          const { data: page, error: pageError } = await supabase
            .from('captured_pages')
            .select(`
              *,
              page_classifications (*),
              page_summaries (*)
            `)
            .eq('id', prefillData!.capturedPageId)
            .eq('user_id', userId)
            .maybeSingle();

          if (pageError) throw pageError;
          
          if (!page) {
            console.warn('No captured page found for prefill');
            return {
              data: {},
              metadata: {
                prefillApplied: false,
                fieldsUpdated: [],
                source: 'none'
              }
            };
          }

          if (page) {
            // Only fill empty fields
            if (!currentState.systemName && page.title) {
              updates.systemName = `${page.title} Assistant`;
              fieldsUpdated.push('systemName');
            }

            // Apply classification data
            if (page.page_classifications?.[0]) {
              const classification = page.page_classifications[0];
              
              if (!currentState.department && classification.department) {
                updates.department = classification.department;
                fieldsUpdated.push('department');
              }

              // Suggest outcome based on content type
              if (!currentState.outcome) {
                const outcomeMap: Record<string, string> = {
                  'Policy': 'Compliance',
                  'KB': 'Conversational',
                  'Docs': 'Conversational',
                  'Product': 'Conversational',
                  'Pricing': 'Automation'
                };
                updates.outcome = outcomeMap[classification.content_type] || 'Conversational';
                fieldsUpdated.push('outcome');
              }
            }

            // Apply summary for system prompt if empty
            if (!currentState.systemPrompt && page.page_summaries?.[0]) {
              const summary = page.page_summaries[0];
              updates.systemPrompt = `You are an AI assistant specialized in ${page.title}. 

Key context:
${summary.bullets?.slice(0, 3).map((b: string) => `- ${b}`).join('\n')}

Provide accurate, grounded responses based on the knowledge base.`;
              fieldsUpdated.push('systemPrompt');
            }
          }
        }

        // Apply template if provided and not already set
        if (prefillData!.templateId && !currentState.selectedTemplate) {
          updates.selectedTemplate = prefillData!.templateId;
          fieldsUpdated.push('selectedTemplate');
        }

        // Append connectors (don't overwrite existing ones)
        if (prefillData!.connectors) {
          const mergedConnectors = { ...currentState.connectors };
          let connectorsUpdated = false;

          Object.entries(prefillData!.connectors).forEach(([key, value]) => {
            if (!mergedConnectors[key] || mergedConnectors[key] === 'disconnected') {
              mergedConnectors[key] = value;
              connectorsUpdated = true;
            }
          });

          if (connectorsUpdated) {
            updates.connectors = mergedConnectors;
            fieldsUpdated.push('connectors');
          }
        }

        // Append workflow nodes (don't overwrite)
        if (prefillData!.workflowNodes && prefillData!.workflowNodes.length > 0) {
          const existingNodeIds = new Set(
            currentState.workflowNodes.map((n: any) => n.id)
          );
          const newNodes = prefillData!.workflowNodes.filter(
            (n: any) => !existingNodeIds.has(n.id)
          );

          if (newNodes.length > 0) {
            updates.workflowNodes = [...currentState.workflowNodes, ...newNodes];
            fieldsUpdated.push('workflowNodes');
          }
        }

        // Fetch existing knowledge sources for reference
        if (prefillData!.capturedPageId) {
          const { data: knowledgeSources } = await supabase
            .from('knowledge_sources')
            .select('*')
            .eq('page_id', prefillData!.capturedPageId)
            .eq('user_id', userId);

          if (knowledgeSources && knowledgeSources.length > 0) {
            // Store IDs for later use in step 3
            updates.connectors = {
              ...updates.connectors,
              __knowledgeSourceIds: knowledgeSources.map(k => k.id).join(',')
            };
          }
        }

        // Mark as applied in session
        if (prefillData!.capturedPageId && prefillData!.action) {
          sessionStorage.setItem(prefillKey, 'true');
        }

        setResult({
          data: Object.keys(updates).length > 0 ? updates : null,
          loading: false,
          error: null,
          metadata: {
            prefillApplied: fieldsUpdated.length > 0,
            fieldsUpdated,
            dataSource: prefillData!.capturedPageId ? 'captured_page' : 'direct'
          }
        });

      } catch (error) {
        console.error('[useBuilderPrefill] Error:', error);
        setResult({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch prefill data',
          metadata: {
            prefillApplied: false,
            fieldsUpdated: [],
            dataSource: 'error'
          }
        });
      }
    }
  }, [prefillData, userId, hasAccess]);

  return result;
}
