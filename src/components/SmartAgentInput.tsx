import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Sparkles, Loader2, Lightbulb, Zap, AlertCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AgentPlanModal } from "@/components/AgentPlanModal";
import { useSearchSuggestions, SearchSuggestion } from "@/hooks/useSearchSuggestions";

interface AgentSuggestion {
  title: string;
  one_liner: string;
  department: string;
  starter_workflow: string;
  recommended_model: string;
  relevance_score: number;
  success_metric: string;
  desired_outcome: string;
}

interface SmartAgentInputProps {
  onUrlAnalysis: (url: string, force?: boolean, deepIngest?: boolean) => void;
  onCoPilotQuery?: (query: string) => void;
  isAnalyzing?: boolean;
  pageContext?: string;
}

export function SmartAgentInput({ 
  onUrlAnalysis, 
  onCoPilotQuery, 
  isAnalyzing = false,
  pageContext = 'dashboard' 
}: SmartAgentInputProps) {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [oldSuggestions, setOldSuggestions] = useState<AgentSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AgentSuggestion | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [forceRecrawl, setForceRecrawl] = useState(false);
  const [deepRecrawl, setDeepRecrawl] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect page context from route if not provided
  const detectedContext = useMemo(() => {
    if (pageContext) return pageContext;
    const path = location.pathname;
    if (path.includes('/agents')) return 'agents';
    if (path.includes('/marketplace') || path.includes('/templates')) return 'marketplace';
    if (path.includes('/builder')) return 'builder';
    return 'dashboard';
  }, [pageContext, location.pathname]);

  // Fetch smart suggestions based on user activity
  const { suggestions: smartSuggestions, isLoading: smartLoading, error: smartError } = useSearchSuggestions({
    pageContext: detectedContext,
    query: query.trim().length > 0 ? query : undefined,
    enabled: true,
  });
  
  // Detect if input looks like a URL
  const looksLikeUrl = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    
    // Starts with http:// or https://
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return true;
    }
    
    // Contains a dot and no spaces, looks like domain
    if (trimmed.includes('.') && !trimmed.includes(' ')) {
      // Basic TLD validation
      const parts = trimmed.split('.');
      if (parts.length >= 2 && parts[parts.length - 1].length >= 2) {
        return true;
      }
    }
    
    return false;
  };

  const isUrl = looksLikeUrl(query);
  const isNaturalLanguage = query.length > 2 && !isUrl;

  const fetchSuggestions = useCallback(async (searchQuery: string, chips: string[]) => {
    if (searchQuery.length < 2 || looksLikeUrl(searchQuery)) {
      setOldSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-suggestions', {
        body: { query: searchQuery, chips }
      });

      if (error) throw error;
      
      if (data?.suggestions) {
        setOldSuggestions(data.suggestions);
        setShowSuggestions(true);
        
        // Log cache status for debugging
        if (data.cached) {
          console.log('Loaded suggestions from cache');
        }
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setOldSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.length >= 2 && !looksLikeUrl(query)) {
      debounceTimer.current = setTimeout(() => {
        fetchSuggestions(query, selectedChips);
      }, 250);
    } else {
      setOldSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, selectedChips, fetchSuggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error("Please enter a URL or ask Co-Pilot a question");
      return;
    }

    console.log("[SmartAgentInput] Submit", { query, isUrl });

    if (isUrl) {
      // URL branch: trigger existing URL scanner
      onUrlAnalysis(query, forceRecrawl, deepRecrawl);
    } else {
      // Co-Pilot branch: open chat with seeded message
      if (onCoPilotQuery) {
        console.log("[SmartAgentInput] Forwarding Co-Pilot query to Co-Pilot context");
        onCoPilotQuery(query);
      } else {
        toast.info("Co-Pilot feature is being initialized...");
      }
    }
  };
  
  const handleSmartSuggestionClick = (suggestion: SearchSuggestion) => {
    console.log("[SmartAgentInput] Smart suggestion click", { suggestion });
    setShowSmartSuggestions(false);
    setQuery(suggestion.label);
    
    // Always open Co-Pilot with the full question via callback
    if (onCoPilotQuery) {
      console.log("[SmartAgentInput] Calling onCoPilotQuery with:", suggestion.question);
      onCoPilotQuery(suggestion.question);
    } else {
      toast.info("Co-Pilot feature is being initialized...");
    }
  };

  const handleSelectSuggestion = (suggestion: AgentSuggestion) => {
    setSelectedSuggestion(suggestion);
    setIsPlanModalOpen(true);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const activeSuggestions = showSmartSuggestions ? smartSuggestions : oldSuggestions;
    if ((!showSuggestions && !showSmartSuggestions) || activeSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < activeSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : activeSuggestions.length - 1
        );
        break;
      case 'Enter':
        if (selectedIndex >= 0) {
          e.preventDefault();
          if (showSmartSuggestions && smartSuggestions[selectedIndex]) {
            handleSmartSuggestionClick(smartSuggestions[selectedIndex]);
          } else if (oldSuggestions[selectedIndex]) {
            handleSelectSuggestion(oldSuggestions[selectedIndex]);
          }
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setShowSmartSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <>
      <AgentPlanModal 
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setSelectedSuggestion(null);
        }}
        suggestion={selectedSuggestion}
      />
      
      <div className="relative w-full max-w-4xl mx-auto mb-12">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 via-accent/10 to-secondary/10 blur-xl" />
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          {/* Co-Pilot icon on left */}
          <Sparkles className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-primary transition-smooth animate-pulse" />
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setShowSmartSuggestions(true);
              if (oldSuggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => {
              setTimeout(() => {
                setShowSmartSuggestions(false);
                setShowSuggestions(false);
              }, 300);
            }}
            placeholder="Paste a URL or ask Co-Pilot what twin to build..."
            className="w-full h-14 sm:h-16 pl-12 sm:pl-16 pr-24 sm:pr-48 bg-card backdrop-blur-sm border-2 border-border rounded-xl sm:rounded-2xl text-base sm:text-lg placeholder:text-muted-foreground focus:border-secondary focus:ring-4 focus:ring-secondary/20 transition-all outline-none shadow-sm hover:shadow-md min-w-[260px]"
            disabled={isAnalyzing}
            style={{ fontSize: 'clamp(14px, 3vw, 16px)' }}
            aria-label="Co-Pilot command bar"
            aria-autocomplete="list"
            aria-controls="suggestions-list"
            aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
          />
          
          {/* Ask Co-Pilot Button */}
          <button
            type="submit"
            disabled={isAnalyzing || !query.trim()}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-12 sm:h-14 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#FFD700] to-[#3AB6FF] hover:from-[#3AB6FF] hover:to-[#FFD700] text-black shadow-md hover:shadow-lg flex items-center gap-2 min-h-[44px] whitespace-nowrap"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="hidden sm:inline">Scanning...</span>
              </>
            ) : isUrl ? (
              <>
                <Zap className="h-5 w-5" />
                <span className="hidden sm:inline">Analyze</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span className="hidden sm:inline">Ask Co-Pilot</span>
              </>
            )}
          </button>
        </div>
        
        {/* Error State */}
        {smartError && showSmartSuggestions && (
          <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg animate-fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Failed to load suggestions</p>
                <p className="text-xs text-destructive/80 mt-1">{smartError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Smart Suggestions Dropdown - context-aware */}
        {showSmartSuggestions && !smartError && (
          <div className="mt-2 bg-card border border-border rounded-xl shadow-lg max-h-[400px] overflow-y-auto animate-fade-in">
            {smartLoading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                Loading suggestions...
              </div>
            )}
            {!smartLoading && smartSuggestions.length === 0 && (
              <div className="p-6 text-center">
                <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium text-foreground mb-1">No suggestions yet</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Try scanning a URL, creating an agent, or asking Co-Pilot a question
                </p>
                <div className="flex flex-col gap-2 text-left max-w-xs mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (onCoPilotQuery) {
                        onCoPilotQuery("Explain the current PUE drift pattern in our data center. What factors are contributing to the drift?");
                      }
                    }}
                    className="text-xs px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-all text-left"
                  >
                    ⚡ Explain PUE drift
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onCoPilotQuery) {
                        onCoPilotQuery("Provide a forecast for GPU saturation over the next 24 hours. Identify any clusters at risk.");
                      }
                    }}
                    className="text-xs px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-all text-left"
                  >
                    🔥 GPU saturation forecast
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onCoPilotQuery) {
                        onCoPilotQuery("Diagnose the current cooling efficiency across all zones. Identify any thermal imbalances.");
                      }
                    }}
                    className="text-xs px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-all text-left"
                  >
                    ❄️ Cooling efficiency diagnosis
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onCoPilotQuery) {
                        onCoPilotQuery("Analyze the carbon intensity trend for our data center. What is the gCO₂e/kWh?");
                      }
                    }}
                    className="text-xs px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-all text-left"
                  >
                    🌱 Carbon intensity trend
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onCoPilotQuery) {
                        onCoPilotQuery("Check the current UPS battery runtime status across all banks.");
                      }
                    }}
                    className="text-xs px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-all text-left"
                  >
                    🔋 UPS battery runtime check
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onCoPilotQuery) {
                        onCoPilotQuery("Audit the current sovereign data routing. Are there any jurisdiction violations?");
                      }
                    }}
                    className="text-xs px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-all text-left"
                  >
                    🛡️ Sovereign routing audit
                  </button>
                </div>
              </div>
            )}
            {!smartLoading && smartSuggestions.length > 0 && (
              <>
                {smartSuggestions.map((suggestion, idx) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleSmartSuggestionClick(suggestion)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-all border-b border-border last:border-b-0 ${
                      selectedIndex === idx ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {suggestion.type === 'url_scan' && <Zap className="h-4 w-4 text-primary flex-shrink-0" />}
                      {suggestion.type === 'agent' && <Sparkles className="h-4 w-4 text-accent flex-shrink-0" />}
                      {suggestion.type === 'template' && <Lightbulb className="h-4 w-4 text-secondary flex-shrink-0" />}
                      {suggestion.type === 'copilot_prompt' && <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />}
                      {suggestion.type === 'generic_example' && <Sparkles className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {suggestion.label}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                <div className="px-4 py-2 text-center text-xs text-muted-foreground border-t border-border bg-muted/20">
                  Click a suggestion to ask Co-Pilot
                </div>
              </>
            )}
          </div>
        )}

        {/* Recrawl Options - shown when URL is detected */}
        {isUrl && (
          <div className="flex flex-wrap gap-3 mt-4 items-center animate-fade-in">
            <span className="text-sm text-muted-foreground">Scan options:</span>
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-all cursor-pointer">
              <input
                type="checkbox"
                checked={forceRecrawl}
                onChange={(e) => setForceRecrawl(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-sm font-medium">Force Recrawl</span>
              <span className="text-xs text-muted-foreground">(bypass cache)</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-all cursor-pointer">
              <input
                type="checkbox"
                checked={deepRecrawl}
                onChange={(e) => setDeepRecrawl(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-sm font-medium">Deep Recrawl</span>
              <span className="text-xs text-muted-foreground">(capture more pages)</span>
            </label>
          </div>
        )}
      </form>
      </div>
    </>
  );
}
