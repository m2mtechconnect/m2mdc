/**
 * Blueprint Co-Pilot Panel (Design-Time Assistant)
 * 
 * Context-aware Co-Pilot panel for Blueprint Designer mode.
 * Helps design better twins with validation-aware suggestions.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  Brain, 
  Sparkles, 
  Send, 
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Wand2,
  FileText,
  Zap,
} from 'lucide-react';
import { useCoPilotPayload } from '@/hooks/useCoPilotPayload';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { cn } from '@/lib/utils';
import type { CoPilotQuickAction } from '@/types/copilotContext';

interface BlueprintCoPilotPanelProps {
  className?: string;
  activeTab?: string;
}

// Quick actions for Blueprint Designer mode
const BLUEPRINT_QUICK_ACTIONS: CoPilotQuickAction[] = [
  {
    id: 'explain-design',
    label: 'Explain current design',
    icon: 'FileText',
    prompt: 'Explain the current blueprint design including domains, agents, KPIs, workflows, and scenarios. Highlight the key architectural decisions and their rationale.',
  },
  {
    id: 'suggest-agents',
    label: 'Suggest missing agents',
    icon: 'Wand2',
    prompt: 'Based on the industry, tier, and capacity of this twin, suggest any agents that might be missing or should be enabled for optimal operations.',
  },
  {
    id: 'optimize-scenarios',
    label: 'Recommend optimization scenarios',
    icon: 'Zap',
    prompt: 'Recommend optimization scenarios that could improve carbon footprint, ROI, or thermal risk based on the current configuration.',
  },
  {
    id: 'fix-validation',
    label: 'Fix validation issues',
    icon: 'AlertTriangle',
    prompt: 'Review the current validation warnings and issues. Explain why each exists and provide specific steps to resolve them.',
  },
  {
    id: 'summarize-changes',
    label: 'Summarize recent changes',
    icon: 'FileText',
    prompt: 'Summarize the recent changes made to this blueprint from the change log and explain their potential impact.',
  },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Wand2,
  Zap,
  AlertTriangle,
  Lightbulb,
};

export function BlueprintCoPilotPanel({ className, activeTab }: BlueprintCoPilotPanelProps) {
  const [input, setInput] = useState('');
  const payload = useCoPilotPayload({ mode: 'blueprint-designer' });
  const { sendMessage, isStreaming, messages, openWithQuestion } = useCoPilotContext();

  const handleQuickAction = useCallback((action: CoPilotQuickAction) => {
    openWithQuestion(action.prompt);
  }, [openWithQuestion]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput('');
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (!payload) {
    return (
      <Card className={cn('h-full', className)}>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No blueprint data available</p>
        </CardContent>
      </Card>
    );
  }

  const hasValidationIssues = (payload.validationReport?.issues.length || 0) > 0;
  const readinessScore = payload.readinessScore || 0;

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Design Assistant
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Blueprint Designer
          </Badge>
        </div>
        
        {/* Context Summary */}
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <Badge variant="secondary" className="text-xs">
            {payload.overview.twinName}
          </Badge>
          <Badge 
            variant={readinessScore >= 80 ? 'default' : readinessScore >= 60 ? 'secondary' : 'destructive'} 
            className="text-xs"
          >
            Readiness: {readinessScore}%
          </Badge>
          {hasValidationIssues && (
            <Badge variant="outline" className="text-xs text-warning">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {payload.validationReport?.issues.length} issues
            </Badge>
          )}
          {activeTab && (
            <Badge variant="outline" className="text-xs capitalize">
              Tab: {activeTab}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Quick Actions */}
        <div className="p-3 border-b">
          <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-1.5">
            {BLUEPRINT_QUICK_ACTIONS.map((action) => {
              const Icon = iconMap[action.icon || ''] || Sparkles;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleQuickAction(action)}
                  disabled={isStreaming}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Ask Co-Pilot about your blueprint design</p>
              <p className="text-xs mt-1">
                I can explain designs, suggest improvements, and help fix validation issues.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-3 rounded-lg text-sm',
                    msg.role === 'user' 
                      ? 'bg-primary/10 ml-8' 
                      : 'bg-muted mr-8'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.streaming && (
                    <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about blueprint design..."
              className="min-h-[60px] resize-none text-sm"
              disabled={isStreaming}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="h-[60px] w-[60px]"
              aria-label={isStreaming ? "Sending message" : "Send message"}
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
