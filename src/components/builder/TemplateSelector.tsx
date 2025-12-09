import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface Template {
  id: string;
  name: string;
  department: string;
  description: string;
  icon: string;
  defaults: {
    grounding: boolean;
    knowledge: string;
    topK: number;
    topN: number;
    temperature: number;
    selectedModel?: string;
    systemPrompt?: string;
    connectors?: Record<string, string>;
    workflowNodes?: any[];
  };
}

const templates: Template[] = [
  {
    id: "compliance",
    name: "Compliance AI Assistant",
    department: "Healthcare",
    description: "HIPAA compliance monitoring and advisory system",
    icon: "🏥",
    defaults: {
      grounding: true,
      knowledge: "HIPAA policies",
      topK: 20,
      topN: 6,
      temperature: 0.3,
      selectedModel: "gemini-2.0-flash-exp",
      systemPrompt: "You are a Compliance AI Assistant for Healthcare. Your role is to monitor HIPAA compliance and provide advisory guidance. Use the knowledge base to provide accurate, grounded responses based on official HIPAA policies and regulations.",
      connectors: {
        gemini: "configured",
        knowledge: "HIPAA policies"
      },
      workflowNodes: [
        {
          id: "classify",
          type: "classify",
          x: 100,
          y: 200,
          config: {
            labels: ["policy_question", "compliance_check", "incident_report", "general"]
          }
        },
        {
          id: "analyze",
          type: "analyze",
          x: 400,
          y: 200,
          config: {
            analysisType: "compliance_review"
          }
        }
      ]
    }
  },
  {
    id: "predictive",
    name: "Predictive Maintenance",
    department: "Energy/Manufacturing",
    description: "Equipment failure prediction and optimization",
    icon: "⚙️",
    defaults: {
      grounding: true,
      knowledge: "Equipment manuals",
      topK: 25,
      topN: 8,
      temperature: 0.4,
      selectedModel: "gemini-2.0-flash-thinking-exp",
      systemPrompt: "You are a Predictive Maintenance AI for Energy/Manufacturing. Your role is to predict equipment failures and optimize maintenance schedules. Use the equipment manuals and historical data to provide accurate predictions and recommendations.",
      connectors: {
        gemini: "configured",
        knowledge: "Equipment manuals"
      },
      workflowNodes: [
        {
          id: "analyze",
          type: "analyze",
          x: 100,
          y: 200,
          config: {
            analysisType: "failure_prediction"
          }
        },
        {
          id: "classify",
          type: "classify",
          x: 400,
          y: 200,
          config: {
            labels: ["critical", "warning", "normal", "optimal"]
          }
        }
      ]
    }
  },
  {
    id: "marketing",
    name: "Marketing Campaign Bot",
    department: "Marketing",
    description: "Campaign planning and content generation",
    icon: "📱",
    defaults: {
      grounding: false,
      knowledge: "Brand guidelines",
      topK: 15,
      topN: 5,
      temperature: 0.7,
      selectedModel: "gpt-4o",
      systemPrompt: "You are a Marketing Campaign Bot. Your role is to help plan campaigns and generate creative content. Use brand guidelines to ensure consistency while being creative and engaging.",
      connectors: {
        gemini: "configured",
        knowledge: "Brand guidelines"
      },
      workflowNodes: [
        {
          id: "generate",
          type: "generate",
          x: 100,
          y: 200,
          config: {
            contentType: "campaign_content"
          }
        }
      ]
    }
  },
  {
    id: "finance",
    name: "Finance Report Automation",
    department: "Finance",
    description: "Automated financial reporting and analysis",
    icon: "💰",
    defaults: {
      grounding: true,
      knowledge: "Financial policies",
      topK: 20,
      topN: 6,
      temperature: 0.2,
      selectedModel: "gemini-2.0-flash-exp",
      systemPrompt: "You are a Finance Report Automation AI. Your role is to analyze financial data and generate accurate reports. Use financial policies and regulations to ensure compliance and accuracy in all reports.",
      connectors: {
        gemini: "configured",
        knowledge: "Financial policies"
      },
      workflowNodes: [
        {
          id: "analyze",
          type: "analyze",
          x: 100,
          y: 200,
          config: {
            analysisType: "financial_analysis"
          }
        },
        {
          id: "generate_report",
          type: "generate",
          x: 400,
          y: 200,
          config: {
            format: "pdf",
            sections: ["summary", "details", "recommendations"]
          }
        }
      ]
    }
  },
  {
    id: "hr",
    name: "HR Onboarding Assistant",
    department: "Human Resources",
    description: "Employee onboarding and policy guidance",
    icon: "👥",
    defaults: {
      grounding: true,
      knowledge: "HR policies",
      topK: 18,
      topN: 5,
      temperature: 0.4,
      selectedModel: "gemini-2.0-flash-exp",
      systemPrompt: "You are an HR Onboarding Assistant. Your role is to help new employees understand company policies and complete onboarding tasks. Use HR policies and documentation to provide accurate, helpful guidance.",
      connectors: {
        gemini: "configured",
        knowledge: "HR policies"
      },
      workflowNodes: [
        {
          id: "classify",
          type: "classify",
          x: 100,
          y: 200,
          config: {
            labels: ["benefits", "policies", "onboarding_task", "general_question"]
          }
        },
        {
          id: "answer",
          type: "answer",
          x: 400,
          y: 200,
          config: {
            useGrounding: true
          }
        }
      ]
    }
  }
];

interface TemplateSelectorProps {
  selectedTemplate: string | null;
  onSelect: (template: Template) => void;
}

export function TemplateSelector({ selectedTemplate, onSelect }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card
          key={template.id}
          className={`glass-panel section-padding cursor-pointer transition-smooth hover:scale-105 ${
            selectedTemplate === template.id
              ? "border-primary glow-yellow"
              : "border-border hover:border-secondary/50"
          }`}
          onClick={() => onSelect(template)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="text-4xl">{template.icon}</div>
            {selectedTemplate === template.id && (
              <CheckCircle2 className="h-6 w-6 text-primary" />
            )}
          </div>
          <h3 className="text-h3 mb-2">{template.name}</h3>
          <Badge variant="outline" className="mb-3 text-caption">
            {template.department}
          </Badge>
          <p className="text-caption text-muted-foreground mb-4">
            {template.description}
          </p>
          <div className="space-y-1 text-caption text-muted-foreground">
            <div className="flex justify-between">
              <span>Grounding:</span>
              <span className={template.defaults.grounding ? "text-secondary" : "text-muted-foreground"}>
                {template.defaults.grounding ? "ON" : "OFF"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Top-K/Top-N:</span>
              <span className="font-mono">{template.defaults.topK}/{template.defaults.topN}</span>
            </div>
            <div className="flex justify-between">
              <span>Temperature:</span>
              <span className="font-mono">{template.defaults.temperature}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export { templates };
