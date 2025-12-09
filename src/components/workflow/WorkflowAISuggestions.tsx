import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, TrendingUp, Lightbulb, AlertCircle } from "lucide-react";
import { WorkflowSuggestions } from "@/hooks/useWorkflowSuggestions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WorkflowAISuggestionsProps {
  suggestions: WorkflowSuggestions | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onAddNode?: (nodeType: string) => void;
}

const priorityColors = {
  high: "destructive",
  medium: "default",
  low: "secondary"
} as const;

const impactColors = {
  high: "destructive",
  medium: "default", 
  low: "secondary"
} as const;

export function WorkflowAISuggestions({
  suggestions,
  isLoading,
  error,
  onRefresh,
  onAddNode
}: WorkflowAISuggestionsProps) {
  if (error) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs font-medium text-destructive">Suggestions Error</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          className="h-7 w-full text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading && !suggestions) {
    // Only show loading state if we don't have previous suggestions
    return (
      <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">Analyzing...</span>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!suggestions) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
        <p className="text-xs text-center text-muted-foreground py-3">
          Add nodes to get suggestions
        </p>
      </div>
    );
  }

  const getHealthColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">AI Assistant</span>
          {isLoading && (
            <div className="ml-1 h-1 w-1 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRefresh}
          disabled={isLoading}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Health Score */}
      <div className="mb-3 p-2.5 bg-background/50 rounded border border-border/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Health</span>
          <span className={`text-base font-bold ${getHealthColor(suggestions.healthScore)}`}>
            {suggestions.healthScore}/10
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">{suggestions.summary}</p>
      </div>

      {/* Next Node Suggestions */}
      {suggestions.nextNodes.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3 w-3 text-primary" />
            <h4 className="text-[10px] font-semibold uppercase tracking-wide">Next Steps</h4>
          </div>
          <div className="space-y-1.5">
            {suggestions.nextNodes.map((suggestion, idx) => (
              <div 
                key={idx}
                className="p-2 bg-background/50 rounded border border-border/30 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <span className="text-xs font-medium leading-tight">{suggestion.nodeType}</span>
                  <Badge variant={priorityColors[suggestion.priority]} className="text-[9px] h-4 px-1.5">
                    {suggestion.priority}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight mb-1.5">
                  {suggestion.reason}
                </p>
                {onAddNode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddNode(suggestion.nodeType)}
                    className="h-6 text-[10px] w-full"
                  >
                    Add
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Tips */}
      {suggestions.optimizationTips.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="h-3 w-3 text-primary" />
            <h4 className="text-[10px] font-semibold uppercase tracking-wide">Tips</h4>
          </div>
          <div className="space-y-1.5">
            {suggestions.optimizationTips.map((tip, idx) => (
              <div 
                key={idx}
                className="p-2 bg-background/50 rounded border border-border/30"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <p className="text-[10px] text-muted-foreground flex-1 leading-tight">
                    {tip.tip}
                  </p>
                  <Badge variant={impactColors[tip.impact]} className="text-[9px] h-4 px-1.5 flex-shrink-0">
                    {tip.impact}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
