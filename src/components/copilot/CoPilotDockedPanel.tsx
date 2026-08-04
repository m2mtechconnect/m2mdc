/**
 * Co-Pilot Docked Panel
 * 
 * Right-side docked assistant panel with streaming responses,
 * context chips, and structured 4-section layout.
 * Now integrated with DC domain context and quick chips.
 * P0 fix: Context-aware in Simulation mode with badge indicator.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, StopCircle, Sparkles, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CoPilotContextChips } from './CoPilotContextChips';
import { CoPilotStructuredResponse } from './CoPilotStructuredResponse';
import { CoPilotFormattedContent } from './CoPilotFormattedContent';
import { DCCoPilotChips } from './DCCoPilotChips';
import { SimulationContextBadge } from './SimulationContextBadge';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { useCoPilotCommands } from '@/contexts/CoPilotCommandContext';
import { logCoPilotEvent } from '@/lib/copilot/analytics';
import { getModelDisplayName, getModelVersion } from '@/lib/copilot/copilotConfig';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useCoPilotSimulationContext } from '@/hooks/useCoPilotSimulationContext';
import { COPILOT } from '@/ux';

// Global tracker: the last element that received focus before the
// CoPilot drawer captured it. A launcher (e.g. CoPilotBubble) that
// conditionally unmounts on open would otherwise be lost by the time
// the drawer's effect reads `document.activeElement`.
let lastFocusedBeforeCoPilot: HTMLElement | null = null;
if (typeof document !== 'undefined') {
  document.addEventListener(
    'focusin',
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target || target === document.body) return;
      // Ignore focus that lands inside the CoPilot drawer itself.
      if (target.closest?.('[role="dialog"][aria-label="' + 'Data Centre Co-Pilot' + '"]')) {
        return;
      }
      lastFocusedBeforeCoPilot = target;
    },
    true,
  );
}

interface CoPilotDockedPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Detect if we're on a DC-related page
function useDCPageContext() {
  const location = useLocation();
  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  
  const isDCPage = path.includes('/data-centre-twin') || 
                   path.includes('/blueprint') ||
                   path.includes('/builder');
  
  // Determine active tab from path or query
  let activeTab = 'overview';
  if (path.includes('/simulation') || searchParams.get('view') === 'simulation') {
    activeTab = 'simulation';
  } else if (path.includes('/thermal')) {
    activeTab = 'thermal';
  } else if (path.includes('/power')) {
    activeTab = 'power';
  } else if (path.includes('/cooling')) {
    activeTab = 'cooling';
  } else if (path.includes('/network')) {
    activeTab = 'network';
  } else if (path.includes('/workload')) {
    activeTab = 'workload';
  } else if (path.includes('/sovereignty')) {
    activeTab = 'sovereignty';
  } else if (path.includes('/financial')) {
    activeTab = 'financial';
  } else if (path.includes('/builder')) {
    activeTab = 'builder';
  } else if (path.includes('/blueprint')) {
    activeTab = 'blueprint';
  }
  
  // Determine page context
  let pageContext = 'dashboard';
  if (path.includes('/data-centre-twin')) {
    pageContext = 'dashboard';
  } else if (path.includes('/blueprint')) {
    pageContext = 'blueprint';
  } else if (path.includes('/builder')) {
    pageContext = 'builder';
  }
  
  return { isDCPage, activeTab, pageContext };
}

export function CoPilotDockedPanel({ isOpen, onClose }: CoPilotDockedPanelProps) {
  const [input, setInput] = useState('');
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  
  const { isDCPage, activeTab, pageContext } = useDCPageContext();
  const { executeCommand } = useCoPilotCommands();
  
  // Get active twin context
  const { activeTwinId, twin, location } = useActiveTwin();
  
  // Get simulation context for context-aware CoPilot (P0 fix)
  const { hasSimulationContext, contextSummary, simulationContextPayload } = useCoPilotSimulationContext();
  
  const { 
    context, 
    updateContext,
    messages, 
    isStreaming, 
    sendMessage, 
    stopStreaming,
    error,
    memoryEnabled,
    setMemoryEnabled,
  } = useCoPilotContext();
  
  // Update CoPilot context when twin changes
  useEffect(() => {
    if (activeTwinId) {
      updateContext({
        agentId: activeTwinId,
        twinId: activeTwinId,
        twin: twin ? {
          name: twin.name,
          city: twin.city,
          region: twin.region_code,
          tier: twin.tier,
          capacity_kw: twin.capacity_kw,
          industry: twin.industry,
          sovereignty_level: twin.sovereignty_level,
          pue_target: twin.pue_target,
        } : undefined,
        location: location ? {
          name: location.name,
          city: location.city,
          province: location.province,
          country: location.country,
          cloud_region: location.cloud_region,
          provider_type: location.provider_type,
          industry: location.industry,
        } : undefined,
      });
    }
  }, [activeTwinId, twin, location, updateContext]);
  

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (!isOpen || !inputRef.current) return;
    const t = setTimeout(() => {
      // Guard against late fires after the drawer has been closed —
      // otherwise this steals focus away from the launcher during
      // return-focus restoration.
      if (isOpen && inputRef.current) inputRef.current.focus();
    }, 100);
    return () => clearTimeout(t);
  }, [isOpen, context, isDCPage]);

  // Save the previously focused element when opening, and restore it on close.
  useEffect(() => {
    if (isOpen) {
      // At the moment this effect fires, React has already committed the
      // parent's re-render — if the launcher (e.g. CoPilotBubble) is
      // conditionally unmounted while `isOpen`, `document.activeElement`
      // will be <body> and the true launcher is lost. Use the last
      // element that received focus BEFORE the drawer captured it.
      const active = document.activeElement as HTMLElement | null;
      previouslyFocusedRef.current =
        active && active !== document.body ? active : lastFocusedBeforeCoPilot;
      return;
    }
    const prev = previouslyFocusedRef.current;
    const restoreLabel =
      prev?.getAttribute?.('aria-label') ?? null;
    // Defer so React finishes re-mounting the launcher (e.g. the
    // CoPilotBubble unmounts while the drawer is open and re-mounts on
    // close, so `prev` may point to a detached DOM node).
    setTimeout(() => {
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
        prev.focus();
        return;
      }
      if (restoreLabel) {
        const fallback = document.querySelector<HTMLElement>(
          `[aria-label="${restoreLabel.replace(/"/g, '\\"')}"]`,
        );
        fallback?.focus();
      }
    }, 0);
    previouslyFocusedRef.current = null;
  }, [isOpen]);

  // Focus trap: keep Tab / Shift+Tab within the drawer, and close on Escape.
  useEffect(() => {
    if (!isOpen) return;

    const FOCUSABLE_SELECTOR = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      'summary',
      '[role="button"]:not([aria-disabled="true"])',
    ].join(',');

    const getFocusable = (): HTMLElement[] => {
      const root = panelRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (el) =>
          !el.hasAttribute('disabled') &&
          el.getAttribute('aria-hidden') !== 'true' &&
          // rough visibility check
          (el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement),
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = getFocusable();
      if (focusables.length === 0) {
        e.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const panel = panelRef.current;

      // If focus escaped the panel entirely, pull it back.
      if (!panel || !active || !panel.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

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
    // Check if this is a command action
    if (action.handler && action.handler.startsWith('cmd:')) {
      const [, commandName, ...args] = action.handler.split(':');
      executeCommand(commandName, args.join(':') || undefined);
    }
    
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
  
  // Handler for DC quick chip clicks
  const handleDCChipClick = (query: string) => {
    handleSend(query);
  };

  return (
    <>
      {/* Backdrop — click to close. Rendered as sibling so it does not
          intercept focus inside the drawer. Only interactive while open. */}
      <div
        data-testid="copilot-backdrop"
        aria-hidden="true"
        onClick={() => {
          if (isOpen) onClose();
        }}
        className={cn(
          'fixed inset-0 z-40 bg-background/40 backdrop-blur-[1px] transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />
      <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={COPILOT.TITLE}
      tabIndex={-1}
      className={cn(
        'fixed right-0 top-0 h-full bg-background border-l border-border shadow-2xl transition-transform duration-300 ease-in-out z-50',
        'flex flex-col',
        isOpen ? 'translate-x-0' : 'translate-x-full',
        'w-full max-w-[480px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{COPILOT.TITLE}</h2>
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
      
      {/* Simulation Context Badge - P0 fix: Shows when CoPilot is using simulation context */}
      {hasSimulationContext && contextSummary && (
        <div className="px-4 py-2 border-b border-border bg-muted/20">
          <SimulationContextBadge
            scenarioName={contextSummary.scenarioName}
            progress={contextSummary.progress / 100}
            isRunning={contextSummary.isRunning}
          />
        </div>
      )}

      {/* Context Chips - Show DC chips when on DC pages */}
      {isDCPage ? (
        <DCCoPilotChips 
          pageContext={pageContext}
          activeTab={activeTab}
          onChipClick={handleDCChipClick}
          maxChips={6}
        />
      ) : (
        <CoPilotContextChips context={context} />
      )}

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
              <p className="text-sm mb-3">{COPILOT.PLACEHOLDER}</p>
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
            <Button onClick={handleStop} size="icon" variant="destructive" aria-label="Stop response">
              <StopCircle className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={() => handleSend()} size="icon" disabled={!input.trim()} aria-label="Send message">
              <Send className="h-4 w-4" aria-hidden="true" />
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
    </>
  );
}
