/**
 * Template Chat Interface - Unified with CoPilot
 * 
 * Uses the same CoPilot backend/streaming infrastructure but scoped to
 * the specific digital twin template with rich context.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, User, Bot, RotateCcw, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { streamCoPilotResponse } from '@/lib/copilot/streaming';
import type { CoPilotContext } from '@/lib/copilot/contextBuilder';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface SimulationState {
  lastScenario?: string;
  lastKpiDeltas?: Record<string, number>;
  lastEvents?: any[];
  runTimestamp?: string;
}

interface TemplateChatInterfaceProps {
  template: any;
  activeTab?: string;
  simulationState?: SimulationState;
}

// Domain-specific quick questions for Sovereign DC Twin
const SOVEREIGN_DC_QUESTIONS = [
  "Explain today's PUE trend",
  "Why did GPU cluster #2 spike?",
  "Compare green vs gas emissions",
  "Run a sovereignty compliance check",
  "Summarize the last simulation",
  "What are the cooling risks?",
];

// Generic fallback questions
const GENERIC_QUESTIONS = [
  "What can this twin do?",
  "Explain the key KPIs",
  "What scenarios can I simulate?",
  "How does the workflow work?",
];

export function TemplateChatInterface({ 
  template, 
  activeTab = 'preview',
  simulationState 
}: TemplateChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Session memory - last 20 messages + simulation context
  const [sessionMemory, setSessionMemory] = useState<{
    lastViewed: string;
    selectedScenario?: string;
    simulationResults?: any;
  }>({
    lastViewed: activeTab,
  });

  // Update session memory when tab changes
  useEffect(() => {
    setSessionMemory(prev => ({ ...prev, lastViewed: activeTab }));
  }, [activeTab]);

  // Update session memory when simulation runs
  useEffect(() => {
    if (simulationState?.lastScenario) {
      setSessionMemory(prev => ({
        ...prev,
        selectedScenario: simulationState.lastScenario,
        simulationResults: {
          kpiDeltas: simulationState.lastKpiDeltas,
          events: simulationState.lastEvents,
          timestamp: simulationState.runTimestamp,
        },
      }));
    }
  }, [simulationState]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Build rich twin context for CoPilot
  const buildTwinContext = useCallback((): CoPilotContext => {
    const config = template.default_config || {};
    const previewSections = config.preview_sections || {};
    const mockData = config.mock_data || {};
    const blueprintJson = config.blueprint_json || previewSections.blueprint || {};
    const kpiBlock = config.kpi_block || {};
    const roiBlock = config.roi_block || {};

    return {
      activePage: 'twin_chat',
      activeTab: activeTab,
      agentId: template.id,
      agentName: template.name,
      agentType: 'digital_twin',
      industry: template.industry || config.industries?.[0] || 'Technology',
      
      // Twin-specific context
      twinContext: {
        templateId: template.id,
        templateName: template.name,
        templateType: template.category || 'digital_twin',
        currentTab: activeTab,
        mockDataEnabled: true,
        
        // Blueprint summary
        blueprint: {
          name: blueprintJson.name || template.name,
          agents: blueprintJson.agents?.map((a: any) => a.name) || [],
          dataSources: blueprintJson.data_sources?.map((d: any) => d.name) || [],
          integrations: blueprintJson.integrations?.map((i: any) => i.name) || [],
          workflowCount: (config.workflows || []).length,
          kpiCount: (kpiBlock.kpis || []).length,
          scenarioCount: blueprintJson.simulation_scenarios?.length || 0,
          humanRoles: blueprintJson.human_roles?.map((r: any) => r.name) || [],
        },
        
        // KPIs with current values from mock data
        kpis: {
          definitions: kpiBlock.kpis || [],
          currentValues: mockData.overview?.kpi_snapshot || {},
        },
        
        // Simulation context
        simulation: {
          availableScenarios: previewSections.scenarios?.items?.map((s: any) => s.title) || [],
          lastScenario: sessionMemory.selectedScenario,
          lastResults: sessionMemory.simulationResults,
        },
        
        // Mock data summary
        mockData: {
          facilityStatus: mockData.overview?.facility_status,
          recentIncidents: mockData.overview?.recent_incidents?.slice(0, 3),
          sampleMetrics: mockData.overview?.sample_metrics,
        },
        
        // Session memory
        sessionMemory: {
          messageCount: messages.length,
          lastViewed: sessionMemory.lastViewed,
        },
      },
      
      // Include ROI context
      roiContext: roiBlock.headline ? {
        headline: roiBlock.headline,
        benefits: roiBlock.benefits?.slice(0, 3),
      } : undefined,
    };
  }, [template, activeTab, sessionMemory, messages.length]);

  // Send message using CoPilot streaming
  const sendMessage = useCallback(async (text: string) => {
    const query = text.trim();
    if (!query || isStreaming) return;

    console.log('[TwinChat] sendMessage:', query);
    setError(null);

    // Add user message
    const userMessage: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    // Add placeholder for assistant
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    let accumulatedContent = '';

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const context = buildTwinContext();
      console.log('[TwinChat] Context:', context);

      await streamCoPilotResponse({
        query,
        context,
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
          console.log('[TwinChat] Structured data:', data);
        },
        onComplete: () => {
          setMessages(prev => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === 'assistant') {
              last.streaming = false;
            }
            return next;
          });
          setIsStreaming(false);
          abortControllerRef.current = null;
        },
        onError: (err: Error) => {
          console.error('[TwinChat] Stream error:', err);
          const errorMsg = 'The Twin could not process your request. Please try again or re-run the simulation.';
          setError(errorMsg);
          toast.error(errorMsg);
          setMessages(prev => prev.slice(0, -1)); // Remove placeholder
          setIsStreaming(false);
          abortControllerRef.current = null;
        },
      });
    } catch (err) {
      console.error('[TwinChat] Error:', err);
      const errorMsg = 'The Twin could not process your request. Please try again or re-run the simulation.';
      setError(errorMsg);
      toast.error(errorMsg);
      setMessages(prev => prev.slice(0, -1));
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isStreaming, buildTwinContext, sessionId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
  };

  const handleQuickQuestion = (question: string) => {
    if (isStreaming) return;
    setInput(question);
    sendMessage(question);
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setError(null);
    setIsStreaming(false);
    setSessionMemory(prev => ({
      ...prev,
      selectedScenario: undefined,
      simulationResults: undefined,
    }));
    toast.success('Conversation reset');
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      toast.info('Stopped response');
    }
  };

  // Get appropriate quick questions based on template
  const quickQuestions = template.id === 'sovereign-data-center-twin' 
    ? SOVEREIGN_DC_QUESTIONS 
    : (template.sample_prompts?.slice(0, 6) || GENERIC_QUESTIONS);

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">Chat With This Digital Twin</h3>
            <p className="text-xs text-muted-foreground">
              Powered by CoPilot • {template.name}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-auto text-destructive"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground mb-4">
                Ask about KPIs, scenarios, blueprints, or simulation results
              </p>
              
              {/* Quick Questions */}
              <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                {quickQuestions.slice(0, 4).map((question: string, idx: number) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors py-1.5 px-3"
                    onClick={() => handleQuickQuestion(question)}
                  >
                    {question}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.role === 'assistant' ? (
                  message.streaming && !message.content ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>

              {message.role === 'user' && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary shrink-0">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this digital twin..."
            disabled={isStreaming}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          {isStreaming ? (
            <Button type="button" variant="outline" onClick={stopStreaming}>
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>

        {/* More quick questions when conversation started */}
        {messages.length > 0 && messages.length < 6 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {quickQuestions.slice(4, 6).map((question: string, idx: number) => (
              <Badge
                key={idx}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                onClick={() => handleQuickQuestion(question)}
              >
                {question}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
