import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { HelpCircle, Sparkles, Users, DollarSign, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const commonWorkflows = [
  {
    title: "Marketing",
    icon: <Sparkles className="h-4 w-4 text-purple-500" />,
    description: "Analyze leads → Score → Send to CRM",
    steps: ["Analyze incoming lead data", "Score based on criteria", "Push high-value leads to CRM"],
  },
  {
    title: "Support",
    icon: <MessageSquare className="h-4 w-4 text-blue-500" />,
    description: "Analyze message → Classify → Create Jira ticket",
    steps: ["Analyze customer message", "Classify urgency level", "Auto-create ticket for urgent cases"],
  },
  {
    title: "Finance",
    icon: <DollarSign className="h-4 w-4 text-green-500" />,
    description: "Detect anomaly → Notify → Generate report",
    steps: ["Detect financial anomalies", "Notify stakeholders", "Generate detailed report"],
  },
];

export function WorkflowHelpPanel() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Workflow Help & Tips
          </SheetTitle>
          <SheetDescription>
            Learn how to build effective workflows with examples and best practices
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quick Start Guide */}
          <div>
            <h3 className="text-sm font-semibold mb-3">🚀 Quick Start</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-medium text-foreground">1.</span>
                <span>Drag nodes from the palette to the canvas</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">2.</span>
                <span>Connect nodes by dragging from output to input</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">3.</span>
                <span>Configure each node with specific actions</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">4.</span>
                <span>Validate and test your workflow</span>
              </li>
            </ol>
          </div>

          {/* Common Workflows */}
          <div>
            <h3 className="text-sm font-semibold mb-3">📚 Common Workflows</h3>
            <div className="space-y-3">
              {commonWorkflows.map((workflow) => (
                <Card key={workflow.title}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">{workflow.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1">{workflow.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{workflow.description}</p>
                        <ul className="space-y-1">
                          {workflow.steps.map((step, index) => (
                            <li key={index} className="text-xs text-muted-foreground flex gap-1.5">
                              <span className="text-primary">→</span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Tips & Best Practices */}
          <div>
            <h3 className="text-sm font-semibold mb-3">💡 Tips & Best Practices</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span>•</span>
                <span>Start simple with 2-3 nodes, then expand</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Use Classify nodes for branching logic</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Always include at least one action node</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Test workflows with sample data first</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Use descriptive names for clarity</span>
              </li>
            </ul>
          </div>

          {/* Node Types Reference */}
          <div>
            <h3 className="text-sm font-semibold mb-3">🧩 Node Types</h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="font-medium">🧠 Analyze:</span>
                <span className="text-muted-foreground">Process and extract insights from data</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium">🧩 Classify:</span>
                <span className="text-muted-foreground">Make decisions based on conditions</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium">⚙️ MCP Tool:</span>
                <span className="text-muted-foreground">Call external APIs and systems</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium">📢 Notify:</span>
                <span className="text-muted-foreground">Send updates to teams</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}