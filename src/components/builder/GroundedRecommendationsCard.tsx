import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { 
  Sparkles, 
  Download, 
  Copy, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ArrowRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Citation {
  url: string;
  snippet: string;
  snippet_id?: string;
}

interface Recommendation {
  department: string;
  recommendation: string;
  why_it_matters: string;
  steps: string[];
  confidence: number;
  citations: Citation[];
}

interface GroundedRecommendationsCardProps {
  systemId: string;
}

const DEPARTMENTS = ["Operations", "Sales & Marketing", "Finance & Administration"];

export function GroundedRecommendationsCard({ systemId }: GroundedRecommendationsCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(DEPARTMENTS);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [expandedRecs, setExpandedRecs] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string>("");
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  const handleUseRecommendation = (rec: Recommendation) => {
    // Map recommendation to builder prefill format
    const prefillData = {
      department: rec.department,
      outcome: mapDepartmentToOutcome(rec.department),
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

  const mapDepartmentToOutcome = (dept: string): string => {
    const mapping: Record<string, string> = {
      "Operations": "Automation",
      "Sales & Marketing": "Conversational",
      "Finance & Administration": "Compliance"
    };
    return mapping[dept] || "Conversational";
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const handleGenerate = async () => {
    if (selectedDepartments.length === 0) {
      toast({
        title: "No departments selected",
        description: "Please select at least one department",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setMessage("");
    setRecommendations([]);

    try {
      const { data, error } = await supabase.functions.invoke('recommendations-generate', {
        body: { departments: selectedDepartments, systemId },
      });

      if (error) throw error;

      if (data.message) {
        setMessage(data.message);
      }

      if (data.recommendations && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
        toast({
          title: "Recommendations generated",
          description: `Generated ${data.recommendations.length} recommendation(s)`,
        });
      } else {
        setMessage(data.message || "No recommendations generated. Try ingesting more content.");
      }
    } catch (error: any) {
      logger.error('Generate error', error, { component: 'GroundedRecommendationsCard', action: 'handleGenerate' });
      toast({
        title: "Generation failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
      setMessage("Failed to generate recommendations. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleExpanded = (index: number) => {
    setExpandedRecs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(recommendations, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recommendations-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Downloaded as JSON" });
  };

  const handleExportMarkdown = () => {
    let markdown = `# AI Recommendations (Grounded)\n\nGenerated: ${new Date().toLocaleString()}\n\n`;
    
    recommendations.forEach((rec) => {
      markdown += `## ${rec.department}\n\n`;
      markdown += `**Recommendation:** ${rec.recommendation}\n\n`;
      markdown += `**Why it matters:** ${rec.why_it_matters}\n\n`;
      markdown += `**Implementation Steps:**\n`;
      rec.steps.forEach((step, idx) => {
        markdown += `${idx + 1}. ${step}\n`;
      });
      markdown += `\n**Confidence:** ${rec.confidence}%\n\n`;
      markdown += `**Citations:**\n`;
      rec.citations.forEach((cit) => {
        markdown += `- [${cit.url}](${cit.url}): "${cit.snippet.slice(0, 100)}..."\n`;
      });
      markdown += `\n---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recommendations-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Downloaded as Markdown" });
  };

  const handleCopy = () => {
    const text = recommendations
      .map(
        (rec) =>
          `${rec.department}: ${rec.recommendation}\n\n${rec.why_it_matters}\n\nSteps:\n${rec.steps
            .map((s, i) => `${i + 1}. ${s}`)
            .join('\n')}\n\nConfidence: ${rec.confidence}%`
      )
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Recommendations copied to clipboard" });
  };

  const groupedByDepartment = recommendations.reduce((acc, rec) => {
    if (!acc[rec.department]) acc[rec.department] = [];
    acc[rec.department].push(rec);
    return acc;
  }, {} as Record<string, Recommendation[]>);

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 80) return "default";
    if (confidence >= 60) return "secondary";
    return "outline";
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-background via-background to-primary/5 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Recommendations (Grounded)
              </CardTitle>
              <CardDescription>
                Department-specific insights based strictly on your indexed website content
              </CardDescription>
            </div>
            {recommendations.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCitations(!showCitations)}
                >
                  {showCitations ? "Hide" : "Show"} Citations
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportJSON}>
                  <Download className="h-4 w-4 mr-1" />
                  JSON
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportMarkdown}>
                  <Download className="h-4 w-4 mr-1" />
                  MD
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Departments</label>
              <div className="flex flex-wrap gap-2">
                {DEPARTMENTS.map((dept) => (
                  <Badge
                    key={dept}
                    variant={selectedDepartments.includes(dept) ? "default" : "outline"}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => toggleDepartment(dept)}
                  >
                    {dept}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || selectedDepartments.length === 0}
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
                  Generate Recommendations
                </>
              )}
            </Button>
          </div>

          {/* Message */}
          {message && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-4">
              {Object.entries(groupedByDepartment).map(([department, recs]) => (
                <Card key={department} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{department}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recs.map((rec, idx) => {
                      const globalIndex = recommendations.indexOf(rec);
                      const isExpanded = expandedRecs.has(globalIndex);
                      
                      return (
                        <div
                          key={globalIndex}
                          className="border rounded-lg p-4 space-y-3 bg-card hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{rec.recommendation}</p>
                            </div>
                            <Badge variant={getConfidenceBadgeVariant(rec.confidence)}>
                              {rec.confidence}% confidence
                            </Badge>
                          </div>

                          {isExpanded && (
                            <div className="space-y-3 pt-2 border-t animate-fade-in">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                  Why it matters:
                                </p>
                                <p className="text-sm text-foreground">{rec.why_it_matters}</p>
                              </div>

                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">
                                  Implementation Steps:
                                </p>
                                <ol className="list-decimal list-inside space-y-1">
                                  {rec.steps.map((step, stepIdx) => (
                                    <li key={stepIdx} className="text-sm text-foreground">
                                      {step}
                                    </li>
                                  ))}
                                </ol>
                              </div>

                              {showCitations && rec.citations.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-2">
                                    Citations:
                                  </p>
                                  <div className="space-y-1">
                                    {rec.citations.map((cit, citIdx) => (
                                      <Button
                                        key={citIdx}
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto py-2 px-3 justify-start text-left w-full"
                                        onClick={() => setSelectedCitation(cit)}
                                      >
                                        <ExternalLink className="h-3 w-3 mr-2 flex-shrink-0" />
                                        <span className="text-xs truncate">{cit.url}</span>
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1"
                              onClick={() => toggleExpanded(globalIndex)}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  Show More
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleUseRecommendation(rec)}
                            >
                              <ArrowRight className="h-4 w-4 mr-1" />
                              Use in Builder
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {recommendations.length === 0 && !message && !isGenerating && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select departments and click Generate to get AI-powered recommendations based on your
                website content.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Citation Modal */}
      <Dialog open={!!selectedCitation} onOpenChange={() => setSelectedCitation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Citation Source</DialogTitle>
            <DialogDescription>Content excerpt from indexed website</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {selectedCitation && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">URL:</p>
                  <a
                    href={selectedCitation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {selectedCitation.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Snippet:</p>
                  <p className="text-sm text-foreground bg-muted p-3 rounded-md">
                    {selectedCitation.snippet}
                  </p>
                </div>
                {selectedCitation.snippet_id && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Snippet ID:</p>
                    <Badge variant="outline">{selectedCitation.snippet_id}</Badge>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
