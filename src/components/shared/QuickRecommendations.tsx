import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Recommendation {
  department: string;
  recommendation: string;
  why_it_matters: string;
  steps: string[];
  confidence: number;
}

interface QuickRecommendationsProps {
  systemId: string;
  compact?: boolean;
}

const DEPARTMENTS = ["Operations", "Sales & Marketing", "Finance & Administration"];

export function QuickRecommendations({ systemId, compact = false }: QuickRecommendationsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setRecommendations([]);

    try {
      const { data, error } = await supabase.functions.invoke('recommendations-generate-stream', {
        body: { departments: DEPARTMENTS, systemId },
      });

      if (error) throw error;

      if (data.recommendations && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
        setIsOpen(true);
      } else {
        toast({
          title: "No recommendations",
          description: data.message || "Ingest website content to generate recommendations",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error('Generate error:', error);
      toast({
        title: "Generation failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseRecommendation = (rec: Recommendation) => {
    const prefillData = {
      department: rec.department,
      outcome: rec.department === "Operations" ? "Automation" : "Conversational",
      systemName: `${rec.department} AI Assistant`,
      successMetric: "hours_saved",
      recommendationData: rec
    };

    navigate("/builder?step=1", {
      state: { prefill: prefillData }
    });

    toast({
      title: "Opening Builder",
      description: "Recommendation applied to Step 1",
    });
  };

  return (
    <div className="space-y-3">
      {!isOpen ? (
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          variant="outline"
          size={compact ? "sm" : "default"}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Recommendations
            </>
          )}
        </Button>
      ) : (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">AI Recommendations ({recommendations.length})</span>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 space-y-2">
              {recommendations.map((rec, idx) => (
                <Card key={idx} className="p-3 space-y-2 bg-card border-l-4 border-l-primary">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Badge variant="secondary" className="mb-1">{rec.department}</Badge>
                      <p className="text-sm font-medium">{rec.recommendation}</p>
                    </div>
                    <Badge variant={rec.confidence >= 80 ? "default" : "outline"} className="text-xs">
                      {rec.confidence}%
                    </Badge>
                  </div>

                  {expandedIdx === idx && (
                    <div className="space-y-2 text-xs animate-fade-in">
                      <p className="text-muted-foreground">{rec.why_it_matters}</p>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                        {rec.steps.slice(0, 3).map((step, sIdx) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs flex-1"
                      onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    >
                      {expandedIdx === idx ? "Show Less" : "Show More"}
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs flex-1"
                      onClick={() => handleUseRecommendation(rec)}
                    >
                      <ArrowRight className="h-3 w-3 mr-1" />
                      Use in Builder
                    </Button>
                  </div>
                </Card>
              ))}
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}