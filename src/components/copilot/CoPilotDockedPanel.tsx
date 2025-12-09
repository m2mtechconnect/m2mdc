/**
 * Co-Pilot Docked Panel
 * 
 * Right-side docked assistant panel with streaming responses,
 * context chips, and structured 4-section layout.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, StopCircle, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CoPilotContextChips } from './CoPilotContextChips';
import { CoPilotStructuredResponse } from './CoPilotStructuredResponse';
import { CoPilotFormattedContent } from './CoPilotFormattedContent';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { logCoPilotEvent } from '@/lib/copilot/analytics';
import { getModelDisplayName, getModelVersion } from '@/lib/copilot/copilotConfig';

interface CoPilotDockedPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CoPilotDockedPanel({ isOpen, onClose }: CoPilotDockedPanelProps) {
  const [input, setInput] = useState('');
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    context, 
    messages, 
    isStreaming, 
    sendMessage, 
    stopStreaming,
    error,
    memoryEnabled,
    setMemoryEnabled,
  } = useCoPilotContext();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      console.log('[CoPilot] Panel opened, context:', context);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, context]);

  const handleSend = useCallback(async (overrideMessage?: string) => {
    const text = (overrideMessage ?? input).trim();
    if (!text) return;

    console.log('[CoPilotPanel] handleSend:', text);
    await sendMessage(text);

    if (!overrideMessage) {
      setInput('');
    }
  }, [input, sendMessage]);

  const handleStop = () => {
    stopStreaming();
  };

  const handleFollowUp = (question: string) => {
    setInput(question);
    setTimeout(() => handleSend(question), 100);
  };

  const handleActionClick = async (action: any) => {
    // Lightweight analytics for action clicks
    await logCoPilotEvent({
      sessionId,
      context,
      prompt: messages[messages.length - 2]?.content || '',
      responseSummary: '',
      actionClicked: action.label,
      latencyMs: 0,
    });

    console.log('Action clicked:', action);
  };

  return (
    <div
      className={cn(
        'fixed right-0 top-0 h-full bg-background border-l border-border shadow-2xl transition-transform duration-300 ease-in-out z-50',
        'flex flex-col',
        isOpen ? 'translate-x-0' : 'translate-x-full',
        'w-[480px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Data Centre Co-Pilot</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            console.log('[CoPilotPanel] Close button clicked');
            onClose();
          }}
          className="h-8 w-8 hover:bg-muted"
          aria-label="Close Co-Pilot"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Context Chips */}
      <CoPilotContextChips context={context} />

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          {messages.length === 0 && !isStreaming && (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/50" />
              <p className="text-sm mb-3">Ask me about PUE, thermals, workloads, sovereignty, or carbon metrics.</p>
              <div className="space-y-2 text-left max-w-xs mx-auto">
                {[
                  { label: 'Cooling adequacy', query: 'Is cooling adequate for current GPU load?' },
                  { label: 'Thermal hotspots', query: 'Identify thermal hotspots in the data center.' },
                  { label: 'Carbon impact', query: 'What is the carbon impact today?' },
                  { label: 'Sovereignty routing', query: 'Has sovereignty routing failed recently?' },
                  { label: 'PUE drift prediction', query: 'Predict next PUE drift event.' },
                  { label: 'Reduce power draw', query: 'How can we reduce power draw?' },
                ].map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => handleFollowUp(suggestion.query)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-all text-left"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'user' ? (
                <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg max-w-[80%]">
                  {msg.content}
                </div>
              ) : (
                <div className="w-full">
                  <div className="bg-muted/50 px-4 py-3 rounded-lg border border-border/30">
                    {msg.streaming && !msg.content && (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    )}
                    {msg.content && (
                      <CoPilotFormattedContent 
                        content={msg.content}
                        context={{
                          industry: context.industry,
                          agentName: context.agentName,
                        }}
                      />
                    )}
                  </div>
                  
                  {/* Structured response (actions, insights, etc.) */}
                  {msg.structured && !msg.streaming && (
                    <CoPilotStructuredResponse
                      data={msg.structured}
                      onActionClick={handleActionClick}
                      onFollowUpClick={handleFollowUp}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-2">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything... (or type /help for commands)"
            disabled={isStreaming}
            className="flex-1"
          />
          {isStreaming ? (
            <Button onClick={handleStop} size="icon" variant="destructive">
              <StopCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => handleSend()} size="icon" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>Powered by {getModelDisplayName()} (v{getModelVersion()})</span>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
              <input
                type="checkbox"
                checked={memoryEnabled}
                onChange={(e) => setMemoryEnabled(e.target.checked)}
                className="w-3 h-3 rounded border-border"
              />
              <span className="text-[10px]">Remember preferences</span>
            </label>
          </div>
          <span>⌘/ to open</span>
        </div>
      </div>
    </div>
  );
}
