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

// SINGLE TEMPLATE: Data Centre Digital Twin
const templates: Template[] = [
  {
    id: "data-centre",
    name: "Data Centre Digital Twin",
    department: "Infrastructure Operations",
    description: "Production-grade sovereign AI data centre with 9 domain twins, 50+ KPIs, simulation engine, and carbon tracking",
    icon: "🏢",
    defaults: {
      grounding: true,
      knowledge: "DC Operations Manual, Sovereignty Policies, Carbon Standards",
      topK: 10,
      topN: 5,
      temperature: 0.3,
      selectedModel: "gemini-2.5-pro",
      systemPrompt: "You are the Data Centre Digital Twin CoPilot, an expert AI assistant for sovereign data centre operations. You monitor 9 domain twins: Thermal, Power, Cooling, Network, Facility, Workload, Sovereignty, Carbon, and Financial. Provide actionable insights based on real-time telemetry and simulation results.",
      connectors: {
        gpu_telemetry: "realtime",
        power_chain: "realtime",
        cooling_engine: "realtime",
        network_fabric: "realtime",
        sovereignty_validator: "realtime",
        carbon_tracker: "batch",
        financial_engine: "batch"
      },
      workflowNodes: [
        {
          id: "telemetry_ingestion",
          type: "ingest",
          x: 100,
          y: 200,
          config: { sources: ["thermal", "power", "cooling", "network", "workload"] }
        },
        {
          id: "anomaly_detection",
          type: "compute",
          x: 300,
          y: 200,
          config: { analysisType: "cross_domain_correlation" }
        },
        {
          id: "alert_classification",
          type: "decision",
          x: 500,
          y: 200,
          config: { labels: ["critical", "warning", "info", "resolved"] }
        },
        {
          id: "recommendation_engine",
          type: "decision",
          x: 700,
          y: 200,
          config: { domains: ["thermal", "power", "cooling", "workload", "carbon"] }
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
