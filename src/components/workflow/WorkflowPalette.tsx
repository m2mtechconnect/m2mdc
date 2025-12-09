import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Brain, 
  Filter, 
  MessageSquare, 
  Ticket, 
  Database, 
  FileText,
  Plug
} from "lucide-react";

interface WorkflowPaletteProps {
  onAddNode: (type: 'analyze' | 'classify' | 'mcp_tool' | 'notify_teams' | 'create_ticket_jira' | 'write_salesforce' | 'generate_report') => void;
}

const nodeTypes = [
  { type: 'analyze' as const, label: 'Analyze', icon: Brain, color: 'text-accent' },
  { type: 'classify' as const, label: 'Classify', icon: Filter, color: 'text-secondary' },
  { type: 'mcp_tool' as const, label: 'MCP Tool Call', icon: Plug, color: 'text-primary' },
  { type: 'notify_teams' as const, label: 'Notify Teams', icon: MessageSquare, color: 'text-accent' },
  { type: 'create_ticket_jira' as const, label: 'Create Jira Ticket', icon: Ticket, color: 'text-secondary' },
  { type: 'write_salesforce' as const, label: 'Write Salesforce', icon: Database, color: 'text-primary' },
  { type: 'generate_report' as const, label: 'Generate Report', icon: FileText, color: 'text-accent' },
];

export function WorkflowPalette({ onAddNode }: WorkflowPaletteProps) {
  return (
    <Card className="glass-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-h3 font-display">Node Palette</h3>
        <p className="text-caption text-muted-foreground">Click to add nodes</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {nodeTypes.map(({ type, label, icon: Icon, color }) => (
          <Button
            key={type}
            variant="outline"
            className="h-auto flex-col gap-2 p-4 hover:border-primary transition-smooth"
            onClick={() => onAddNode(type)}
            aria-label={`Add ${label} node`}
          >
            <Icon className={`h-6 w-6 ${color}`} aria-hidden="true" />
            <span className="text-xs font-medium text-center">{label}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
}
