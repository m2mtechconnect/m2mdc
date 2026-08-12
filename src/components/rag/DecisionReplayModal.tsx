import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useReturnFocus } from "@/hooks/useReturnFocus";
import { 
  ArrowRight, 
  Search, 
  Brain, 
  FileText, 
  Download,
  Clock,
  ExternalLink,
} from "lucide-react";

interface DecisionReplayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DecisionReplayModal({ open, onOpenChange }: DecisionReplayModalProps) {
  const returnFocus = useReturnFocus(open);
  const steps = [
    {
      stage: "User Query",
      icon: Search,
      content: "What changes occurred in the 2025 HIPAA update?",
      metadata: { timestamp: "2025-01-15 14:23:47", tokens: 12 },
      tooltip: "The initial user query that triggered this agent execution",
    },
    {
      stage: "Vector Retrieval",
      icon: Search,
      content: "Retrieved 20 candidate documents using text-embedding-004",
      metadata: { latency: "0.8s", hits: 20 },
      tooltip: "Semantic search across knowledge base to find relevant documents",
    },
    {
      stage: "Reranking",
      icon: Brain,
      content: "Gemini 1.5 Pro reranked to top 6 most relevant snippets",
      metadata: { model: "gemini-1.5-pro", snippets: 6 },
      tooltip: "AI model scores and prioritizes the most relevant content",
    },
    {
      stage: "Context Assembly",
      icon: FileText,
      content: "Assembled 1,847 tokens from:\n• HIPAA-Security-2025.pdf [5.2]\n• HIPAA-Privacy-Rules.pdf [3.4]\n• HIPAA-Compliance-Guide.pdf [8.1]",
      metadata: { contextTokens: 1847, sources: 3 },
      tooltip: "Selected content is packaged into a structured context for the AI",
    },
    {
      stage: "Grounded Generation",
      icon: Brain,
      content: "Generated answer with Vertex AI Grounding verification",
      metadata: { 
        model: "gemini-1.5-pro", 
        temperature: 0.3, 
        outputTokens: 247,
        faithfulness: "88%",
      },
      tooltip: "AI generates response while checking against source documents for accuracy",
    },
    {
      stage: "Final Output",
      icon: FileText,
      content: "Answer delivered with 3 verified citations and audit trail",
      metadata: { totalLatency: "2.3s", citations: 3 },
      tooltip: "Complete response with citations and full traceability",
    },
  ];

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-4xl max-h-[85vh] overflow-y-auto bg-card border-2 border-border"
          onCloseAutoFocus={returnFocus}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border-2 border-primary flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-display font-bold text-foreground">
                  Decision Replay
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Step-by-step trace of RAG pipeline execution
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

        {/* System Info */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="grid grid-cols-4 gap-3 p-4 rounded-lg bg-muted border border-border mb-6 cursor-help hover:border-primary/50 transition-smooth">
              <div>
                <p className="text-xs text-muted-foreground mb-1">System</p>
                <p className="text-sm font-semibold text-foreground">Compliance AI</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Model</p>
                <p className="text-sm font-mono text-foreground">gemini-1.5-pro</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Region</p>
                <p className="text-sm text-foreground">🇨🇦 Montreal</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Time</p>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-accent" />
                  <p className="text-sm font-mono font-semibold text-foreground">2.3s</p>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Execution metadata: system name, AI model used, deployment region, and total latency</p>
          </TooltipContent>
        </Tooltip>

        {/* Pipeline Steps */}
        <div className="space-y-4">
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            const isFirst = idx === 0;
            const isLast = idx === steps.length - 1;

            return (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <div className="relative group cursor-pointer">
                    {/* Connector Line */}
                    {!isLast && (
                      <div className="absolute left-[19px] top-[40px] w-0.5 h-12 bg-border group-hover:bg-primary/30 transition-smooth" />
                    )}

                    <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/5 transition-smooth border border-transparent hover:border-accent/30">
                      {/* Step Number/Icon */}
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-smooth ${
                          isFirst
                            ? "bg-primary/10 border-2 border-primary group-hover:bg-primary/20"
                            : isLast
                            ? "bg-accent/10 border-2 border-accent group-hover:bg-accent/20"
                            : "bg-muted border-2 border-border group-hover:border-muted-foreground"
                        }`}
                      >
                        <StepIcon
                          className={`h-5 w-5 transition-smooth ${
                            isFirst
                              ? "text-primary"
                              : isLast
                              ? "text-accent"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        />
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 pb-2">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
                            {step.stage}
                            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-smooth" />
                          </h4>
                          <Badge
                            variant="outline"
                            className={`text-xs transition-smooth ${
                              isFirst
                                ? "border-primary text-primary bg-primary/5"
                                : isLast
                                ? "border-accent text-accent bg-accent/5"
                                : "group-hover:border-foreground"
                            }`}
                          >
                            Step {idx + 1}
                          </Badge>
                        </div>

                        <div className="p-3 rounded-lg bg-muted border border-border mb-2 group-hover:border-muted-foreground/30 transition-smooth">
                          <p className="text-sm whitespace-pre-line text-foreground leading-relaxed">{step.content}</p>
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-3 text-xs">
                          {Object.entries(step.metadata).map(([key, value]) => (
                            <span key={key} className="flex items-center gap-1 px-2 py-1 rounded bg-muted/50">
                              <span className="text-foreground font-medium">
                                {key}:
                              </span>
                              <span className="font-mono text-muted-foreground">{value}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p>{step.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-6 mt-6 border-t-2 border-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="hover:border-primary transition-smooth">
                Close
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Close decision replay viewer</p>
            </TooltipContent>
          </Tooltip>
          
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" className="hover:border-accent transition-smooth">
                  <Download className="h-4 w-4 mr-2" />
                  Export Trace
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download this execution trace as JSON or PDF</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground glow-yellow font-semibold transition-smooth">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View Full Audit Log
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Navigate to complete audit timeline with all executions</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}
