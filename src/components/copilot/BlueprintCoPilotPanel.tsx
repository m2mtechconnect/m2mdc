/**
 * Blueprint Co-Pilot Panel (Design-Time Assistant)
 * 
 * Context-aware Co-Pilot panel for Blueprint Designer mode.
 * Helps design better twins with validation-aware suggestions.
 */

import { useState, useCallback, useMemo } from 'react';
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
  Layers,
  Gauge,
  GitBranch,
  ShieldAlert,
} from 'lucide-react';
import { useCoPilotPayload } from '@/hooks/useCoPilotPayload';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { cn } from '@/lib/utils';
import type { CoPilotQuickAction } from '@/types/copilotContext';
import { quickPromptsForTab, BLUEPRINT_TAB_PROMPTS } from './blueprintTabPrompts';
import { BLUEPRINT_TAB_LABELS } from '@/pages/blueprint/tabModel';

interface BlueprintCoPilotPanelProps {
  className?: string;
  activeTab?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Wand2,
  Zap,
  AlertTriangle,
  Lightbulb,
  Layers,
  Gauge,
  GitBranch,
  ShieldAlert,
  CheckCircle2,
};

export function BlueprintCoPilotPanel({ className, activeTab }: BlueprintCoPilotPanelProps) {
  const [input, setInput] = useState('');
  const payload = useCoPilotPayload({ mode: 'blueprint-designer' });
  const { sendMessage, isStreaming, messages, openWithQuestion } = useCoPilotContext();

  // Quick prompts follow the tab the user is standing on. They only ask the
  // assistant to explain what is already visible, so no permission, ownership
  // or simulation state changes.
  const quickActions = useMemo(() => quickPromptsForTab(activeTab), [activeTab]);
  const tabPromptCount = activeTab && activeTab in BLUEPRINT_TAB_PROMPTS
    ? BLUEPRINT_TAB_PROMPTS[activeTab as keyof typeof BLUEPRINT_TAB_PROMPTS].length
    : 0;
  const tabLabel = activeTab ? BLUEPRINT_TAB_LABELS[activeTab as keyof typeof BLUEPRINT_TAB_LABELS] : undefined;

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
          {tabLabel && (
            <Badge variant="outline" className="text-xs">
              Tab: {tabLabel}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Quick Actions */}
        <div className="p-3 border-b">
          <p className="text-xs text-muted-foreground mb-2">
            {tabLabel ? `Quick prompts for ${tabLabel}:` : 'Quick prompts:'}
          </p>
          <div className="flex flex-wrap gap-1.5" data-testid="blueprint-quick-prompts">
            {quickActions.map((action, index) => {
              const Icon = iconMap[action.icon || ''] || Sparkles;
              return (
                <Button
                  key={action.id}
                  variant={index < tabPromptCount ? 'secondary' : 'outline'}
                  data-tab-prompt={index < tabPromptCount ? 'true' : 'false'}
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
