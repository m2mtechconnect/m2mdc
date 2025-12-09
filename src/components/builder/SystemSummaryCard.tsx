import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { RecommendationData } from "@/types/recommendation";

interface SystemSummaryCardProps {
  systemName: string;
  department?: string;
  outcome?: string;
  successMetric?: string;
  selectedModel?: string;
  connectedTools?: any[];
  integrations?: any[];
  roiEstimate?: any;
  recommendationData?: RecommendationData | null;
  systemPrompt?: string;
}

export function SystemSummaryCard({
  systemName,
  department,
  outcome,
  successMetric,
  selectedModel,
  connectedTools,
  integrations,
  roiEstimate,
  recommendationData,
  systemPrompt,
}: SystemSummaryCardProps) {
  const [summary, setSummary] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Clean up malformed recommendation data
  const cleanRecommendationData = useMemo(() => {
    if (!recommendationData || typeof recommendationData !== 'object') {
      return null;
    }
    
    // Check if this is malformed data with _type: "undefined" structure
    const hasMalformedKeys = Object.values(recommendationData).some(
      (val: any) => val && typeof val === 'object' && val._type === 'undefined'
    );
    
    if (hasMalformedKeys || !recommendationData.title || !recommendationData.problem) {
      console.log('[SystemSummaryCard] Detected malformed/incomplete recommendationData, treating as null');
      return null;
    }
    
    return recommendationData;
  }, [recommendationData]);

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      console.log('[SystemSummaryCard] Generating summary with data:', {
        systemName,
        department,
        hasRecommendationData: !!cleanRecommendationData,
        recommendationDataType: typeof cleanRecommendationData,
        recommendationDataKeys: cleanRecommendationData ? Object.keys(cleanRecommendationData) : [],
        recommendationTitle: cleanRecommendationData?.title,
        recommendationProblem: cleanRecommendationData?.problem?.substring(0, 100),
        recommendationSource: cleanRecommendationData?.source,
      });

      const { data, error } = await supabase.functions.invoke("builder-generate-summary", {
        body: {
          systemName,
          department,
          outcome,
          successMetric,
          selectedModel,
          connectedTools,
          integrations,
          roiEstimate,
          recommendationData: cleanRecommendationData,
          systemPrompt,
        },
      });

      console.log('[SystemSummaryCard] Response from edge function:', {
        hasData: !!data,
        hasError: !!error,
        hasSummary: !!data?.summary,
        summaryPreview: data?.summary?.substring(0, 200),
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.summary) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({
        title: "Failed to generate summary",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate on mount
  useEffect(() => {
    console.log('[SystemSummaryCard] Mount effect - checking if should generate', {
      hasSystemName: !!systemName,
      hasSummary: !!summary,
      recommendationData: cleanRecommendationData
    });
    
    if (systemName && !summary) {
      generateSummary();
    }
  }, [systemName]);

  return (
    <Card className="section-padding bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-h3 font-display">AI System Summary</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={generateSummary}
          disabled={isGenerating}
          title="Regenerate summary"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Context indicator */}
      {cleanRecommendationData && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Based on selected recommendation</p>
            <p className="text-muted-foreground text-xs mt-1">
              "{cleanRecommendationData.title}" from {cleanRecommendationData.source?.replace('_', ' ')}
            </p>
          </div>
        </div>
      )}
      
      {!cleanRecommendationData && (
        <div className="mb-4 p-3 bg-muted/50 border border-border rounded-md flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            This agent was created before recommendation context tracking. Summary is based only on the configuration.
          </p>
        </div>
      )}

      {isGenerating && !summary ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Generating intelligent summary...</span>
        </div>
      ) : summary ? (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h3 className="text-lg font-display font-semibold mt-4 mb-2">{children}</h3>,
              h2: ({ children }) => <h4 className="text-base font-display font-semibold mt-3 mb-1">{children}</h4>,
              h3: ({ children }) => <h5 className="text-sm font-display font-semibold mt-2 mb-1">{children}</h5>,
              p: ({ children }) => <p className="text-sm text-body mb-3 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-sm">{children}</ol>,
              li: ({ children }) => <li className="text-body">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
            }}
          >
            {summary}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-6">
          No summary available. Click regenerate to create one.
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            This summary was auto-generated based on your system configuration using Gemini 2.5 Flash
          </p>
          <button
            onClick={() => console.log('Current state has recommendationData:', recommendationData)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Debug: Check Rec Data
          </button>
        </div>
      </div>
    </Card>
  );
}
