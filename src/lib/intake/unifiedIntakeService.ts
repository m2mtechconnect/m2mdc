/**
 * Unified Intake Service
 * SINGLE entry point for all intake flows (URL, file, questionnaire, template)
 * 
 * This service ensures consistent behavior across all intake methods:
 * - Dashboard search bar (URL input)
 * - File upload wizard (document analysis)
 * - Questionnaire wizard
 * - Template selection (dashboard or marketplace)
 * - In-builder file upload (Step 2)
 */

import { AgentBlueprint } from '@/types/agentBlueprint';
import { UnifiedIntakePayload, IntakeResult } from './types';
import { createBuilderSession, updateBuilderSession, getBuilderSession } from './sessionManager';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { trackIntakeComplete, trackBuilderOpened } from '@/lib/analytics/intakeTracking';
import { templateToBlueprint } from '@/lib/builder/templateToBlueprint';
import { documentAnalysisToBlueprint } from '@/lib/builder/documentToBlueprint';
import { questionnaireToBlueprint } from '@/lib/builder/questionnaireToBlueprint';
import { supabase } from '@/integrations/supabase/client';
import { loadTemplateById } from '@/lib/templates/unifiedTemplateService';
import { recommendTemplatesFromContent, recommendTemplatesFromDocument } from './templateRecommendations';

/**
 * Convert intake payload to AgentBlueprint based on source
 */
async function convertToBlueprint(payload: UnifiedIntakePayload): Promise<AgentBlueprint> {
  console.log('[UnifiedIntake] Converting payload to blueprint:', {
    source: payload.source,
    templateId: payload.templateId,
    fileJobId: payload.fileJobId,
  });

  switch (payload.source) {
    case 'template': {
      if (!payload.templateId) {
        throw new Error('templateId required for template source');
      }

      // Load from unified template service (single source of truth)
      const template = await loadTemplateById(payload.templateId);
      
      if (!template) {
        throw new Error(`Template not found: ${payload.templateId}`);
      }

      console.log('[UnifiedIntake] Found template:', template.name);
      return templateToBlueprint(template, payload.metadata?.sourceEntry || 'marketplace');
    }

    case 'file': {
      if (!payload.fileJobId) {
        throw new Error('fileJobId required for file source');
      }

      // Fetch document analysis result
      const { data: analysisJob, error } = await supabase
        .from('document_analysis_jobs')
        .select('*')
        .eq('id', payload.fileJobId)
        .single();

      if (error || !analysisJob) {
        throw new Error(`Document analysis job not found: ${payload.fileJobId}`);
      }

      if (analysisJob.status !== 'completed') {
        throw new Error(`Document analysis not complete (status: ${analysisJob.status})`);
      }

      const analysisResult = analysisJob.result as any;
      
      // Check if document analysis suggests data centre use case
      const recommendations = recommendTemplatesFromDocument({
        industry: analysisResult.detected_industry,
        department: analysisResult.detected_department,
        keywords: analysisResult.extracted_keywords,
        summary: analysisResult.summary,
      });
      
      // If Data Centre is recommended with high confidence, use it instead
      const dcRecommendation = recommendations.find(r => r.templateId === 'sovereign-data-center-twin');
      if (dcRecommendation && dcRecommendation.confidence > 0.7) {
        console.log(`[UnifiedIntake] Document analysis suggests Data Centre template (confidence: ${dcRecommendation.confidence})`);
        console.log(`[UnifiedIntake] Reason: ${dcRecommendation.reason}`);
        
        // Load Data Centre template and enrich with document data
        const dcTemplate = await loadTemplateById('sovereign-data-center-twin');
        if (dcTemplate) {
          const dcBlueprint = templateToBlueprint(dcTemplate, 'dashboard');
          
          // Enrich with document-specific data
          dcBlueprint.knowledge.documents = [analysisJob.file_name];
          dcBlueprint.knowledge.summary = analysisResult.summary;
          
          return dcBlueprint;
        }
      }
      
      return documentAnalysisToBlueprint(analysisResult, analysisJob.file_name);
    }

    case 'questionnaire': {
      if (!payload.questionnaireAnswers) {
        throw new Error('questionnaireAnswers required for questionnaire source');
      }

      return questionnaireToBlueprint(payload.questionnaireAnswers as any);
    }

    case 'url': {
      if (!payload.urlInput) {
        throw new Error('urlInput required for URL source');
      }

      console.log('[UnifiedIntake] Analyzing URL:', payload.urlInput);
      
      // Quick keyword check for data centre sites
      const urlLower = payload.urlInput.toLowerCase();
      const isDataCentreSite = urlLower.includes('datacent') || 
                               urlLower.includes('data-cent') ||
                               urlLower.includes('colocation') ||
                               urlLower.includes('cloud') ||
                               urlLower.includes('compute') ||
                               urlLower.includes('gpu');
      
      if (isDataCentreSite) {
        console.log('[UnifiedIntake] Data centre-related URL detected, loading DC template');
        const dcTemplate = await loadTemplateById('sovereign-data-center-twin');
        if (dcTemplate) {
          const dcBlueprint = templateToBlueprint(dcTemplate, 'dashboard');
          dcBlueprint.knowledge.urls.push(payload.urlInput);
          return dcBlueprint;
        }
      }
      
      // Check if we have recommendation metadata (from URL recommendations flow)
      const hasRecommendation = payload.metadata?.recommendationId;
      
      if (hasRecommendation) {
        console.log('[UnifiedIntake] Building from URL recommendation:', payload.metadata.recommendationTitle);
        
        // Build rich blueprint from recommendation data
        return {
          source: 'url',
          name: payload.metadata.recommendationTitle || `Agent for ${new URL(payload.urlInput).hostname}`,
          description: payload.metadata.recommendationDescription || `AI agent based on ${payload.urlInput}`,
          goals: [
            payload.metadata.problemOverview || `Assist with ${payload.metadata.recommendationTitle}`,
            ...(payload.metadata.nextSteps || [])
          ],
          industry: payload.metadata.industry || 'General',
          department: payload.metadata.department || 'Operations',
          expectedRoi: payload.metadata.potentialRoiPercent ? `${payload.metadata.potentialRoiPercent}%` : null,
          timeSavedPerWeek: payload.metadata.timeToValueWeeks ? `${payload.metadata.timeToValueWeeks} weeks` : null,
          efficiencyGain: payload.metadata.expectedEfficiencyLift || null,
          model: {
            provider: 'gemini',
            modelName: 'google/gemini-2.5-flash',
            temperature: 0.7,
          },
          knowledge: {
            documents: [],
            urls: [payload.urlInput],
            cloudDrives: {},
            summary: payload.metadata.whyThisMatters || payload.metadata.recommendationDescription,
          },
          behavior: {
            systemPrompt: `You are ${payload.metadata.recommendationTitle}. ${payload.metadata.problemOverview || ''}\n\n${payload.metadata.whyThisMatters || ''}`,
            communicationStyle: {
              formal: true,
              detailedExplanations: true,
            },
            safety: {
              hallucinationPrevention: true,
              requireCitations: true,
            },
          },
          tools: {
            recommendedIntegrations: payload.metadata.recommendedTools || [],
            preselectedIntegrations: [],
            customApis: [],
          },
          workflow: {
            templateType: 'auto',
            triggers: ['user_request'],
            actions: payload.metadata.nextSteps?.map((step: string, idx: number) => ({
              id: `action-${idx}`,
              type: 'process',
              name: step,
            })) || [],
            integrations: [],
          },
          tags: payload.metadata.tags || [],
        };
      }
      
      // Otherwise, try URL analysis
      // Call url-turbo-capture to analyze the website
      try {
        const urlParams = new URLSearchParams({ url: payload.urlInput });
        const { data: captureData, error: captureError } = await supabase.functions.invoke(
          `url-turbo-capture?${urlParams.toString()}`,
          {
            method: 'GET',
          }
        );

        if (captureError) {
          console.error('[UnifiedIntake] URL capture failed:', captureError);
          throw new Error(`Failed to analyze URL: ${captureError.message}`);
        }

        console.log('[UnifiedIntake] URL analysis complete');

        // Extract insights from capture result
        const snapshot = captureData?.snapshot || {};
        const siteName = snapshot.title || new URL(payload.urlInput).hostname;
        const siteDescription = snapshot.description || `AI assistant for ${payload.urlInput}`;
        
        // Check if captured content suggests data centre / infrastructure
        const recommendations = recommendTemplatesFromContent({
          text: snapshot.content,
          keywords: captureData?.keywords || [],
          url: payload.urlInput,
        });
        
        const dcRecommendation = recommendations.find(r => r.templateId === 'DATA_CENTRE_DIGITAL_TWIN');
        if (dcRecommendation && dcRecommendation.confidence > 0.6) {
          console.log(`[UnifiedIntake] URL content suggests Data Centre template (confidence: ${dcRecommendation.confidence})`);
          const dcTemplate = await loadTemplateById('DATA_CENTRE_DIGITAL_TWIN');
          if (dcTemplate) {
            const dcBlueprint = templateToBlueprint(dcTemplate, 'marketplace');
            dcBlueprint.knowledge.urls.push(payload.urlInput);
            dcBlueprint.knowledge.summary = `Website content analyzed from ${payload.urlInput}: ${snapshot.description}`;
            return dcBlueprint;
          }
        }
        
        return {
          source: 'url',
          name: `${siteName} Assistant`,
          description: siteDescription,
          goals: [`Assist with information about ${siteName}`, 'Answer questions using website content'],
          industry: captureData?.industryGuess || 'General',
          department: 'Operations',
          model: {
            provider: 'gemini',
            modelName: 'google/gemini-2.5-flash',
            temperature: 0.7,
          },
          knowledge: {
            documents: [],
            urls: [payload.urlInput],
            cloudDrives: {},
            summary: snapshot.content ? `Website content analyzed from ${payload.urlInput}` : null,
          },
          behavior: {
            systemPrompt: `You are an AI assistant for ${siteName}. Use the provided website content to answer questions accurately and helpfully.`,
            communicationStyle: {
              formal: true,
              detailedExplanations: true,
            },
            safety: {
              hallucinationPrevention: true,
              requireCitations: true,
            },
          },
          tools: {
            recommendedIntegrations: [],
            preselectedIntegrations: [],
            customApis: [],
          },
          workflow: {
            templateType: 'auto',
            triggers: ['user_query'],
            actions: ['search_knowledge', 'generate_response'],
            integrations: [],
          },
        };
      } catch (error) {
        console.error('[UnifiedIntake] URL analysis error:', error);
        
        // Fallback to basic blueprint if analysis fails
        const hostname = new URL(payload.urlInput).hostname;
        return {
          source: 'url',
          name: `Assistant for ${hostname}`,
          description: `AI agent for ${payload.urlInput}`,
          goals: [`Assist with ${payload.urlInput}`],
          model: {
            provider: 'gemini',
            modelName: 'google/gemini-2.5-flash',
            temperature: 0.7,
          },
          knowledge: {
            documents: [],
            urls: [payload.urlInput],
            cloudDrives: {},
          },
          behavior: {
            systemPrompt: `You are an AI assistant that helps with information from ${payload.urlInput}`,
            communicationStyle: {},
            safety: {
              hallucinationPrevention: true,
              requireCitations: true,
            },
          },
          tools: {
            recommendedIntegrations: [],
            preselectedIntegrations: [],
            customApis: [],
          },
          workflow: {
            templateType: 'auto',
            triggers: [],
            actions: [],
            integrations: [],
          },
        };
      }
    }

    default:
      throw new Error(`Unsupported intake source: ${payload.source}`);
  }
}

/**
 * MAIN ENTRY POINT: Start builder from any intake flow
 * 
 * This is the single function that all intake flows must call.
 * It handles:
 * - Converting intake data to blueprint
 * - Creating or updating builder session
 * - Storing in blueprint store
 * - Tracking analytics
 * - Generating builder URL
 * 
 * @param payload - Unified intake payload from any source
 * @returns Result with sessionId, blueprint, and builderUrl
 */
export async function startBuilderFromIntake(
  payload: UnifiedIntakePayload
): Promise<IntakeResult> {
  console.log('[UnifiedIntake] Starting builder from intake:', {
    source: payload.source,
    userId: payload.userId,
    existingSessionId: payload.existingSessionId,
    forceNew: payload.forceNew,
  });

  try {
    // Step 1: Convert to blueprint
    const blueprint = await convertToBlueprint(payload);
    console.log('[UnifiedIntake] Blueprint created:', {
      name: blueprint.name,
      source: blueprint.source,
    });

    // Step 2: Create or update Builder session
    let session;
    if (payload.existingSessionId && !payload.forceNew) {
      // Update existing session (e.g., uploading file in Step 2)
      console.log('[UnifiedIntake] Updating existing session:', payload.existingSessionId);
      
      // Get existing session to merge with new data
      const existingSession = await getBuilderSession(payload.existingSessionId);
      
      if (existingSession) {
        // Merge new blueprint data with existing
        const mergedBlueprint: AgentBlueprint = {
          ...existingSession.blueprint,
          // Keep original metadata
          source: existingSession.blueprint.source,
          templateId: existingSession.blueprint.templateId,
          templateName: existingSession.blueprint.templateName,
          // Merge knowledge sources (especially for file uploads)
          knowledge: {
            documents: [
              ...(existingSession.blueprint.knowledge.documents || []),
              ...(blueprint.knowledge.documents || []),
            ],
            urls: [
              ...(existingSession.blueprint.knowledge.urls || []),
              ...(blueprint.knowledge.urls || []),
            ],
            cloudDrives: {
              ...existingSession.blueprint.knowledge.cloudDrives,
              ...blueprint.knowledge.cloudDrives,
            },
            summary: blueprint.knowledge.summary || existingSession.blueprint.knowledge.summary,
          },
          // Update behavior if file analysis provides better data
          behavior: {
            ...existingSession.blueprint.behavior,
            systemPrompt: blueprint.behavior.systemPrompt || existingSession.blueprint.behavior.systemPrompt,
          },
        };

        session = await updateBuilderSession(payload.existingSessionId, {
          blueprint: mergedBlueprint,
        });
      } else {
        // Session not found, create new
        console.warn('[UnifiedIntake] Existing session not found, creating new one');
        session = await createBuilderSession(blueprint, payload.userId);
      }
    } else {
      // Create new session
      console.log('[UnifiedIntake] Creating new session');
      session = await createBuilderSession(blueprint, payload.userId);
    }

    // Step 3: Store in blueprint store for immediate access
    const { setBlueprint } = useBlueprintStore.getState();
    setBlueprint(session.blueprint);
    console.log('[UnifiedIntake] Blueprint stored in global state');

    // Step 4: Track analytics
    trackIntakeComplete(session.blueprint);
    trackBuilderOpened(session.blueprint, 1);
    console.log('[UnifiedIntake] Analytics tracked');

    // Step 5: Generate builder URL
    const builderUrl = `/builder?session=${session.id}&step=1`;

    console.log('[UnifiedIntake] ✅ Intake complete:', {
      sessionId: session.id,
      builderUrl,
    });

    return {
      success: true,
      sessionId: session.id,
      blueprint: session.blueprint,
      builderUrl,
    };
  } catch (error) {
    console.error('[UnifiedIntake] ❌ Failed to process intake:', error);
    
    return {
      success: false,
      sessionId: '',
      blueprint: {} as AgentBlueprint,
      builderUrl: '/builder',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper: Start builder from template
 * Convenience wrapper for template intake
 */
export async function startBuilderFromTemplate(
  templateId: string,
  userId: string,
  sourceEntry: 'dashboard' | 'marketplace' | 'builder' = 'marketplace'
): Promise<IntakeResult> {
  return startBuilderFromIntake({
    source: 'template',
    userId,
    templateId,
    metadata: { sourceEntry },
  });
}

/**
 * Helper: Start builder from file upload
 * Convenience wrapper for file intake
 */
export async function startBuilderFromFile(
  fileJobId: string,
  userId: string,
  existingSessionId?: string
): Promise<IntakeResult> {
  return startBuilderFromIntake({
    source: 'file',
    userId,
    fileJobId,
    existingSessionId,
  });
}

/**
 * Helper: Start builder from questionnaire
 * Convenience wrapper for questionnaire intake
 */
export async function startBuilderFromQuestionnaire(
  answers: Record<string, any>,
  userId: string
): Promise<IntakeResult> {
  return startBuilderFromIntake({
    source: 'questionnaire',
    userId,
    questionnaireAnswers: answers,
  });
}

/**
 * Helper: Start builder from URL
 * Convenience wrapper for URL intake
 */
export async function startBuilderFromUrl(
  url: string,
  userId: string
): Promise<IntakeResult> {
  return startBuilderFromIntake({
    source: 'url',
    userId,
    urlInput: url,
  });
}
