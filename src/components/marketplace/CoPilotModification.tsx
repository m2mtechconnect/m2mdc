import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, 
  Send, 
  Loader2, 
  CheckCircle2,
  Sparkles,
  Code2,
  AlertCircle
} from "lucide-react";
import { DigitalTwinBlueprint } from "@/lib/templateLoader";
import { useToast } from "@/hooks/use-toast";

interface CoPilotModificationProps {
  template: DigitalTwinBlueprint;
  onBlueprintChange: (updatedBlueprint: DigitalTwinBlueprint) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  changes?: BlueprintChange[];
}

interface BlueprintChange {
  type: 'add_step' | 'modify_kpi' | 'add_trigger' | 'add_approval' | 'modify_condition';
  description: string;
  path: string;
  value: any;
}

export function CoPilotModification({ template, onBlueprintChange }: CoPilotModificationProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your Co-Pilot for modifying "${template.name}". I can help you:\n\n• Add or remove workflow steps\n• Modify KPI targets\n• Add approval points\n• Change trigger conditions\n• Update integration parameters\n\nWhat would you like to change?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Parse intent and generate changes
      const changes = parseUserIntent(input, template);
      const response = generateResponse(input, changes);

      // Apply changes to blueprint
      if (changes.length > 0) {
        const updatedBlueprint = applyChanges(template, changes);
        onBlueprintChange(updatedBlueprint);
        
        toast({
          title: "Blueprint Updated",
          description: `${changes.length} change(s) applied successfully`,
        });
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        changes: changes.length > 0 ? changes : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process your request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold flex items-center gap-2">
            Blueprint Co-Pilot
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Powered
            </Badge>
          </h3>
          <p className="text-xs text-muted-foreground">
            Modify workflow, KPIs, and configuration with natural language
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {message.role === 'user' ? 'You' : <Bot className="h-4 w-4" />}
              </div>
              <div className={`flex-1 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                <div className={`p-3 rounded-lg max-w-[85%] ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-auto' 
                    : 'bg-muted'
                }`}>
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                  
                  {message.changes && message.changes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                        <Code2 className="h-3 w-3" />
                        Applied Changes:
                      </div>
                      {message.changes.map((change, changeIdx) => (
                        <div key={changeIdx} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{change.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing your request...
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="e.g., 'Add a human approval step before execution' or 'Change KPI target to 95%'"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={isProcessing}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isProcessing}
            size="icon"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Try: "Add approval point" • "Change temperature to 0.1" • "Add new trigger for alerts"
        </p>
      </div>
    </Card>
  );
}

// AI Intent Parsing
function parseUserIntent(input: string, template: DigitalTwinBlueprint): BlueprintChange[] {
  const changes: BlueprintChange[] = [];
  const lowerInput = input.toLowerCase();

  // Add approval point
  if (lowerInput.includes('add') && (lowerInput.includes('approval') || lowerInput.includes('human'))) {
    changes.push({
      type: 'add_approval',
      description: 'Added human approval point before final execution',
      path: 'blueprint.human_approval_points',
      value: 'Final execution approval'
    });
  }

  // Modify KPI
  const kpiMatch = lowerInput.match(/change|set|update.*(kpi|target).*?(\d+)/);
  if (kpiMatch && template.blueprint.kpis.length > 0) {
    const newTarget = parseInt(kpiMatch[2]);
    changes.push({
      type: 'modify_kpi',
      description: `Updated KPI target to ${newTarget}%`,
      path: `blueprint.kpis[0].target`,
      value: newTarget
    });
  }

  // Add workflow step
  if (lowerInput.includes('add') && (lowerInput.includes('step') || lowerInput.includes('workflow'))) {
    changes.push({
      type: 'add_step',
      description: 'Added new workflow step for additional validation',
      path: 'workflow.nodes',
      value: {
        id: `custom_${Date.now()}`,
        type: 'validation',
        label: 'Additional Validation Step'
      }
    });
  }

  // Modify temperature
  const tempMatch = lowerInput.match(/temperature.*?(\d+\.?\d*)/);
  if (tempMatch) {
    changes.push({
      type: 'modify_condition',
      description: `Updated LLM temperature to ${tempMatch[1]}`,
      path: 'llm.temperature',
      value: parseFloat(tempMatch[1])
    });
  }

  // Add trigger
  if (lowerInput.includes('add') && lowerInput.includes('trigger')) {
    changes.push({
      type: 'add_trigger',
      description: 'Added new event trigger for alerts',
      path: 'blueprint.event_triggers',
      value: 'Custom alert threshold exceeded'
    });
  }

  return changes;
}

function generateResponse(input: string, changes: BlueprintChange[]): string {
  if (changes.length === 0) {
    return `I understand you want to: "${input}"\n\nI can help with that! Could you be more specific? For example:\n• "Add a human approval step before sending emails"\n• "Change the accuracy KPI target to 95%"\n• "Set temperature to 0.2 for more deterministic outputs"`;
  }

  return `I've made ${changes.length} change(s) to your blueprint:\n\n${changes.map(c => `✓ ${c.description}`).join('\n')}\n\nThe changes are applied immediately to your workflow. You can continue modifying or deploy when ready!`;
}

function applyChanges(template: DigitalTwinBlueprint, changes: BlueprintChange[]): DigitalTwinBlueprint {
  const updated = JSON.parse(JSON.stringify(template)); // Deep clone

  changes.forEach(change => {
    const pathParts = change.path.split('.');
    let target: any = updated;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
      
      if (arrayMatch) {
        target = target[arrayMatch[1]][parseInt(arrayMatch[2])];
      } else {
        target = target[part];
      }
    }

    const lastPart = pathParts[pathParts.length - 1];
    
    if (Array.isArray(target[lastPart])) {
      target[lastPart].push(change.value);
    } else {
      target[lastPart] = change.value;
    }
  });

  return updated;
}
