import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { 
  Brain, 
  Filter, 
  MessageSquare, 
  Ticket, 
  Database, 
  FileText,
  Plug
} from "lucide-react";

interface EnhancedWorkflowPaletteProps {
  onAddNode: (type: any) => void;
}

const nodeTypes = [
  { 
    type: 'analyze', 
    label: '🧠 Analyze', 
    icon: Brain,
    description: 'Process incoming data or text to extract meaning or metrics',
    example: 'Analyze sentiment or detect trends in customer feedback'
  },
  { 
    type: 'classify', 
    label: '🧩 Classify', 
    icon: Filter,
    description: 'Make a decision or route data based on conditions',
    example: 'If sentiment < 0.4 → escalate to human agent'
  },
  { 
    type: 'notify_teams', 
    label: '📢 Notify Teams', 
    icon: MessageSquare,
    description: 'Send updates to your team or stakeholders',
    example: 'Slack message to Marketing team about new lead'
  },
  { 
    type: 'mcp_tool', 
    label: '⚙️ MCP Tool Call', 
    icon: Plug,
    description: 'Invoke an external system or API tool',
    example: 'Send email via Gmail API or query database'
  },
  { 
    type: 'create_ticket_jira', 
    label: '🎟️ Create Jira Ticket', 
    icon: Ticket,
    description: 'Automate task creation for project tracking',
    example: 'Create bug ticket when anomaly found'
  },
  { 
    type: 'write_salesforce', 
    label: '💼 Write Salesforce', 
    icon: Database,
    description: 'Update CRM records automatically',
    example: 'Add high-value lead to Salesforce pipeline'
  },
  { 
    type: 'generate_report', 
    label: '📊 Generate Report', 
    icon: FileText,
    description: 'Summarize data and produce insights',
    example: 'Generate weekly performance report with key metrics'
  }
];

export function EnhancedWorkflowPalette({ onAddNode }: EnhancedWorkflowPaletteProps) {
  return (
    <aside className="w-56 border-r border-border/50 bg-background overflow-y-auto p-3">
      <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
        Nodes
      </h3>
      
      <div className="space-y-1.5">
        {nodeTypes.map((node) => {
          const Icon = node.icon;
          return (
            <TooltipProvider key={node.type} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddNode(node.type)}
                    className="w-full justify-start gap-2.5 h-9 hover:bg-accent/50 hover:text-foreground transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="text-xs truncate text-left flex-1">{node.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">{node.label}</p>
                    <p className="text-xs text-muted-foreground">{node.description}</p>
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs font-medium text-primary mb-1">💡 Example:</p>
                      <p className="text-xs text-muted-foreground italic">{node.example}</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </aside>
  );
}
