/**
 * Enhanced Co-Pilot Context Provider
 * 
 * Manages global Co-Pilot state with rich context tracking across all pages
 * and centralized streaming chat state with persistent memory.
 * Now integrated with DC Domain Context for data centre intelligence.
 * Supports mode-aware context for Blueprint Designer and Simulation modes.
 */

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { buildCoPilotContext, type CoPilotContext as CoPilotContextType, enrichWithBlueprint } from '@/lib/copilot/contextBuilder';
import { streamCoPilotResponse } from '@/lib/copilot/streaming';
import { logCoPilotEvent } from '@/lib/copilot/analytics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getDCDomainContext, type DCDomainContext } from '@/lib/copilot/dcDomainContext';
import type { CoPilotContextPayload, CoPilotContextMode } from '@/types/copilotContext';

export type CoPilotMessage = {
  role: 'user' | 'assistant';
  content: string;
  structured?: {
    actions?: Array<{ label: string; handler: string; icon?: string }>;
    insights?: string[];
    nextSteps?: string[];
    followUps?: string[];
    proposedChanges?: any[]; // Blueprint Designer mode
    blueprintSuggestions?: any[]; // Simulation mode
  };
  streaming?: boolean;
};

interface CoPilotContextValue {
  context: CoPilotContextType;
  dcContext: DCDomainContext | null;
  updateContext: (updates: Partial<CoPilotContextType>) => void;
  updateDCContext: (updates: Partial<DCDomainContext>) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialMessage?: string;
  setInitialMessage: (message: string | undefined) => void;
  messages: CoPilotMessage[];
  isStreaming: boolean;
  error?: string | null;
  sendMessage: (text: string, modePayload?: CoPilotContextPayload) => Promise<void>;
  stopStreaming: () => void;
  openWithQuestion: (text: string, modePayload?: CoPilotContextPayload) => void;
  memory: Record<string, any>;
  saveMemory: (key: string, value: any) => Promise<void>;
  getMemory: (key: string) => any;
  clearMemory: () => Promise<void>;
  memoryEnabled: boolean;
  setMemoryEnabled: (enabled: boolean) => void;
  isDCPage: boolean;
  currentMode: CoPilotContextMode | null;
  setCurrentMode: (mode: CoPilotContextMode | null) => void;
}

const CoPilotContext = createContext<CoPilotContextValue | undefined>(undefined);

export function CoPilotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | undefined>();
  const [context, setContext] = useState<CoPilotContextType>({
    activePage: 'dashboard',
  });
  const [dcContext, setDCContext] = useState<DCDomainContext | null>(null);
  const [isDCPage, setIsDCPage] = useState(false);
  const [currentMode, setCurrentMode] = useState<CoPilotContextMode | null>(null);

  const [messages, setMessages] = useState<CoPilotMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Store mode payload for use in sendMessage
  const modePayloadRef = useRef<CoPilotContextPayload | null>(null);
  
  // Memory state
  const [memory, setMemory] = useState<Record<string, any>>({});
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  
  const location = useLocation();

  // Load memory from Supabase on mount
  useEffect(() => {
    const loadMemory = async () => {
      try {
        // Memory is per-user and RLS-scoped; skip the request entirely when
        // there is no session (anonymous reads are closed and return 401).
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data } = await supabase
          .from('copilot_memory')
          .select('key, value');
        
        if (data) {
          const memoryMap: Record<string, any> = {};
          for (const row of data) {
            memoryMap[row.key] = row.value;
          }
          setMemory(memoryMap);
          
          // Check if memory is enabled
          if (memoryMap.memory_enabled !== undefined) {
            setMemoryEnabled(memoryMap.memory_enabled.enabled);
          }
        }
      } catch (err) {
        console.error('[CoPilot] Failed to load memory:', err);
      }
    };
    
    loadMemory();
  }, []);

  // Auto-detect and build rich context based on route
  useEffect(() => {
    const detectPageContext = async () => {
      const path = location.pathname;
      const searchParams = new URLSearchParams(location.search);
      
      let pageName: string = 'dashboard';
      let agentId: string | undefined;
      let additionalContext: Partial<CoPilotContextType> = {};

      // Route detection
      if (path === '/' || path === '/app') {
        pageName = 'dashboard';
      } else if (path.includes('/scanner') || path.includes('/url-scan')) {
        pageName = 'url_scanner';
      } else if (path.includes('/recommendations')) {
        pageName = 'recommendations';
      } else if (path.includes('/playbook')) {
        pageName = 'playbook';
        additionalContext.industry = searchParams.get('industry') || undefined;
      } else if (path.includes('/templates') || path.includes('/marketplace')) {
        pageName = 'template_library';
      } else if (path.includes('/builder')) {
        pageName = 'builder';
        const step = path.match(/step-(\d+)/)?.[1];
        if (step) additionalContext.builderStep = parseInt(step);
      } else if (path.includes('/agents/') && path.includes('/manage')) {
        agentId = path.split('/agents/')[1]?.split('/')[0];
        pageName = 'agent_detail';
        
        // Detect active tab
        if (path.includes('/live')) additionalContext.activeTab = 'live';
        else if (path.includes('/workflow')) additionalContext.activeTab = 'workflow';
        else if (path.includes('/blueprint')) additionalContext.activeTab = 'blueprint';
        else if (path.includes('/simulation')) additionalContext.activeTab = 'simulation';
        else if (path.includes('/metrics')) additionalContext.activeTab = 'metrics';
        else if (path.includes('/deploy')) additionalContext.activeTab = 'deploy';
        else if (path.includes('/governance')) additionalContext.activeTab = 'governance';
      } else if (path === '/app/agents') {
        pageName = 'manage_agents';
      } else if (path.includes('/data-centre-twin')) {
        pageName = 'data_centre_twin';
        const twinId = path.match(/\/data-centre-twin\/([^\/]+)/)?.[1] || 'default';
        additionalContext.agentId = twinId;
        
        // Detect view from query params
        const view = searchParams.get('view');
        if (view === 'simulation') additionalContext.activeTab = 'simulation';
      } else if (path.includes('/blueprint')) {
        pageName = 'blueprint';
        const blueprintId = path.match(/\/blueprint\/([^\/]+)/)?.[1] || 'default';
        additionalContext.agentId = blueprintId;
      }
  
      // Build rich context
      let newContext = await buildCoPilotContext(pageName, agentId, additionalContext);
      
      // Determine if this is a DC page
      const isDataCentrePage = pageName === 'data_centre_twin' || 
                               pageName === 'blueprint' || 
                               pageName === 'builder';
      setIsDCPage(isDataCentrePage);
      
      // Enrich with blueprint data for DC pages
      if (pageName === 'data_centre_twin' || pageName === 'blueprint') {
        const twinId = additionalContext.agentId || 'default';
        newContext = await enrichWithBlueprint(newContext, twinId);
      }
      
      // Build DC domain context for DC pages
      if (isDataCentrePage) {
        const twinId = additionalContext.agentId || 'default';
        const dcCtx = getDCDomainContext(twinId, additionalContext.activeTab || 'overview', pageName);
        setDCContext(dcCtx);
      } else {
        setDCContext(null);
      }
      
      setContext(newContext);
    };

    detectPageContext();
  }, [location]);

  const updateContext = (updates: Partial<CoPilotContextType>) => {
    setContext(prev => ({ ...prev, ...updates }));
  };

  const updateDCContext = useCallback((updates: Partial<DCDomainContext>) => {
    setDCContext(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // Memory helpers
  const saveMemory = useCallback(async (key: string, value: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('copilot_memory')
        .upsert({
          user_id: user.id,
          key,
          value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,key'
        });
      
      setMemory(prev => ({ ...prev, [key]: value }));
      console.log('[CoPilot] Saved memory key:', key);
    } catch (err) {
      console.error('[CoPilot] Failed to save memory:', err);
    }
  }, []);

  const getMemory = useCallback((key: string) => {
    return memory[key];
  }, [memory]);

  const clearMemory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('copilot_memory')
        .delete()
        .eq('user_id', user.id);
      
      setMemory({});
      toast.success('Co-Pilot memory cleared');
      console.log('[CoPilot] Memory cleared');
    } catch (err) {
      console.error('[CoPilot] Failed to clear memory:', err);
      toast.error('Failed to clear memory');
    }
  }, []);

  // Save memory enabled preference
  useEffect(() => {
    if (memory.memory_enabled?.enabled !== memoryEnabled) {
      saveMemory('memory_enabled', { enabled: memoryEnabled });
    }
  }, [memoryEnabled, memory, saveMemory]);

  const sendMessage = useCallback(async (text: string, modePayload?: CoPilotContextPayload) => {
    const query = text.trim();
    if (!query) return;

    if (isStreaming) {
      console.log('[CoPilotContext] sendMessage ignored, stream already in progress');
      return;
    }

    // Store mode payload for potential follow-up questions
    if (modePayload) {
      modePayloadRef.current = modePayload;
      setCurrentMode(modePayload.mode);
    }

    // Determine which context to use
    const streamContext = modePayload || modePayloadRef.current || context;
    const contextMode = (streamContext as CoPilotContextPayload).mode;

    console.log('[CoPilotContext] sendMessage:', query);
    console.log('[CoPilotContext] Using context mode:', contextMode || 'legacy');

    const userMessage: CoPilotMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setError(null);

    // Placeholder assistant message for streaming
    const placeholder: CoPilotMessage = {
      role: 'assistant',
      content: '',
      streaming: true,
    };
    setMessages(prev => [...prev, placeholder]);

    const startTime = Date.now();
    let accumulatedContent = '';
    let structuredData: any = null;

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      await streamCoPilotResponse({
        query,
        context: streamContext,
        sessionId,
        signal: controller.signal,
        onToken: (token: string) => {
          accumulatedContent += token;
          setMessages(prev => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === 'assistant') {
              last.content = accumulatedContent;
            }
            return next;
          });
        },
        onStructured: (data: any) => {
          structuredData = data;
        },
        onComplete: () => {
          setMessages(prev => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === 'assistant') {
              last.streaming = false;
              if (structuredData) {
                last.structured = structuredData;
              }
            }
            return next;
          });

          const latency = Date.now() - startTime;
          logCoPilotEvent({
            sessionId,
            context,
            prompt: userMessage.content,
            responseSummary: accumulatedContent.slice(0, 200),
            latencyMs: latency,
          });

          setIsStreaming(false);
          abortControllerRef.current = null;
        },
        onError: (err: Error) => {
          console.error('[CoPilotContext] Stream error:', err);
          const msg =
            err.message ||
            'Co-Pilot ran into a problem processing your request. Please try again.';
          toast.error(msg);
          setError(msg);
          setMessages(prev => prev.slice(0, -1)); // remove placeholder
          setIsStreaming(false);
          abortControllerRef.current = null;
        },
      });

      console.log('[CoPilotContext] Stream completed');
    } catch (err) {
      console.error('[CoPilotContext] sendMessage catch error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Co-Pilot ran into a problem processing your request. Please try again.';
      toast.error(msg);
      setError(msg);
      setMessages(prev => prev.slice(0, -1));
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [context, isStreaming, sessionId]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('[CoPilotContext] stopStreaming called');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      toast.info('Stopped Co-Pilot response');
    }
  }, []);

  const openWithQuestion = useCallback((text: string, modePayload?: CoPilotContextPayload) => {
    console.log('[CoPilotContext] openWithQuestion:', text, 'mode:', modePayload?.mode);
    setIsOpen(true);
    setMessages([]);
    setError(null);
    setInitialMessage(undefined);
    void sendMessage(text, modePayload);
  }, [sendMessage]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<CoPilotContextValue>(() => ({
    context,
    dcContext,
    updateContext,
    updateDCContext,
    isOpen,
    setIsOpen,
    initialMessage,
    setInitialMessage,
    messages,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    openWithQuestion,
    memory,
    saveMemory,
    getMemory,
    clearMemory,
    memoryEnabled,
    setMemoryEnabled,
    isDCPage,
    currentMode,
    setCurrentMode,
  }), [
    context,
    dcContext,
    updateContext,
    updateDCContext,
    isOpen,
    initialMessage,
    messages,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    openWithQuestion,
    memory,
    saveMemory,
    getMemory,
    clearMemory,
    memoryEnabled,
    isDCPage,
    currentMode,
  ]);

  return (
    <CoPilotContext.Provider value={contextValue}>
      {children}
    </CoPilotContext.Provider>
  );
}

export function useCoPilotContext() {
  const context = useContext(CoPilotContext);
  if (!context) {
    throw new Error('useCoPilotContext must be used within CoPilotProvider');
  }
  
  const askCoPilot = (message: string) => {
    console.log('[CoPilotContext] askCoPilot called with message:', message);
    context.openWithQuestion(message);
  };
  
  return {
    ...context,
    askCoPilot,
  };
}

// Legacy export for backward compatibility
export const useCoPilot = useCoPilotContext;

// Legacy type export for backward compatibility
export type PageContext = CoPilotContextType;
