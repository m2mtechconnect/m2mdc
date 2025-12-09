import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, 
  Brain, 
  Database, 
  Workflow, 
  TrendingUp,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import type { DigitalTwinBlueprint } from "@/lib/templateLoader";

interface TemplatePreviewDialogProps {
  template: DigitalTwinBlueprint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplatePreviewDialog({ template, open, onOpenChange }: TemplatePreviewDialogProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-h2 font-display mb-2">{template.name}</h2>
              <p className="text-body text-muted-foreground">{template.description}</p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {template.industry.replace('_', ' ')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {template.badges.map((badge) => (
                <Badge key={badge} className="bg-accent text-white gap-1">
                  {badge.includes("Certified") && <Shield className="h-3 w-3" />}
                  {badge}
                </Badge>
              ))}
            </div>

            <Separator />

            {/* LLM Configuration */}
            <Card className="section-padding">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-5 w-5 text-primary" />
                <h3 className="text-h3 font-display">AI Model Configuration</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-caption">
                <div>
                  <span className="text-muted-foreground">Provider:</span>
                  <p className="font-medium capitalize">{template.llm.provider}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Model:</span>
                  <p className="font-medium">{template.llm.model}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Temperature:</span>
                  <p className="font-medium">{template.llm.temperature}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <p className="font-medium">{template.llm.location}</p>
                </div>
              </div>
            </Card>

            {/* RAG Configuration */}
            <Card className="section-padding">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-5 w-5 text-secondary" />
                <h3 className="text-h3 font-display">RAG Configuration</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-caption">
                <div>
                  <span className="text-muted-foreground">Grounding:</span>
                  <p className="font-medium flex items-center gap-1">
              {(template as any).grounding ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-accent" />
                  Enabled
                </>
              ) : (
                "Disabled"
              )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Hybrid Search:</span>
                  <p className="font-medium flex items-center gap-1">
                    {template.rag.hybrid_search ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-accent" />
                        Enabled
                      </>
                    ) : (
                      "Disabled"
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Top-K:</span>
                  <p className="font-medium">{template.rag.top_k}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Top-N:</span>
                  <p className="font-medium">{template.rag.top_n}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Embedding Model:</span>
                  <p className="font-medium">{template.rag.embedding_model}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Vector Dimensions:</span>
                  <p className="font-medium">{template.rag.vector_dim}</p>
                </div>
              </div>
            </Card>

            {/* Knowledge Sources */}
            <Card className="section-padding">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-accent" />
                <h3 className="text-h3 font-display">Knowledge Sources</h3>
              </div>
              <div className="space-y-2">
                {template.knowledge.map((source, idx) => (
                  <div key={idx} className="text-caption">
                    <Badge variant="outline" className="capitalize">
                      {source.type.replace('_', ' ')}
                    </Badge>
                    {source.ref && <span className="ml-2 text-muted-foreground">{source.ref}</span>}
                  </div>
                ))}
              </div>
            </Card>

            {/* Connectors */}
            <Card className="section-padding">
              <div className="flex items-center gap-2 mb-3">
                <Workflow className="h-5 w-5 text-primary" />
                <h3 className="text-h3 font-display">Connectors</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {template.connectors.map((conn) => (
                  <Badge key={conn.id} variant="secondary" className="capitalize">
                    {conn.id} ({conn.mode})
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Expected ROI */}
            <Card className="section-padding bg-gradient-to-br from-primary/10 to-accent/10">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-h3 font-display">Expected ROI</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-caption">
                <div>
                  <span className="text-muted-foreground">Time Saved:</span>
                  <p className="font-medium">{template.metrics_defaults.time_saved_per_run_min} min/run</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Runs per Week:</span>
                  <p className="font-medium">{template.metrics_defaults.runs_per_week}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">ROI Hint:</span>
                  <p className="font-medium text-primary">{template.roi_hint}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Accuracy Improvement:</span>
                  <p className="font-medium">{template.metrics_defaults.accuracy_improvement_pct}%</p>
                </div>
              </div>
            </Card>

            {/* System Prompt */}
            <Card className="section-padding">
              <h3 className="text-h3 font-display mb-2">System Prompt</h3>
              <p className="text-caption text-muted-foreground italic">
                {template.system_prompt}
              </p>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
