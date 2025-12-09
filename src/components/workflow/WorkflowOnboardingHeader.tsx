import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Sparkles } from "lucide-react";

interface WorkflowOnboardingHeaderProps {
  onLoadExample: () => void;
}

export function WorkflowOnboardingHeader({ onLoadExample }: WorkflowOnboardingHeaderProps) {
  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">🧠 Automate Your Workflow</h3>
              <Badge variant="secondary" className="gap-1">
                <Lightbulb className="h-3 w-3" />
                Interactive
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              This is where you design how your AI system works. Drag and drop nodes to analyze, 
              make decisions, and connect actions — just like building a mini brain for your agent.
            </p>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">🔍 Example:</span>
                <code className="px-2 py-1 bg-muted rounded text-xs">
                  Analyze Data → Classify Results → Notify Teams via Slack
                </code>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onLoadExample}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Load Example
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}