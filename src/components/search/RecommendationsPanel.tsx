import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Sparkles, ArrowRight, BookOpen, Play, TrendingUp, Zap, Award, RefreshCw, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { RecoResponse } from "@/hooks/useRecommendations";
import { useRecommendationsStore } from "@/stores/recommendationsStore";
import { filterValidDigitalTwins } from "@/lib/digitalTwin/validators";
import { startBuilderFromIntake } from "@/lib/intake";

interface Recommendation {
  id: string;
  department: string;
  title: string;
  description: string;
  nextStep: string;
  tags: string[];
  confidence: number;
  impact: string;
  effort: string;
  fundingHints?: string[];
  fundingMatches?: Array<{
    programName: string;
    jurisdiction: string;
    province?: string;
    description: string;
    maxContribution: string;
    coveragePercent: string;
    url: string;
    tags: string[];
  }>;
  sources: string[];
  blueprintId: string;
  defaultAgents: any[];
  defaultDatasets?: string[];
  defaultConnections?: string[];
  // Enhanced template fields
  problemOverview?: string;
  whyThisMatters?: string;
  nextSteps?: string[];
  potentialRoiPercent?: number;
  timeToValueWeeks?: number;
  expectedEfficiencyLift?: string;
}

interface RecommendationsPanelProps {
  recommendations: RecoResponse;
}

const tagColors: Record<string, string> = {
  // Operational blueprint types (primary)
  'Supply Chain & Inventory': 'bg-blue-600 text-white border-blue-700',
  'Store Operations & Workforce': 'bg-purple-600 text-white border-purple-700',
  'Logistics & Last Mile': 'bg-orange-600 text-white border-orange-700',
  'Risk & Loss Prevention': 'bg-red-600 text-white border-red-700',
  'ESG & Sustainability': 'bg-green-600 text-white border-green-700',
  
  // Additional attributes
  'Agentic AI': 'bg-indigo-500 text-white border-indigo-600',
  'Edge AI': 'bg-amber-500 text-white border-amber-600',
  'Funding Eligible': 'bg-lime-500 text-gray-900 border-lime-600',
  'Adoption': 'bg-cyan-500 text-white border-cyan-600',
  
  // Legacy tags (kept for backward compatibility)
  'Upskilling': 'bg-teal-500 text-white border-teal-600',
  'Commercialization': 'bg-sky-500 text-white border-sky-600',
  'MEA Spark': 'bg-yellow-400 text-gray-900 border-yellow-500',
  'MEA Gateway': 'bg-amber-400 text-gray-900 border-amber-500',
  'MEA Nexus': 'bg-yellow-600 text-white border-yellow-700',
};

const tagTooltips: Record<string, string> = {
  // Operational blueprint types
  'Supply Chain & Inventory': 'Digital twins for demand forecasting, inventory optimization, replenishment, and distribution',
  'Store Operations & Workforce': 'Operational twins for in-store task automation, workforce scheduling, and shelf management',
  'Logistics & Last Mile': 'Fleet routing, delivery optimization, capacity planning, and transportation management',
  'Risk & Loss Prevention': 'Shrinkage detection, anomaly monitoring, and compliance automation',
  'ESG & Sustainability': 'Energy optimization, emissions tracking, and sustainability impact modeling',
  
  // Additional attributes
  'Agentic AI': 'Multi-agent system coordination and process automation',
  'Edge AI': 'AI deployed at the edge for low-latency decisioning',
  'Funding Eligible': 'Meets criteria for federal or institutional grant programs',
  'Adoption': 'Internal deployment and organizational adoption',
  
  // Legacy tags
  'Upskilling': 'Workforce training tied to operational roles and systems',
  'Commercialization': 'Ready for market launch and revenue generation',
  'MEA Spark': 'Learning-stage program supporting foundational AI skills',
  'MEA Gateway': 'Mid-stage framework funding for reusable AI toolkits',
  'MEA Nexus': 'Advanced commercialization program for AI products',
};

const rankStyles = [
  { emoji: '🥇', border: 'border-yellow-500', glow: 'shadow-yellow-500/50', bg: 'bg-yellow-500/5' },
  { emoji: '🥈', border: 'border-gray-400', glow: 'shadow-gray-400/50', bg: 'bg-gray-400/5' },
  { emoji: '🥉', border: 'border-amber-600', glow: 'shadow-amber-600/50', bg: 'bg-amber-600/5' },
];

const impactColors = {
  High: "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800",
  Medium: "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800",
  Low: "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950 dark:border-gray-800",
};

const effortColors = {
  High: "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800",
  Medium: "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800",
  Low: "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800",
};

// Extract clean company name from domain
const extractCompanyName = (domain: string): string => {
  if (!domain) return "Your Organization";
  
  // Remove protocol if present
  let cleaned = domain.replace(/^https?:\/\//, '');
  
  // Remove www. prefix
  cleaned = cleaned.replace(/^www\./, '');
  
  // Remove trailing slashes and paths
  cleaned = cleaned.split('/')[0];
  
  // Remove TLD (.com, .ca, etc.)
  const parts = cleaned.split('.');
  if (parts.length > 1) {
    cleaned = parts.slice(0, -1).join('.');
  }
  
  // Convert to title case and handle common patterns
  if (cleaned.toLowerCase() === 'm2mtechconnect' || cleaned.toLowerCase() === 'm2mtech') {
    return 'M2M Tech';
  }
  
  // Split on hyphens, underscores, or camelCase
  const words = cleaned
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return words || "Your Organization";
};

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  const navigate = useNavigate();
  const [creatingDraft, setCreatingDraft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isRestoringRef = useRef(false);
  
  // Use Zustand store for persistent state
  const {
    activeFilter,
    scrollPosition,
    generatedItems,
    lastGenerated,
    setActiveFilter,
    setScrollPosition,
    setGeneratedItems,
    setLastGenerated,
  } = useRecommendationsStore();

  // Use generated items if available, otherwise fallback to recommendations.items
  const items = generatedItems.length > 0 ? generatedItems : (recommendations.items ?? []);
  
  // Restore scroll position on mount (only once, when returning from navigation)
  useEffect(() => {
    if (scrollPosition > 0 && !isRestoringRef.current) {
      isRestoringRef.current = true;
      
      // Wait for content to render before scrolling
      const timer = setTimeout(() => {
        window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
        // Reset scroll position in store after restoration to prevent re-scroll on re-renders
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 500);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, []); // Only run once on mount
  
  // Save scroll position continuously while on the page
  useEffect(() => {
    const handleScroll = () => {
      // Only save if we're not currently restoring
      if (!isRestoringRef.current) {
        setScrollPosition(window.scrollY);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setScrollPosition]);

  // Generate Digital Twin recommendations using url-recommendations edge function
  // CRITICAL: Always use url-recommendations (has Digital Twin template)
  // DO NOT use generate-ai-recommendations (generic AI initiatives - deprecated)
  const generateRecommendations = useCallback(async (forceRefresh = false) => {
    if (isGenerating) return; // Prevent concurrent calls
    
    // Validate domain is not a timestamp
    if (/^\d{4}-\d{2}-\d{2}T/.test(recommendations.domain)) {
      console.error('[RecommendationsPanel] Invalid domain (timestamp):', recommendations.domain);
      toast({
        title: "Invalid domain",
        description: 'Please scan a new website to generate recommendations',
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      // Normalize domain - remove protocol if present
      const cleanDomain = recommendations.domain.replace(/^https?:\/\//, '');
      
      // CRITICAL FIX: Use url-recommendations (Digital Twin template), NOT generate-ai-recommendations
      const { data: rawResponse, error } = await supabase.functions.invoke('url-recommendations', {
        body: { 
          url: cleanDomain,
          topN: 3,
          force: forceRefresh,
          forceIngest: false
        }
      });

      if (error) {
        console.error('Generation error:', error);
        toast({
          title: "Generation failed",
          description: error.message || 'Failed to generate Digital Twin recommendations',
          variant: "destructive",
        });
        return;
      }

      // url-recommendations returns a different structure
      const data = rawResponse;
      
      // Check if response has items array (direct response from url-recommendations)
      if (data && Array.isArray(data.items)) {
        // CRITICAL: Validate all recommendations are Digital Twins before displaying
        const { valid, rejected } = filterValidDigitalTwins(
          data.items,
          data.industryGuess || recommendations.company
        );
        
        // Log rejected recommendations for debugging
        if (rejected.length > 0) {
          console.warn(
            `[RecommendationsPanel] Rejected ${rejected.length} non-Digital Twin recommendations:`,
            rejected.map(r => ({ title: r.rec.title, reasons: r.validation.reasons }))
          );
        }
        
        // Only use valid Digital Twin recommendations
        const transformed = valid.slice(0, 3).map((rec: any) => ({
          id: rec.id || `digital-twin-${Date.now()}-${Math.random()}`,
          department: rec.department || 'Operations',
          title: rec.title,
          description: rec.description,
          nextStep: rec.nextStep || '',
          tags: rec.tags || [],
          confidence: rec.confidence || 0.8,
          impact: rec.impact || 'High',
          effort: rec.effort || 'Medium',
          fundingHints: rec.fundingHints || [],
          fundingMatches: rec.fundingMatches || [],
          sources: rec.sources || [],
          blueprintId: rec.blueprintId || 'digital-twin',
          defaultAgents: rec.defaultAgents || [],
          defaultDatasets: rec.defaultDatasets,
          defaultConnections: rec.defaultConnections,
        }));
        
        setGeneratedItems(transformed);
        setLastGenerated(cleanDomain);
        
        console.log('[RecommendationsPanel] Generated Digital Twin recommendations:', transformed.length);
      } else {
        console.error('[RecommendationsPanel] Invalid response structure:', data);
        toast({
          title: "Generation failed",
          description: 'Received invalid response format',
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      toast({
        title: "Generation failed",
        description: 'Failed to generate Digital Twin recommendations',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [recommendations.domain, recommendations.company, isGenerating, setGeneratedItems, setLastGenerated, toast]);

  // Auto-generate on mount if we have domain and it's not a timestamp
  useEffect(() => {
    // Validate that domain is actually a domain, not a timestamp
    const isValidDomain = recommendations.domain && 
                          !/^\d{4}-\d{2}-\d{2}T/.test(recommendations.domain);
    
    if (isValidDomain && generatedItems.length === 0 && !isGenerating) {
      generateRecommendations(false);
    }
  }, [recommendations.domain, generatedItems.length, isGenerating, generateRecommendations]);
  
  // Reset scroll position when recommendations change (new URL analyzed)
  useEffect(() => {
    // If we have new recommendations from a different domain, reset scroll
    if (recommendations.domain && recommendations.domain.trim().length > 0) {
      const storedDomain = sessionStorage.getItem('last-recommendations-domain');
      if (storedDomain && storedDomain !== recommendations.domain) {
        setScrollPosition(0);
        window.scrollTo({ top: 0 });
      }
      sessionStorage.setItem('last-recommendations-domain', recommendations.domain);
    }
  }, [recommendations.domain, setScrollPosition]);
  
  // Calculate composite score and rank items
  const rankedItems = useMemo(() => {
    const scored = items.map(item => {
      const impactScore = item.impact === 'High' ? 0.48 : item.impact === 'Medium' ? 0.30 : 0.15;
      const relevanceScore = item.confidence * 0.30;
      const fundingBonus = item.fundingHints && item.fundingHints.length > 0 ? 0.08 : 0;
      const agenticBonus = item.tags?.includes('Agentic AI') ? 0.04 : 0;
      const edgeBonus = item.tags?.includes('Edge AI') ? 0.03 : 0;
      const upskillingBonus = item.tags?.includes('Upskilling') ? 0.02 : 0;
      const effortPenalty = item.effort === 'High' ? 0.07 : 0;
      
      const compositeScore = impactScore + relevanceScore + fundingBonus + agenticBonus + edgeBonus + upskillingBonus - effortPenalty;
      
      return { ...item, compositeScore };
    });
    
    return scored.sort((a, b) => b.compositeScore - a.compositeScore);
  }, [items]);

  // Get all unique tags for filters - prioritize operational blueprint types
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach(item => {
      item.tags?.forEach(tag => tagSet.add(tag));
      if (item.fundingHints && item.fundingHints.length > 0) tagSet.add('Funding Eligible');
    });
    
    // Define priority order for operational tags
    const priorityTags = [
      'Supply Chain & Inventory',
      'Store Operations & Workforce', 
      'Logistics & Last Mile',
      'Risk & Loss Prevention',
      'ESG & Sustainability',
    ];
    
    const tags = Array.from(tagSet);
    const sortedTags = [
      ...tags.filter(t => priorityTags.includes(t)).sort((a, b) => 
        priorityTags.indexOf(a) - priorityTags.indexOf(b)
      ),
      ...tags.filter(t => !priorityTags.includes(t)).sort(),
    ];
    
    return ['All', ...sortedTags];
  }, [items]);

  // Filter and get top 3
  const topThree = useMemo(() => {
    if (activeFilter === 'All') {
      return rankedItems.slice(0, 3);
    }
    
    const filtered = rankedItems.filter(item => {
      if (activeFilter === 'Funding Eligible') {
        return item.fundingHints && item.fundingHints.length > 0;
      }
      return item.tags?.includes(activeFilter);
    });
    
    return filtered.slice(0, 3);
  }, [rankedItems, activeFilter]);

  // Count items per tag
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All': items.length };
    items.forEach(item => {
      item.tags?.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
      if (item.fundingHints && item.fundingHints.length > 0) {
        counts['Funding Eligible'] = (counts['Funding Eligible'] || 0) + 1;
      }
    });
    return counts;
  }, [items]);

  const handleCreateAgent = async (reco: Recommendation) => {
    setCreatingDraft(reco.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to create an agent",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      console.log('[RecommendationsPanel] Starting builder from recommendation:', {
        id: reco.id,
        title: reco.title,
        department: reco.department,
      });

      // Use unified intake system with recommendation metadata
      toast({
        title: "Creating agent from recommendation...",
        description: "Setting up your builder session",
      });

      const result = await startBuilderFromIntake({
        source: 'url',
        userId: user.id,
        urlInput: `https://${recommendations.domain}`,
        metadata: {
          recommendationId: reco.id,
          recommendationTitle: reco.title,
          recommendationDescription: reco.description,
          department: reco.department,
          industry: recommendations.industryGuess,
          tags: reco.tags,
          potentialRoiPercent: reco.potentialRoiPercent,
          timeToValueWeeks: reco.timeToValueWeeks,
          expectedEfficiencyLift: reco.expectedEfficiencyLift,
          problemOverview: reco.problemOverview,
          whyThisMatters: reco.whyThisMatters,
          nextSteps: reco.nextSteps,
          confidence: reco.confidence,
          impact: reco.impact,
          effort: reco.effort,
          blueprintId: reco.blueprintId,
          sourceEntry: 'url_recommendations',
        }
      });

      if (result.success) {
        toast({
          title: "Ready to build!",
          description: "Opening builder with your recommendation...",
        });
        navigate(result.builderUrl);
      } else {
        throw new Error(result.error || 'Failed to create builder session');
      }

    } catch (error: any) {
      console.error('[RecommendationsPanel] Create agent error:', error);
      toast({
        title: "Failed to start builder",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingDraft(null);
    }
  };

  return (
    <TooltipProvider>
      <div ref={containerRef} className="w-full max-w-7xl mx-auto mt-8 space-y-6">
        {/* Header */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Sparkles className="h-7 w-7 text-primary" />
                  Top {topThree.length} Digital Twin Blueprints
                </CardTitle>
                <CardDescription className="text-base mt-2 font-medium text-foreground/90">
                  These {topThree.length} blueprints are generated specifically for {extractCompanyName(recommendations.company || recommendations.domain)} based on its industry, scale, and operating model.
                </CardDescription>
                <CardDescription className="text-base mt-2">
                  {recommendations.industryGuess && (
                    <span className="text-muted-foreground">
                      {recommendations.industryGuess}
                    </span>
                  )}
                  {recommendations.industryGuess && (recommendations as any).totalCount && ' • '}
                  {(recommendations as any).totalCount && (
                    <span className="text-muted-foreground">
                      Showing top {topThree.length} of {(recommendations as any).totalCount} recommendations
                    </span>
                  )}
                </CardDescription>
                
                {/* Warning message for low-quality results */}
                {(recommendations as any).warningMessage && (
                  <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      {(recommendations as any).warningMessage}
                    </p>
                  </div>
                )}
              </div>
              <Button
                onClick={() => generateRecommendations(true)}
                disabled={isGenerating}
                variant="outline"
                size="sm"
                className="ml-4 shrink-0"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : 'Refresh'}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant={activeFilter === tag ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(tag)}
              className="transition-all"
            >
              {tag}
              <Badge variant="secondary" className="ml-2">
                {tagCounts[tag] || 0}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Top 3 Recommendations */}
        {topThree.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {topThree.map((reco, index) => {
              const rankStyle = rankStyles[index] || rankStyles[2];
              return (
                <Card 
                  key={reco.id} 
                  className={`flex flex-col hover:shadow-2xl transition-all duration-300 border-2 ${rankStyle.border} ${rankStyle.bg} hover:scale-105 shadow-lg ${rankStyle.glow}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{rankStyle.emoji}</span>
                        <Badge variant="outline" className="shrink-0 font-bold">
                          {Math.round(reco.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-xl leading-tight mb-3">{reco.title}</CardTitle>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(reco.tags || []).map((tag) => (
                        <Tooltip key={tag}>
                          <TooltipTrigger asChild>
                            <Badge 
                              className={`text-xs cursor-help border ${tagColors[tag] || 'bg-secondary text-secondary-foreground border-secondary'}`}
                            >
                              {tag}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{tagTooltips[tag] || tag}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {reco.fundingHints && reco.fundingHints.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className={`text-xs cursor-help border ${tagColors['Funding Eligible']}`}>
                              Funding Eligible
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{tagTooltips['Funding Eligible']}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4">
                    {/* Problem Overview */}
                    {reco.problemOverview && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Problem Overview</p>
                        <p className="text-sm leading-relaxed">{reco.problemOverview}</p>
                      </div>
                    )}

                    {/* Why This Matters */}
                    {reco.whyThisMatters && (
                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Why This Matters</p>
                        <p className="text-sm leading-relaxed">{reco.whyThisMatters}</p>
                      </div>
                    )}

                    {/* Recommended Digital Twin / Agent */}
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Recommended Digital Twin</p>
                      <p className="text-sm leading-relaxed mb-3">{reco.description}</p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="font-semibold">Impact:</span>
                          <Badge variant="outline" className={impactColors[reco.impact as keyof typeof impactColors] || ''}>
                            {reco.impact}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <Zap className="h-4 w-4 text-primary" />
                          <span className="font-semibold">Effort:</span>
                          <Badge variant="outline" className={effortColors[reco.effort as keyof typeof effortColors] || ''}>
                            {reco.effort}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Next Steps */}
                    {(reco.nextSteps && reco.nextSteps.length > 0) ? (
                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Next Steps</p>
                        <ul className="space-y-1.5">
                          {reco.nextSteps.map((step, idx) => (
                            <li key={idx} className="text-xs leading-relaxed flex items-start gap-2">
                              <span className="text-primary font-bold shrink-0">{idx + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : reco.nextStep ? (
                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Next Steps</p>
                        <p className="text-xs leading-relaxed">{reco.nextStep}</p>
                      </div>
                    ) : null}

                    {/* ROI Snapshot */}
                    {(reco.potentialRoiPercent || reco.timeToValueWeeks || reco.expectedEfficiencyLift) && (
                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">ROI Snapshot</p>
                        <div className="grid grid-cols-3 gap-2">
                          {reco.potentialRoiPercent && (
                            <div className="text-center p-2 bg-primary/5 rounded-lg border border-primary/20">
                              <p className="text-lg font-bold text-primary">{reco.potentialRoiPercent}%</p>
                              <p className="text-xs text-muted-foreground">Potential ROI</p>
                            </div>
                          )}
                          {reco.timeToValueWeeks && (
                            <div className="text-center p-2 bg-primary/5 rounded-lg border border-primary/20">
                              <p className="text-lg font-bold text-primary">{reco.timeToValueWeeks}w</p>
                              <p className="text-xs text-muted-foreground">Time to Value</p>
                            </div>
                          )}
                          {reco.expectedEfficiencyLift && (
                            <div className="text-center p-2 bg-primary/5 rounded-lg border border-primary/20">
                              <p className="text-lg font-bold text-primary">{reco.expectedEfficiencyLift}</p>
                              <p className="text-xs text-muted-foreground">Efficiency Lift</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Funding Opportunities */}
                    {reco.fundingHints && reco.fundingHints.length > 0 && (
                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-primary" />
                          Funding Opportunities (Canada)
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {reco.fundingHints.map((hint) => (
                            <Badge 
                              key={hint} 
                              variant="outline" 
                              className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
                            >
                              {hint}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Canadian Funding Programs */}
                    {reco.fundingMatches && reco.fundingMatches.length > 0 && (
                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5" />
                          Canadian Funding Programs ({reco.fundingMatches.length})
                        </p>
                        <div className="space-y-2">
                          {reco.fundingMatches.slice(0, 2).map((funding, idx) => (
                            <div key={idx} className="text-xs p-2 rounded bg-muted/30 border border-border/30">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="font-semibold text-foreground">{funding.programName}</p>
                                <Badge variant="outline" className="shrink-0 text-[10px] py-0 h-5">
                                  {funding.jurisdiction}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground leading-relaxed mb-1">{funding.description}</p>
                              <p className="font-medium text-primary">{funding.maxContribution} ({funding.coveragePercent})</p>
                            </div>
                          ))}
                          {reco.fundingMatches.length > 2 && (
                            <p className="text-xs text-muted-foreground italic">
                              + {reco.fundingMatches.length - 2} more programs available
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex-col gap-2 pt-4">
                    <Button 
                      className="w-full shadow-md hover:shadow-lg transition-all" 
                      onClick={() => handleCreateAgent(reco)}
                      disabled={creatingDraft === reco.id}
                      variant={index === 0 ? "default" : "secondary"}
                    >
                      {creatingDraft === reco.id ? (
                        <>Creating...</>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Create Agent
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <div className="flex gap-2 w-full">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              navigate(`/playbook?initiative=${encodeURIComponent(reco.title)}&id=${reco.id}`);
                            }}
                          >
                            <BookOpen className="mr-1 h-3 w-3" />
                            Playbook
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Access implementation guides and best practices documentation</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              navigate(`/pilot?initiative=${encodeURIComponent(reco.title)}&id=${reco.id}`);
                            }}
                          >
                            <Play className="mr-1 h-3 w-3" />
                            Pilot
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Start a pilot program to test this initiative before full rollout</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No recommendations match the selected filter.
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}