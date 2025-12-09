/**
 * useDocumentAnalysis - Unified document upload & analysis hook
 * 
 * Single source of truth for ALL document uploads (Dashboard + Builder).
 * Handles:
 * - Job creation via document-analysis-start
 * - Status polling via document-analysis-status
 * - Error handling and validation
 * - Dev logging
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const isDev = import.meta.env.DEV;

function devLog(message: string, data?: any) {
  if (isDev) {
    console.log(`[DocAnalysis] ${message}`, data || '');
  }
}

function devError(message: string, error?: any) {
  if (isDev) {
    console.error(`[DocAnalysis] ${message}`, error || '');
  }
}

export type JobStatus = 'queued' | 'processing' | 'extracting' | 'chunking' | 'analyzing' | 'generating_blueprint' | 'completed' | 'partial' | 'failed';

export interface DocumentAnalysisResult {
  summary: string;
  detected_industry: string;
  detected_department: string;
  recommended_agent_type: string;
  use_case: string;
  detected_entities: {
    people: string[];
    organizations: string[];
    processes: string[];
    systems: string[];
    kpis: string[];
  };
  suggested_workflows: Array<{
    name: string;
    description: string;
    trigger: string;
    actions: string[];
    integration_needed: string[];
  }>;
  suggested_integrations: string[];
  detected_kpis: Array<{
    name: string;
    current_estimate: string;
    target_improvement: string;
  }>;
  rag_requirements: {
    needs_rag: boolean;
    data_sources: string[];
  };
  risk_level: string;
  compliance_requirements: string[];
  estimated_complexity: string;
  suggested_safety_policies: string[];
  file_name: string;
  file_type: string;
  powered_by: string;
  extraction_info?: {
    method: string;
    pages: number;
    chars: number;
    truncated: boolean;
  };
  understanding?: {
    title: string;
    docType: string;
    summary: string;
    keySections: string[];
    potentialAgents: Array<{
      name: string;
      role: string;
      primaryTasks: string[];
    }>;
  };
  builderPrefill?: {
    step1_goal?: string;
    step2_knowledge?: string;
    step3_tools_apis?: string;
    step4_workflows?: string;
    step5_kpis?: string;
  };
}

export interface UseDocumentAnalysisResult {
  // State
  jobId: string | null;
  status: JobStatus | null;
  progress: number;
  phase: string;
  error: string | null;
  result: DocumentAnalysisResult | null;
  isAnalyzing: boolean;
  
  // Actions
  startAnalysis: (file: File, context?: { source?: 'dashboard' | 'builder'; agentId?: string }) => Promise<void>;
  cancelAnalysis: () => void;
  reset: () => void;
}

export function useDocumentAnalysis(): UseDocumentAnalysisResult {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const pollJobStatus = useCallback(async (id: string) => {
    if (!id) {
      devError('pollJobStatus called without jobId');
      return;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('document-analysis-status', {
        body: { jobId: id },
      });

      if (invokeError) {
        devError('Poll error', invokeError);
        throw invokeError;
      }

      // Handle REST envelope shape
      const payload: any = data && typeof data === 'object' && 'success' in data && 'data' in data
        ? (data as any).data
        : data;

      if (!payload) {
        devError('Empty payload from polling');
        return;
      }

      const currentProgress = payload.progress ?? 0;
      const currentStatus = payload.status as JobStatus;
      const progressMessage = payload.progress_message || '';

      setProgress(currentProgress);
      setStatus(currentStatus);
      setPhase(progressMessage);

      devLog('Poll status', { jobId: id, status: currentStatus, progress: currentProgress, phase: progressMessage });

      // Handle completion states
      if (currentStatus === 'completed' || currentStatus === 'partial') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        
        if (payload.result) {
          // Handle new Gemini analysis result structure
          const fileSummary = payload.result.fileSummary;
          const extraction = payload.result.extraction;
          const builderPrefill = payload.result.builderPrefill;

          let mappedResult: DocumentAnalysisResult;

          if (fileSummary) {
            // New structure from Gemini analysis
            mappedResult = {
              file_name: payload.file_name || '',
              file_type: payload.file_type || '',
              summary: fileSummary.mainSummary || '',
              detected_industry: fileSummary.domainGuess || 'General',
              detected_department: 'General',
              recommended_agent_type: fileSummary.recommendedTwinTypes?.[0]?.title || 'Assistant',
              use_case: fileSummary.recommendedTwinTypes?.[0]?.description || '',
              detected_entities: {
                people: [],
                organizations: [],
                processes: fileSummary.keySections?.map((s: any) => s.heading) || [],
                systems: [],
                kpis: []
              },
              suggested_workflows: fileSummary.recommendedTwinTypes?.map((twin: any) => ({
                name: twin.title,
                description: twin.description,
                trigger: 'Manual',
                actions: [],
                integration_needed: []
              })) || [],
              suggested_integrations: [],
              detected_kpis: [],
              rag_requirements: {
                needs_rag: true,
                data_sources: [payload.file_name || '']
              },
              risk_level: 'Low',
              compliance_requirements: [],
              estimated_complexity: 'Medium',
              suggested_safety_policies: [],
              extraction_info: extraction,
              powered_by: payload.result.powered_by || 'Gemini 2.5 Flash',
              understanding: {
                title: payload.file_name || '',
                docType: 'Document',
                summary: fileSummary.mainSummary || '',
                keySections: fileSummary.keySections?.map((s: any) => s.heading) || [],
                potentialAgents: fileSummary.recommendedTwinTypes?.map((twin: any) => ({
                  name: twin.title,
                  role: twin.id,
                  primaryTasks: [twin.description]
                })) || []
              },
              // Store the builder prefill for later use
              builderPrefill
            };
          } else {
            // Fallback for old structure
            const understanding = payload.result.understanding;
            mappedResult = {
              file_name: payload.result.file_name || '',
              file_type: payload.result.file_type || '',
              summary: understanding?.summary || '',
              detected_industry: 'General',
              detected_department: 'General',
              recommended_agent_type: understanding?.potentialAgents?.[0]?.role || 'Assistant',
              use_case: understanding?.title || '',
              detected_entities: {
                people: [],
                organizations: [],
                processes: understanding?.keySections || [],
                systems: [],
                kpis: []
              },
              suggested_workflows: understanding?.potentialAgents?.map((agent: any) => ({
                name: agent.name,
                description: agent.role,
                trigger: 'Manual',
                actions: agent.primaryTasks || [],
                integration_needed: []
              })) || [],
              suggested_integrations: [],
              detected_kpis: [],
              rag_requirements: {
                needs_rag: true,
                data_sources: [payload.result.file_name]
              },
              risk_level: 'Low',
              compliance_requirements: [],
              estimated_complexity: 'Medium',
              suggested_safety_policies: [],
              extraction_info: payload.result.extraction_info,
              powered_by: payload.result.powered_by || 'Gemini Flash',
              understanding
            };
          }

          setResult(mappedResult);
          devLog('Analysis completed', { result: mappedResult });

          if (currentStatus === 'partial') {
            toast.info('Quick scan complete – you can still proceed');
          } else {
            toast.success(extraction?.truncated 
              ? 'Document analyzed! Some content was truncated due to size.'
              : 'Document analyzed successfully!'
            );
          }
        }
        
        setIsAnalyzing(false);
      } else if (currentStatus === 'failed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        
        const errorMsg = payload.error_message || 'Analysis failed';
        setError(errorMsg);
        setIsAnalyzing(false);
        devError('Analysis failed', errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      devError('Failed to poll job status', err);
      // Don't stop polling on transient errors
    }
  }, []);

  const startAnalysis = useCallback(async (
    file: File,
    context?: { source?: 'dashboard' | 'builder'; agentId?: string }
  ) => {
    if (isAnalyzing) {
      devLog('Analysis already in progress, ignoring duplicate call');
      return;
    }

    devLog('Starting analysis', { 
      fileName: file.name, 
      fileSize: file.size,
      source: context?.source,
      agentId: context?.agentId 
    });

    // Validate file size (25MB max)
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const errorMsg = `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum 25MB allowed.`;
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setProgress(5);
    setPhase('Preparing file...');
    setStatus('queued');

    try {
      // Read file
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        devLog('File read', { contentLength: content?.length });
        
        // Extract base64 content (remove data:xxx;base64, prefix if present)
        let base64Content = content;
        if (content.includes(',')) {
          base64Content = content.split(',')[1];
        }
        
        setProgress(10);
        setPhase('Sending to server...');

        // Call document-analysis-start
        const { data, error: invokeError } = await supabase.functions.invoke('document-analysis-start', {
          body: {
            fileName: file.name,
            fileContent: base64Content,
            fileType: file.type,
            source: context?.source || 'dashboard',
            agentId: context?.agentId,
          },
        });

        if (invokeError) {
          devError('Failed to start analysis', invokeError);
          setError(invokeError.message || 'Failed to start analysis');
          setIsAnalyzing(false);
          toast.error(invokeError.message || 'Failed to start analysis');
          return;
        }

        // Handle REST envelope
        const payload: any = data && typeof data === 'object' && 'success' in data && 'data' in data
          ? (data as any).data
          : data;

        const newJobId = payload?.job_id || payload?.jobId;

        if (!newJobId || typeof newJobId !== 'string') {
          devError('No job ID returned', data);
          setError('Failed to start analysis (no job ID)');
          setIsAnalyzing(false);
          toast.error('Could not start analysis. Please try again or contact support.');
          return;
        }

        setJobId(newJobId);
        setProgress(15);
        setPhase('Document received - analyzing now...');
        devLog('Job created', { jobId: newJobId });

        // Start polling
        pollIntervalRef.current = setInterval(() => {
          pollJobStatus(newJobId);
        }, 1500);
      };

      reader.onerror = () => {
        devError('Failed to read file');
        setError('Failed to read file');
        setIsAnalyzing(false);
        toast.error('Failed to read file');
      };

      // Use readAsDataURL for proper base64 encoding of all file types
      reader.readAsDataURL(file);
    } catch (err) {
      devError('Upload error', err);
      setError('Failed to analyze file');
      setIsAnalyzing(false);
      toast.error('Failed to analyze file');
    }
  }, [isAnalyzing, pollJobStatus]);

  const cancelAnalysis = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    setIsAnalyzing(false);
    setProgress(0);
    setPhase('');
    devLog('Analysis cancelled');
    toast.info('Analysis cancelled');
  }, []);

  const reset = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    setJobId(null);
    setStatus(null);
    setProgress(0);
    setPhase('');
    setError(null);
    setResult(null);
    setIsAnalyzing(false);
    
    devLog('State reset');
  }, []);

  return {
    jobId,
    status,
    progress,
    phase,
    error,
    result,
    isAnalyzing,
    startAnalysis,
    cancelAnalysis,
    reset,
  };
}
