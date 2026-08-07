import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { X, Sparkles, Send, Loader, Copy, FileDown, ExternalLink, Settings, AlertCircle, Check, Upload, Link2, BarChart3, Wrench, Shield, BookOpen, Database, Bot, StopCircle, History, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CoPilotVoice } from "./CoPilotVoice";
import { useCopilotHistory } from "@/hooks/useCopilotHistory";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logger } from "@/lib/logger";
import { formatRelativeTime } from "@/lib/formatters";
import { evidenceBoundaryNotice } from '@/capabilities/operatingState';

interface Citation {
  id: number;
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  citations?: Citation[];
  followUps?: string[];
  dataSources?: string[];
  knowledgeCount?: number;
  metrics?: {
    latency_ms: number;
    model: string;
    grounded: boolean;
    coverage?: number;
    retrieval_source?: string;
    confidence?: number;
    fallback_used?: boolean;
  };
}

interface ErrorResponse {
  error: string;
  stage: 'config' | 'grounding' | 'generate' | 'validation';
  requestId?: string;
  suggestion?: string;
}

interface Agent {
  id: string;
  name: string;
  description: string | null;
  status: string;
  model_id: string | null;
  category?: string;
  model_stack?: string[];
}

interface CoPilotDrawerProps {
  open: boolean;
  onClose: () => void;
  currentRole?: string;
  initialMessage?: string;
}

export function CoPilotDrawer({ open, onClose, currentRole, initialMessage }: CoPilotDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<number | null>(null);
  const [sessionId] = useState(crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { sessions, saveMessages, loadMessages, deleteSession, clearCurrentSession } = useCopilotHistory(sessionId);
  const [showHistory, setShowHistory] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load agents on open and handle initial message
  useEffect(() => {
    if (open) {
      loadAgents();
      loadPreviousMessages();
      
      // If there's an initial message, seed and auto-send it
      if (initialMessage && initialMessage.trim()) {
        // Small delay to ensure component is ready
        const timeoutId = setTimeout(async () => {
          const userMessage: Message = { role: 'user', content: initialMessage };
          setMessages(prev => [...prev, userMessage]);
          setError(null);
          setIsLoading(true);
          
          try {
            const { data, error: funcError } = await supabase.functions.invoke('copilot-search', {
              body: { 
                query: initialMessage,
                context: [],
                sessionId
              }
            });
            
            if (funcError) throw funcError;
            if (data.error) {
              setError(data as ErrorResponse);
              return;
            }
            
            const assistantMessage: Message = {
              role: 'assistant',
              content: data.answer,
              intent: data.intent,
              citations: data.citations,
              followUps: data.followUps,
              metrics: data.metrics,
            };
            
            setMessages(prev => [...prev, assistantMessage]);
            await saveMessages([userMessage, assistantMessage]);
          } catch (err) {
            logger.error('Co-Pilot initial message error', err, { component: 'CoPilotDrawer', action: 'initialMessageSend' });
            toast.error("Failed to send initial message");
            setError({
              error: err instanceof Error ? err.message : "Unknown error",
              stage: 'generate',
            });
          } finally {
            setIsLoading(false);
          }
        }, 300);
        
        return () => clearTimeout(timeoutId);
      } else {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [open, initialMessage, sessionId, saveMessages]);
  
  const loadPreviousMessages = async () => {
    const previousMessages = await loadMessages();
    if (previousMessages.length > 0) {
      setMessages(previousMessages);
    }
  };
  
  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('id, name, description, status, model_id')
        .in('status', ['active', 'deployed', 'running'])
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAgents(data || []);
    } catch (err) {
      logger.error('Failed to load agents', err, { component: 'CoPilotDrawer', action: 'loadAgents' });
    }
  };

  // Keyboard shortcut (Ctrl/Cmd + /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        if (!open) {
          // Toggle open if closed
          window.dispatchEvent(new CustomEvent('toggle-copilot'));
        } else {
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleCommand = (command: string): boolean => {
    const cmd = command.toLowerCase().trim();

    // /list agents or /list
    if (cmd === '/list agents' || cmd === '/list') {
      const agentList = agents.map((a, i) => 
        `${i + 1}. **${a.name}** - ${a.status}${a.description ? ` - ${a.description.slice(0, 50)}...` : ''}`
      ).join('\n');
      
      const systemMessage: Message = {
        role: "assistant",
        content: `## 🤖 Available Agents\n\n${agentList || 'No agents available.'}\n\n**Commands:**\n- Use \`/use [agent_name]\` to activate an agent\n- Use \`/reset\` to clear chat context\n- Use \`/params\` to view parameters`,
      };
      setMessages((prev) => [...prev, systemMessage]);
      return true;
    }

    // /use [agent_name]
    if (cmd.startsWith('/use ')) {
      const agentName = command.slice(5).trim();
      const agent = agents.find(a => 
        a.name.toLowerCase() === agentName.toLowerCase()
      );
      
      if (agent) {
        handleAgentChange(agent.id);
        const systemMessage: Message = {
          role: "assistant",
          content: `🧠 **Now chatting with ${agent.name}**\n\n${agent.description || 'Ready to assist you.'}\n\nSend a message to start the conversation.`,
        };
        setMessages((prev) => [...prev, systemMessage]);
      } else {
        const systemMessage: Message = {
          role: "assistant",
          content: `❌ Agent "${agentName}" not found. Use \`/list agents\` to see available agents.`,
        };
        setMessages((prev) => [...prev, systemMessage]);
      }
      return true;
    }

    // /reset
    if (cmd === '/reset') {
      setMessages([]);
      setSelectedAgent(null);
      clearCurrentSession();
      const systemMessage: Message = {
        role: "assistant",
        content: "🔄 **Chat context cleared.** Select an agent or ask a question to start fresh.",
      };
      setMessages([systemMessage]);
      return true;
    }

    // /params
    if (cmd === '/params') {
      const currentParams = selectedAgent 
        ? `**Active Agent:** ${selectedAgent.name}\n\n**Model:** ${selectedAgent.model_id || 'google/gemini-2.5-flash'}\n\n**Status:** ${selectedAgent.status}\n\n*Parameter adjustment (temperature, max_tokens) coming soon.*`
        : '**No agent selected.** Use `/use [agent_name]` to activate an agent first, or select one from the dropdown above.';
      
      const systemMessage: Message = {
        role: "assistant",
        content: `⚙️ **Current Parameters**\n\n${currentParams}`,
      };
      setMessages((prev) => [...prev, systemMessage]);
      return true;
    }

    return false;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || isStreaming) return;

    const messageText = input.trim();
    setInput("");

    // Check if it's a command
    if (messageText.startsWith('/')) {
      const handled = handleCommand(messageText);
      if (handled) return;
    }

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setError(null);

    // If agent is selected, stream from agent-run
    if (selectedAgent) {
      await handleAgentStream(messageText);
    } else {
      // Default copilot search
      await handleCopilotSearch(messageText);
    }
  };

  const handleAgentStream = async (query: string) => {
    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          messages: [...messages.slice(-5), { role: 'user', content: query }]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Agent stream failed');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';

      // Add placeholder assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '', metrics: { latency_ms: 0, model: selectedAgent.model_id || 'unknown', grounded: false } }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            setIsStreaming(false);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulatedContent += delta;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg?.role === 'assistant') {
                  lastMsg.content = accumulatedContent;
                }
                return newMessages;
              });
            }
          } catch (e) {
            logger.error('Failed to parse SSE', e, { component: 'CoPilotDrawer', action: 'handleAgentStream' });
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.info('Agent stopped');
      } else {
        logger.error('Agent stream error', err, { component: 'CoPilotDrawer', action: 'handleAgentStream' });
        toast.error(err.message || 'Agent execution failed');
        setError({ error: err.message, stage: 'generate' });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleCopilotSearch = async (queryText: string) => {
    setIsLoading(true);
    logger.debug('Sending CoPilot query', { component: 'CoPilotDrawer', action: 'handleCopilotSearch', metadata: { queryText } });

    try {
      const { data, error: funcError } = await supabase.functions.invoke('copilot-search', {
        body: { 
          query: queryText,
          context: messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
          sessionId
        }
      });

      logger.debug('CoPilot response received', { component: 'CoPilotDrawer', action: 'handleCopilotSearch', metadata: { hasData: !!data, hasError: !!funcError } });

      if (funcError) {
        logger.error('CoPilot function error', funcError, { component: 'CoPilotDrawer', action: 'handleCopilotSearch' });
        throw funcError;
      }

      if (data.error) {
        setError(data as ErrorResponse);
        setIsLoading(false);
        return;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        intent: data.intent,
        citations: data.citations || [],
        followUps: data.followUps || [],
        dataSources: data.dataSources || [],
        knowledgeCount: data.knowledgeCount || 0,
        metrics: {
          latency_ms: data.metrics?.latency_ms || 0,
          model: data.metrics?.model || 'gemini-2.5-pro',
          grounded: data.metrics?.grounded || false,
          coverage: data.metrics?.coverage || 0,
          retrieval_source: data.metrics?.retrieval_source,
          confidence: data.metrics?.confidence,
          fallback_used: data.metrics?.fallback_used
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      logger.error('Co-Pilot error', err, { component: 'CoPilotDrawer', action: 'handleCopilotSearch' });
      toast.error("Failed to get response from Co-Pilot");
      setError({
        error: err instanceof Error ? err.message : "Unknown error",
        stage: 'generate'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleAgentChange = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    setSelectedAgent(agent || null);
    setMessages([]);
    toast.success(`Switched to ${agent?.name || 'Co-Pilot'}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.info(`Analyzing ${file.name}...`);
    const userMessage: Message = { 
      role: 'user', 
      content: `📎 Uploaded: ${file.name}` 
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Simulate file analysis with cleanup
    const timeoutId = setTimeout(() => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: `I've received ${file.name}. File upload analysis is coming soon. For now, please describe what you'd like to know about this file.`,
        metrics: { latency_ms: 0, model: 'gemini-2.5-flash', grounded: false }
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  };

  const handleFollowUp = (question: string) => {
    setInput(question);
    // Use requestAnimationFrame for better performance and automatic cleanup
    requestAnimationFrame(() => handleSend());
  };

  const getActionIcon = (intent?: string) => {
    switch (intent) {
      case 'automation': return Wrench;
      case 'kpi': return BarChart3;
      case 'compliance': return Shield;
      case 'knowledge': return BookOpen;
      default: return Sparkles;
    }
  };

  const getActionButton = (intent?: string) => {
    switch (intent) {
      case 'automation':
        return (
          <Link to="/builder">
            <Button size="sm" variant="outline" className="gap-2">
              <Wrench className="h-3.5 w-3.5" />
              Open in Builder
            </Button>
          </Link>
        );
      case 'kpi':
        return (
          <Link to="/intelligence">
            <Button size="sm" variant="outline" className="gap-2">
              <BarChart3 className="h-3.5 w-3.5" />
              View Intelligence Dashboard
            </Button>
          </Link>
        );
      case 'compliance':
        return (
          <Link to="/compliance">
            <Button size="sm" variant="outline" className="gap-2">
              <Shield className="h-3.5 w-3.5" />
              Check Compliance
            </Button>
          </Link>
        );
      default:
        return null;
    }
  };

  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (text: string, messageId: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(messageId);
      const timeoutId = setTimeout(() => setCopiedId(null), 2000);
      toast.success("Copied to clipboard");
      // Return cleanup function
      return () => clearTimeout(timeoutId);
    }).catch((err) => {
      logger.error('Copy failed', err, { component: 'CoPilotDrawer', action: 'handleCopy' });
      toast.error("Failed to copy");
    });
  };

  const handleExport = () => {
    const content = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'copilot-conversation.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Conversation exported");
  };

  const getSuggestionButton = (text: string) => (
    <button
      onClick={() => {
        setInput(text);
        inputRef.current?.focus();
      }}
      className="w-full text-left p-3 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-muted/50 transition-smooth text-sm group"
    >
      <span className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-smooth" />
        <span className="text-foreground">{text}</span>
      </span>
    </button>
  );

  const getErrorBanner = () => {
    if (!error) return null;

    const bannerContent = {
      config: {
        title: "AI not configured",
        description: "The AI service is temporarily unavailable. Please try again.",
        action: <Button variant="outline" size="sm" onClick={() => setError(null)}>Try Again</Button>
      },
      grounding: {
        title: "Knowledge index is unreachable",
        description: "Check your Data Store / Index ID in Settings → AI Engines.",
        action: <Link to="/settings/ai"><Button variant="outline" size="sm">Check Settings</Button></Link>
      },
      generate: {
        title: "Model call failed",
        description: error.suggestion || "Try again or switch to Gemini 1.5 Flash in Settings.",
        action: <Button variant="outline" size="sm" onClick={() => setError(null)}>Try Again</Button>
      },
      validation: {
        title: "Invalid request",
        description: error.error,
        action: null
      }
    };

    const content = bannerContent[error.stage];

    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{content.title}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{content.description}</p>
          {error.requestId && <p className="text-xs font-mono">Request ID: {error.requestId}</p>}
          {content.action && <div className="mt-2">{content.action}</div>}
        </AlertDescription>
      </Alert>
    );
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-6 right-6 w-[500px] h-[600px] glass-panel rounded-xl shadow-2xl border border-primary/20 z-50 flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedAgent ? <Bot className="h-5 w-5 text-primary" /> : <Sparkles className="h-5 w-5 text-primary" />}
            <div className="flex flex-col gap-0.5">
              <h3 className="font-display font-bold text-sm">{selectedAgent ? `🧠 ${selectedAgent.name}` : 'AURA Co-Pilot'}</h3>
              {selectedAgent && selectedAgent.description && (
                <span className="text-xs text-muted-foreground">{selectedAgent.description.slice(0, 40)}...</span>
              )}
            </div>
            {currentRole && <Badge variant="outline" className="text-xs">{currentRole}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Sheet open={showHistory} onOpenChange={setShowHistory}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" title="Conversation History">
                  <History className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Conversation History</SheetTitle>
                </SheetHeader>
                <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-100px)]">
                  {sessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No previous conversations</p>
                    </div>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-3 rounded-lg border border-border hover:border-primary/50 transition-smooth cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {session.last_query || 'New conversation'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(session.updated_at)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {session.messages.length} messages
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-smooth"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <Link to="/settings/ai">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Agent Selector */}
        {agents.length > 0 && (
          <Select 
            value={selectedAgent?.id || 'copilot'} 
            onValueChange={(value) => value === 'copilot' ? handleAgentChange('') : handleAgentChange(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select AI System or Co-Pilot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="copilot">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>M2M Co-Pilot (Knowledge Search)</span>
                </div>
              </SelectItem>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span>{agent.name}</span>
                    {agent.description && <span className="text-xs text-muted-foreground">- {agent.description.slice(0, 30)}...</span>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {getErrorBanner()}

        {messages.length === 0 ? (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-5 border border-primary/20">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-base font-semibold mb-1">Welcome to M2M Co-Pilot</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                    Your AURA DC assistant. Answers are grounded in the current deterministic simulation run and your workspace data. It reasons about simulated results and does not have access to live facility or NVIDIA DSX data.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary" className="gap-1">
                      <Database className="h-3 w-3" />
                      Simulated Workspace Data
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <BookOpen className="h-3 w-3" />
                      KB v1.0 Trained
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="h-3 w-3" />
                      Enterprise Secure
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-primary"></span>
                Quick start - Ask me anything:
              </p>
              <div className="space-y-2">
                {getSuggestionButton("Explain the PUE result from the current simulation run")}
                {getSuggestionButton("Which cooling scenario produced the best thermal margin?")}
                {getSuggestionButton("Summarise the open recommendations awaiting human review")}
                {getSuggestionButton("What evidence supports the carbon intensity figure shown?")}
                {getSuggestionButton("Compare the baseline and degraded cooling scenarios")}
                {getSuggestionButton("Which metrics on this page are simulated rather than measured?")}
                {getSuggestionButton("Walk me through the simulation inputs for this facility")}
                {getSuggestionButton("What would need to be connected before these values are operational?")}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`max-w-[85%] rounded-xl ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20' 
                    : 'bg-card border border-border shadow-sm'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border/50">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">M2M Co-Pilot</span>
                    </div>
                  )}
                  
                  <div className={msg.role === 'user' ? 'p-4' : 'p-4 pt-3'}>
                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-strong:font-semibold prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground prose-li:my-1">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="my-2 ml-4 space-y-1.5">{children}</ul>,
                            ol: ({ children }) => <ol className="my-2 ml-4 space-y-1.5">{children}</ol>,
                            li: ({ children }) => (
                              <li className="text-sm leading-relaxed">
                                <span className="text-primary mr-2">•</span>
                                {children}
                              </li>
                            ),
                            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                            code: ({ children }) => <code className="text-xs">{children}</code>,
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold mb-1.5 mt-2 first:mt-0">{children}</h3>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  
                  {msg.role === 'assistant' && (
                    <div className="px-4 pb-3 space-y-3 border-t border-border/50 pt-3 mt-2">
                      {/* Evidence boundary — every answer states its source of truth */}
                      <p
                        data-testid="assistant-evidence-boundary"
                        className="text-[11px] leading-snug text-muted-foreground"
                      >
                        {evidenceBoundaryNotice()}
                      </p>
                      {/* Data Sources & Knowledge Badge */}
                      {(msg.dataSources || msg.knowledgeCount) && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {msg.dataSources?.includes('ai_systems') && (
                            <Badge variant="outline" className="text-xs gap-1 bg-blue-500/10 border-blue-500/20">
                              <Sparkles className="h-3 w-3" />
                              AI Systems
                            </Badge>
                          )}
                          {msg.dataSources?.includes('analytics') && (
                            <Badge variant="outline" className="text-xs gap-1 bg-purple-500/10 border-purple-500/20">
                              <BarChart3 className="h-3 w-3" />
                              Analytics
                            </Badge>
                          )}
                          {msg.dataSources?.includes('compliance') && (
                            <Badge variant="outline" className="text-xs gap-1 bg-red-500/10 border-red-500/20">
                              <Shield className="h-3 w-3" />
                              Compliance
                            </Badge>
                          )}
                          {msg.dataSources?.includes('workflows') && (
                            <Badge variant="outline" className="text-xs gap-1 bg-green-500/10 border-green-500/20">
                              <Wrench className="h-3 w-3" />
                              Workflows
                            </Badge>
                          )}
                          {msg.dataSources?.includes('knowledge_base') && msg.knowledgeCount && (
                            <Badge variant="outline" className="text-xs gap-1 bg-amber-500/10 border-amber-500/20">
                              <BookOpen className="h-3 w-3" />
                              {msg.knowledgeCount} Knowledge Sources
                            </Badge>
                          )}
                          {msg.dataSources?.includes('model_configs') && (
                            <Badge variant="outline" className="text-xs gap-1 bg-indigo-500/10 border-indigo-500/20">
                              <Settings className="h-3 w-3" />
                              Model Configs
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div>
                          <button
                            onClick={() => setExpandedCitations(expandedCitations === idx ? null : idx)}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-smooth mb-2"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="font-medium">{msg.citations.length} source{msg.citations.length > 1 ? 's' : ''}</span>
                          </button>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {msg.citations.map((citation) => (
                              <a
                                key={citation.id}
                                href={citation.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-smooth text-xs"
                                title={citation.title}
                              >
                                <span className="font-mono font-bold text-primary">[{citation.id}]</span>
                                <span className="text-muted-foreground">{citation.domain}</span>
                              </a>
                            ))}
                          </div>
                          {expandedCitations === idx && (
                            <div className="space-y-2 animate-fade-in">
                              {msg.citations.map((citation) => (
                                <div
                                  key={citation.id}
                                  className="p-2.5 rounded-lg bg-muted/50 border border-border/50"
                                >
                                  <div className="flex items-start gap-2 mb-1">
                                    <span className="font-mono text-xs font-bold text-primary">[{citation.id}]</span>
                                    <div className="flex-1">
                                      <a
                                        href={citation.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-xs text-foreground hover:text-primary transition-smooth"
                                      >
                                        {citation.title}
                                      </a>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{citation.snippet}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Follow-up Questions */}
                      {msg.followUps && msg.followUps.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Follow-up questions:</p>
                          <div className="flex flex-wrap gap-2">
                            {msg.followUps.map((q, qidx) => (
                              <button
                                key={qidx}
                                onClick={() => handleFollowUp(q)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-muted/50 transition-smooth"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Actions & Metrics */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          {getActionButton(msg.intent)}
                          {msg.metrics && (
                            <>
                              <Badge variant="outline" className="text-xs h-5">
                                {msg.metrics.model.replace('gemini-2.5-', '')}
                              </Badge>
                              {msg.metrics.grounded && (
                                <Badge variant="secondary" className="text-xs h-5 bg-primary/10 text-primary border-primary/20">
                                  {msg.metrics.coverage} sources
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(msg.content, idx)}
                          className="h-7 text-xs hover:bg-muted"
                        >
                          {copiedId === idx ? (
                            <>
                              <Check className="h-3 w-3 mr-1 text-primary" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-card border border-border shadow-sm rounded-xl p-4 flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader className="h-3.5 w-3.5 animate-spin text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-3">
        {messages.length > 0 && (
          <div className="flex items-center justify-end text-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="h-7 text-xs"
            >
              <FileDown className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.csv"
          />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Upload file"
            className="h-10 px-3"
          >
            <Upload className="h-4 w-4" />
          </Button>

          <CoPilotVoice onTranscript={(text) => setInput(text)} />

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything or use /list, /use [agent], /reset, /params"
            disabled={isLoading || isStreaming}
            className="flex-1 px-3 py-2 rounded-lg bg-input border border-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-smooth disabled:opacity-50"
          />
          {isStreaming ? (
            <Button
              onClick={handleStopStreaming}
              size="sm"
              variant="destructive"
              className="h-10 gap-2"
            >
              <StopCircle className="h-4 w-4" />
              Stop
            </Button>
          ) : (
            <Button 
              size="sm" 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="glow-yellow h-10"
            >
              {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
