import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { handleError } from "@/lib/errorHandlers";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  agentDescription: string;
  department?: string;
  desiredOutcome?: string;
  successMetric?: string;
  workflow?: string;
  model?: string;
}

export function AgentChatModal({ 
  isOpen, 
  onClose, 
  agentName, 
  agentDescription,
  department = "General",
  desiredOutcome = "Automation",
  successMetric = "Efficiency",
  workflow = "Standard",
  model = "google/gemini-2.5-flash"
}: AgentChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello! I'm the ${agentName}. ${agentDescription}\n\nHow can I help you today?`
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset messages when modal opens
  useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          role: "assistant",
          content: `Hello! I'm the ${agentName}. ${agentDescription}\n\nHow can I help you today?`
        }
      ]);
      setInput("");
    }
  }, [isOpen, agentName, agentDescription]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      logger.debug('Sending message to agent-plan-chat', { component: 'AgentChatModal', action: 'handleSend', metadata: { agentName } });

      const { data, error } = await supabase.functions.invoke('agent-plan-chat', {
        body: {
          message: userMessage,
          agentName,
          agentDescription,
          department,
          desiredOutcome,
          successMetric,
          workflow,
          model
        }
      });

      if (error) {
        logger.error('Supabase function error', error, { component: 'AgentChatModal', action: 'handleSend' });
        throw error;
      }

      logger.debug('Received response from agent-plan-chat', { component: 'AgentChatModal', action: 'handleSend' });

      const aiResponse = data?.response || "I'm sorry, I couldn't generate a response.";
      
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: aiResponse 
      }]);
    } catch (error) {
      handleError(error, {
        component: 'AgentChatModal',
        action: 'handleSend',
        fallbackMessage: 'Failed to send message. Please try again.'
      });
      
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Chat with {agentName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollRef}>
          <div className="space-y-4 pb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-accent" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about this agent..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
