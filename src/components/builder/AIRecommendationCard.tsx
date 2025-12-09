import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Clock, Target, DollarSign, Zap, RefreshCw } from "lucide-react";
import { templates } from "@/components/builder/TemplateSelector";
import { models } from "@/components/builder/ModelMarketplace";
import { BuilderState } from "@/stores/builderStore";
import { Skeleton } from "@/components/ui/skeleton";

interface AIRecommendationCardProps {
  state: BuilderState;
  onApplyRecommendation?: () => void;
  onRecalculateROI?: () => void;
}

interface RecommendationData {
  title: string;
  subtitle: string;
  recommendation: string;
  modelName: string;
  modelVendor: string;
  contextWindow: string;
  topK: number;
  topN: number;
  temperature: number;
  workflowCount: number;
  connectedToolsCount: number;
  roi: number;
  annualSavings: number;
  timeSavedPerWeek: number;
  accuracyImprovement: number;
  optimizations: string[];
}

export function AIRecommendationCard({ 
  state, 
  onApplyRecommendation,
  onRecalculateROI 
}: AIRecommendationCardProps) {
  const [recommendation, setRecommendation] = useState<RecommendationData | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    generateRecommendation();
  }, [state, state.roiAssumptions]);

  const generateRecommendation = () => {
    setIsGenerating(true);
    
    // If we have stored recommendation data from prefill, use it
    if (state.recommendationData) {
      const storedRec = state.recommendationData;
      
      // Map stored recommendation to our RecommendationData format
      const recData: RecommendationData = {
        title: storedRec.title || storedRec.systemName || "AI-Powered Deployment Recommendation",
        subtitle: storedRec.subtitle || `${storedRec.industry || 'Enterprise'} Solution`,
        recommendation: storedRec.description || storedRec.recommendation || `Optimized system for ${state.department} department`,
        modelName: storedRec.model || state.selectedModel || "Not selected",
        modelVendor: storedRec.vendor || "AI Provider",
        contextWindow: storedRec.contextWindow || "Standard",
        topK: storedRec.topK || state.topK,
        topN: storedRec.topN || state.topN,
        temperature: storedRec.temperature || state.temperature,
        workflowCount: storedRec.workflowCount || state.workflowNodes?.length || 0,
        connectedToolsCount: storedRec.connectedToolsCount || Object.values(state.connectors || {}).filter(v => v === 'connected').length,
        roi: storedRec.roi || 0,
        annualSavings: storedRec.annualSavings || 0,
        timeSavedPerWeek: storedRec.timeSavedPerWeek || 0,
        accuracyImprovement: storedRec.accuracyImprovement || state.roiAssumptions.accuracyPct,
        optimizations: storedRec.optimizations || [],
      };
      
      setRecommendation(recData);
      setIsGenerating(false);
      return;
    }
    
    // Otherwise, generate recommendation locally
    setTimeout(() => {
      const template = templates?.find(t => t.id === state.selectedTemplate);
      const model = models?.find(m => m.id === state.selectedModel);
      const connectedToolsCount = Object.values(state.connectors || {}).filter(v => v === 'connected').length;
      const workflowCount = state.workflowNodes?.length || 0;

      // Calculate ROI metrics
      const { roiAssumptions } = state;
      const weeksPerYear = 52;
      const timeSavedPerRun = roiAssumptions.timeSavedMin / 60; // hours
      const timeSavedPerWeek = timeSavedPerRun * roiAssumptions.runsPerWeek;
      const timeSavedPerYear = timeSavedPerWeek * weeksPerYear;
      const costSavingsFromTime = timeSavedPerYear * roiAssumptions.costPerHour;
      
      const errorReductionSavings = (roiAssumptions.accuracyPct / 100) * 
        roiAssumptions.runsPerWeek * 
        weeksPerYear * 
        roiAssumptions.costPerError;
      
      const totalAnnualSavings = costSavingsFromTime + errorReductionSavings;
      
      // Assume annual cost is roughly 20% of savings (more realistic than fixed $15k)
      const estimatedCost = totalAnnualSavings * 0.2;
      const roi = estimatedCost > 0 ? ((totalAnnualSavings - estimatedCost) / estimatedCost) * 100 : 0;

      // Generate optimizations based on configuration
      const optimizations: string[] = [];
      
      if (state.topK < 25) {
        optimizations.push(`Consider increasing Top-K from ${state.topK} to ${state.topK + 5} for broader context retrieval`);
      }
      
      if (!state.vertexEnabled) {
        optimizations.push("Enable Grounding layer for higher accuracy with real-time data enrichment");
      }
      
      if (connectedToolsCount < 2) {
        optimizations.push("Connect more data sources to enrich your agent's knowledge base");
      }
      
      if (workflowCount < 3) {
        optimizations.push("Add workflow automation nodes to maximize efficiency gains");
      }
      
      if (state.temperature > 0.5) {
        optimizations.push(`Lower temperature from ${state.temperature} to 0.3 for more deterministic responses`);
      }

      if (roiAssumptions.runsPerWeek < 50) {
        optimizations.push(`Increase usage frequency to maximize ROI—currently at ${roiAssumptions.runsPerWeek} runs/week`);
      }

      const recData: RecommendationData = {
        title: "AI-Powered Deployment Recommendation",
        subtitle: "Auto-generated based on your configuration",
        recommendation: `Based on your ${state.department} department setup using ${model?.name || 'selected model'}, this system is optimized for ${state.outcome}. The current configuration balances performance with cost-efficiency.`,
        modelName: model?.name || "Not selected",
        modelVendor: model?.provider || "Unknown",
        contextWindow: model?.contextWindow || "N/A",
        topK: state.topK,
        topN: state.topN,
        temperature: state.temperature,
        workflowCount,
        connectedToolsCount,
        roi: Math.max(0, Math.round(roi)), // Ensure non-negative
        annualSavings: Math.max(0, Math.round(totalAnnualSavings)),
        timeSavedPerWeek: Math.max(0, Math.round(timeSavedPerWeek * 10) / 10),
        accuracyImprovement: Math.max(0, Math.min(100, Math.round(roiAssumptions.accuracyPct))), // 0-100%
        optimizations,
      };

      setRecommendation(recData);
      setIsGenerating(false);
    }, 600);
  };

  if (!state.systemName || !state.department || !state.outcome) {
    return (
      <Card className="border-muted bg-muted/20">
        <CardContent className="py-8 text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Complete previous steps to unlock AI Recommendations
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating || !recommendation) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Badge variant="secondary" className="shrink-0">
              <Sparkles className="h-3 w-3 mr-1" />
              Generating...
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 relative overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
      
      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {recommendation.title}
            </CardTitle>
            <CardDescription className="mt-1.5">
              {recommendation.subtitle}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            <Sparkles className="h-3 w-3 mr-1" />
            Auto-generated
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 relative">
        {/* Main Recommendation */}
        <div className="p-4 rounded-lg bg-background/50 border border-border/50">
          <p className="text-sm leading-relaxed text-foreground">
            {recommendation.recommendation}
          </p>
        </div>

        {/* Configuration Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Configuration Summary</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-background/50 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Model</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{recommendation.modelName}</p>
              <p className="text-xs text-muted-foreground">{recommendation.modelVendor}</p>
            </div>

            <div className="p-3 rounded-lg bg-background/50 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">RAG Config</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                K:{recommendation.topK} N:{recommendation.topN}
              </p>
              <p className="text-xs text-muted-foreground">Temp: {recommendation.temperature}</p>
            </div>

            <div className="p-3 rounded-lg bg-background/50 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Workflow</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {recommendation.workflowCount} nodes
              </p>
              <p className="text-xs text-muted-foreground">
                {recommendation.connectedToolsCount} tools
              </p>
            </div>

            <div className="p-3 rounded-lg bg-background/50 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Context</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {recommendation.contextWindow}
              </p>
              <p className="text-xs text-muted-foreground">window size</p>
            </div>
          </div>
        </div>

        {/* Expected ROI Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Expected Impact</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-700">ROI</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {recommendation.roi > 0 ? '+' : ''}{recommendation.roi}%
              </p>
            </div>

            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Savings/Year</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                ${(recommendation.annualSavings / 1000).toFixed(0)}k
              </p>
            </div>

            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-700">Time/Week</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {recommendation.timeSavedPerWeek}h
              </p>
            </div>

            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-orange-600" />
                <span className="text-xs font-medium text-orange-700">Accuracy</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                +{recommendation.accuracyImprovement}%
              </p>
            </div>
          </div>
        </div>

        {/* Optimization Suggestions */}
        {recommendation.optimizations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Optimization Suggestions</h4>
            <div className="space-y-2">
              {recommendation.optimizations.map((opt, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                >
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{opt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onRecalculateROI && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRecalculateROI}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Recalculate ROI
            </Button>
          )}
          {onApplyRecommendation && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onApplyRecommendation}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Apply Recommendations
            </Button>
          )}
        </div>

        {/* Auto-update tooltip */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
          <Sparkles className="h-3 w-3" />
          <span>AI Recommendation auto-updates when workflow or configuration changes</span>
        </div>
      </CardContent>
    </Card>
  );
}
