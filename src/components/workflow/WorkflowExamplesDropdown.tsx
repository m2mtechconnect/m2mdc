import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Sparkles, Users, DollarSign, MessageSquare, FileText } from "lucide-react";

export interface WorkflowExample {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: { label: string };
  }>;
}

const examples: WorkflowExample[] = [
  {
    id: "marketing",
    name: "Marketing Automation",
    description: "Analyze leads → Score → Send to CRM",
    icon: <Sparkles className="h-4 w-4" />,
    nodes: [
      { id: "1", type: "analyze", position: { x: 100, y: 100 }, data: { label: "Analyze Lead Data" } },
      { id: "2", type: "classify", position: { x: 300, y: 100 }, data: { label: "Score Lead" } },
      { id: "3", type: "action", position: { x: 500, y: 100 }, data: { label: "Send to CRM" } },
    ],
  },
  {
    id: "support",
    name: "Customer Support Escalation",
    description: "Analyze message → Classify urgency → Create Jira ticket",
    icon: <MessageSquare className="h-4 w-4" />,
    nodes: [
      { id: "1", type: "analyze", position: { x: 100, y: 100 }, data: { label: "Analyze Message" } },
      { id: "2", type: "classify", position: { x: 300, y: 100 }, data: { label: "Classify Urgency" } },
      { id: "3", type: "action", position: { x: 500, y: 100 }, data: { label: "Create Jira Ticket" } },
    ],
  },
  {
    id: "finance",
    name: "Finance Anomaly Detection",
    description: "Detect anomaly → Notify → Generate report",
    icon: <DollarSign className="h-4 w-4" />,
    nodes: [
      { id: "1", type: "analyze", position: { x: 100, y: 100 }, data: { label: "Detect Anomaly" } },
      { id: "2", type: "action", position: { x: 300, y: 100 }, data: { label: "Notify Teams" } },
      { id: "3", type: "action", position: { x: 500, y: 100 }, data: { label: "Generate Report" } },
    ],
  },
  {
    id: "blank",
    name: "Custom Blank Workflow",
    description: "Start from scratch",
    icon: <FileText className="h-4 w-4" />,
    nodes: [],
  },
];

interface WorkflowExamplesDropdownProps {
  onSelectExample: (example: WorkflowExample) => void;
}

export function WorkflowExamplesDropdown({ onSelectExample }: WorkflowExamplesDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Quick Examples
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel>Template Workflows</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {examples.map((example) => (
          <DropdownMenuItem
            key={example.id}
            onClick={() => onSelectExample(example)}
            className="cursor-pointer"
          >
            <div className="flex items-start gap-3 py-1">
              <div className="flex-shrink-0 mt-0.5">{example.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{example.name}</div>
                <div className="text-xs text-muted-foreground">{example.description}</div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}