import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Send, Bot, User, Loader2, ArrowLeft, ChevronDown, Info, Sparkles, History } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CustomQuestionsManager } from "@/components/agent-chat/CustomQuestionsManager";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { format } from "date-fns";
import { ConversationHistory } from "@/components/agent-chat/ConversationHistory";
import { DCCard } from "@/components/dc-ui";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  id?: string;
}

export default function AgentChat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: agentId } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [aboutOpen, setAboutOpen] = useState(false);

  const { data: agent, isLoading: isLoadingAgent } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      if (!agentId) return null;
      
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching agent:', error);
        throw error;
      }
      
      return data;
    },
    enabled: !!agentId,
  });

  // Fetch or create current conversation
  const { data: conversation } = useQuery({
    queryKey: ['current-conversation', agentId],
    queryFn: async () => {
      if (!agentId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get the most recent conversation for this agent
      const { data: existingConversations } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('agent_id', agentId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (existingConversations && existingConversations.length > 0) {
        return existingConversations[0];
      }

      // Create a new conversation if none exists
      const { data: newConversation, error } = await supabase
        .from('agent_conversations')
        .insert({
          agent_id: agentId,
          user_id: user.id,
          title: `Chat with ${agent?.name || 'Agent'}`,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      return newConversation;
    },
    enabled: !!agentId && !!agent,
  });

  // Load conversation messages
  const { data: conversationMessages } = useQuery({
    queryKey: ['conversation-messages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      
      const { data, error } = await supabase
        .from('agent_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      return data.map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));
    },
    enabled: !!conversation?.id,
  });

  // Set current conversation and load messages
  useEffect(() => {
    if (conversation) {
      setCurrentConversationId(conversation.id);
    }
  }, [conversation]);

  useEffect(() => {
    if (conversationMessages && conversationMessages.length > 0) {
      setMessages(conversationMessages);
    }
  }, [conversationMessages]);

  const handleNewConversation = async () => {
    if (!agentId) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create new conversation
    const { data: newConversation, error } = await supabase
      .from('agent_conversations')
      .insert({
        agent_id: agentId,
        user_id: user.id,
        title: `Chat with ${agent?.name || 'Agent'}`,
      })
      .select()
      .maybeSingle();

    if (error) {
      toast.error("Failed to create new conversation");
      return;
    }

    if (!newConversation) {
      toast.error("Failed to create conversation");
      return;
    }

    setCurrentConversationId(newConversation.id);
    setMessages([]);
    setHistoryOpen(false);
    toast.success("Started new conversation");
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setHistoryOpen(false);
    // Invalidate and refetch messages for the selected conversation
    queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
  };
  const { data: customQuestions = [] } = useQuery({
    queryKey: ['custom-questions', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('agent_custom_questions')
        .select('*')
        .eq('user_id', user.id)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching custom questions:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!agentId,
  });

  // Extract config as typed object
  const config = agent?.config as any || {};
  const modelId = agent?.model_id || config?.model || 'google/gemini-2.5-flash';
  const department = config?.department || null;

  // Combine default and custom questions
  const defaultQuestions = [
    "What can you help me with?",
    "What are your main capabilities?",
    "Show me an example of what you can do",
    "How do I get started?",
    "What tools do you have access to?",
  ];

  const allQuestions = [
    ...customQuestions.map((q: any) => q.question_text),
    ...defaultQuestions,
  ];

  // Build system prompt from agent metadata
  const systemPrompt = agent ? `You are the deployed agent for "${agent.name}".
${department ? `Department: ${department}` : ''}
${agent.description ? `Primary purpose: ${agent.description}` : ''}
${config?.system_prompt ? `\n${config.system_prompt}` : ''}
${agent.model_id ? `\nLLM: ${agent.model_id}` : ''}

When asked "what do you do" or similar, give a concise outline of your capabilities and typical tasks based on your purpose and configuration.` : '';

  useEffect(() => {
    checkAuth();
    if (!agentId) {
      toast.error("Agent ID is required");
      navigate("/");
    }
  }, [agentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to use the agent");
      navigate("/auth");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !agentId || !agent || !currentConversationId) return;

    const userMessage: Message = { role: "user", content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Save user message to database
      const { data: savedUserMessage, error: userMsgError } = await supabase
        .from('agent_messages')
        .insert({
          conversation_id: currentConversationId,
          role: 'user',
          content: input,
        })
        .select()
        .maybeSingle();

      if (userMsgError) throw userMsgError;
      if (!savedUserMessage) throw new Error("Failed to create message");

      // Build messages with system prompt and recent history (last 10 messages for context)
      const recentMessages = messages.slice(-10);
      const allMessages = [
        { role: "system", content: systemPrompt },
        ...recentMessages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: input },
      ];

      // Add empty assistant message for streaming
      setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: new Date() }]);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-stream`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          agentId,
          messages: allMessages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: "assistant",
                      content: fullResponse,
                      timestamp: newMessages[newMessages.length - 1].timestamp,
                    };
                    return newMessages;
                  });
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }

      // Save assistant response to database
      if (fullResponse) {
        const { error: assistantMsgError } = await supabase
          .from('agent_messages')
          .insert({
            conversation_id: currentConversationId,
            role: 'assistant',
            content: fullResponse,
          });

        if (assistantMsgError) console.error('Error saving assistant message:', assistantMsgError);

        // Update conversation updated_at timestamp
        await supabase
          .from('agent_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', currentConversationId);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl h-screen flex flex-col">
      {/* Compact Header */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-3 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        
        {isLoadingAgent ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        ) : agent ? (
          <div className="space-y-3">
            {/* Agent Header Card */}
            <DCCard className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10" noPadding>
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-xl font-bold truncate">{agent.name}</h1>
                      <p className="text-xs text-muted-foreground">
                        {department && `${department} • `}
                        {modelId}
                      </p>
                    </div>
                  </div>
                  {agent.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge 
                    variant={agent.status === 'active' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {agent.status}
                  </Badge>
                  {agent.version && (
                    <Badge variant="outline">v{agent.version}</Badge>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 px-4 pb-4 border-t border-border/50">
                <Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-2">
                      <Info className="h-3 w-3" />
                      About
                      <ChevronDown className={`h-3 w-3 transition-transform ${aboutOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
                
                <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-2">
                      <History className="h-3 w-3" />
                      History
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SheetHeader>
                      <SheetTitle>Chat History</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 h-[calc(100vh-8rem)]">
                      <ConversationHistory
                        agentId={agentId!}
                        currentConversationId={currentConversationId}
                        onSelectConversation={handleSelectConversation}
                        onNewConversation={handleNewConversation}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
                
                {agentId && <CustomQuestionsManager agentId={agentId} />}
              </div>

              {/* Collapsible Content */}
              <Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
                <CollapsibleContent className="mt-3 px-4 pb-4">
                  <div className="p-3 rounded-lg bg-background/50 border space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="font-medium text-xs mb-1 text-muted-foreground">LLM Model</p>
                        <p className="text-sm">{modelId}</p>
                      </div>
                      {department && (
                        <div>
                          <p className="font-medium text-xs mb-1 text-muted-foreground">Department</p>
                          <p className="text-sm">{department}</p>
                        </div>
                      )}
                    </div>
                    {config.system_prompt && (
                      <div>
                        <p className="font-medium text-xs mb-1 text-muted-foreground">System Instructions</p>
                        <p className="text-xs text-muted-foreground line-clamp-3">{config.system_prompt}</p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </DCCard>

            {/* Draft Warning */}
            {agent.status === 'draft' && (
              <DCCard status="warning" className="bg-amber-500/5 border-amber-500/20" noPadding>
                <p className="p-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <Info className="h-3 w-3" />
                  This agent is in draft mode. Deploy it to enable full functionality.
                </p>
              </DCCard>
            )}
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold">Agent Chat</h1>
            <p className="text-sm text-muted-foreground">Loading agent...</p>
          </div>
        )}
      </div>

      <DCCard className="flex-1 flex flex-col overflow-hidden shadow-lg" noPadding>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && agent && (
            <div className="text-center py-8 md:py-12 space-y-6">
              <div className="space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Ready to assist</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {agent.description || 'Ask me anything related to my capabilities and I\'ll help you achieve your goals.'}
                </p>
              </div>
              
              {/* Suggested Questions Cards */}
              <div className="space-y-4 max-w-3xl mx-auto">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suggested Questions</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allQuestions.slice(0, 6).map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(question);
                        setTimeout(() => handleSend(), 100);
                      }}
                      className="group relative p-4 text-left rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/20 transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-sm font-medium flex-1">{question}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className="flex flex-col gap-1 max-w-[80%]">
                <div
                  className={`rounded-lg p-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className={`text-xs text-muted-foreground ${msg.role === "user" ? "text-right" : "text-left"}`}>
                  {format(msg.timestamp, "h:mm a")}
                </span>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.content && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="rounded-lg px-5 py-3 bg-muted">
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t bg-background">
          {/* Show suggested questions when there are messages */}
          {messages.length > 0 && !isStreaming && allQuestions.length > 0 && (
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap mr-1">Quick replies:</span>
                {allQuestions.slice(0, 4).map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(question);
                      setTimeout(() => handleSend(), 100);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 transition-all whitespace-nowrap"
                  >
                    <Sparkles className="h-3 w-3" />
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="p-4">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message... (Shift+Enter for new line)"
                className="min-h-[60px] resize-none"
                disabled={isStreaming}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                size="icon"
                className="h-[60px] w-[60px]"
              >
                {isStreaming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DCCard>
    </div>
  );
}
