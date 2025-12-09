import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  AlertTriangle,
  Clock,
  FileText,
  Download,
  Eye,
  GitBranch,
  Target,
  Sparkles,
  Brain,
  Wrench,
  AlertOctagon,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { DecisionReplayModal } from "@/components/rag/DecisionReplayModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DCCard, DCSectionHeader } from "@/components/dc-ui/DCCard";
import { DCKPITile } from "@/components/dc-ui/DCKPITile";
import { DCStatusBadge } from "@/components/dc-ui/DCStatusBadge";

// AI-specific audit timeline
const auditTimeline = [
  {
    time: "09:41 AM",
    eventType: "Tool Invocation",
    action: "Salesforce CRM Update",
    system: "Sales Agent",
    risk: "Low",
    details: "Successfully updated 3 customer records via Salesforce API",
    decisionPath: true,
  },
  {
    time: "10:15 AM",
    eventType: "RAG Retrieval",
    action: "Low Confidence Warning",
    system: "Customer Support Twin",
    risk: "Medium",
    details: "Query returned confidence score of 62% - Response blocked by safety filter",
    decisionPath: true,
  },
  {
    time: "11:30 AM",
    eventType: "Human Approval",
    action: "Checkpoint Triggered",
    system: "Finance Report Agent",
    risk: "Low",
    details: "Workflow paused for human review before sending quarterly report",
    decisionPath: true,
  },
  {
    time: "01:45 PM",
    eventType: "Safety Block",
    action: "Policy Violation Detected",
    system: "Marketing Campaign Agent",
    risk: "High",
    details: "Attempted to send email to unverified contacts - Action blocked",
    decisionPath: true,
  },
  {
    time: "02:30 PM",
    eventType: "MCP Server Call",
    action: "GitHub Integration",
    system: "DevOps Twin",
    risk: "Low",
    details: "Created 2 pull requests and updated 5 issues via GitHub MCP",
    decisionPath: true,
  },
  {
    time: "03:20 PM",
    eventType: "Drift Alert",
    action: "Behavior Change Detected",
    system: "Inventory Optimization Agent",
    risk: "Medium",
    details: "Agent output pattern deviates 18% from baseline - Review recommended",
    decisionPath: true,
  },
];

// AI-specific risk categories
const aiRiskCategories = [
  { 
    name: "Hallucination Risk", 
    score: 92, 
    issues: 2, 
    trend: "down",
    lastIssue: "Low confidence response blocked",
    description: "Risk of AI generating unfaithful or ungrounded responses"
  },
  { 
    name: "Incorrect Action Risk", 
    score: 96, 
    issues: 0, 
    trend: "neutral",
    lastIssue: "None in 30 days",
    description: "Risk of agent performing wrong tool invocations or API calls"
  },
  { 
    name: "Automation Drift Risk", 
    score: 88, 
    issues: 3, 
    trend: "up",
    lastIssue: "Output pattern deviation detected",
    description: "Risk of agent behavior changing unexpectedly over time"
  },
  { 
    name: "Data Exposure Risk", 
    score: 98, 
    issues: 0, 
    trend: "neutral",
    lastIssue: "None in 90 days",
    description: "Risk of sensitive data leaking through responses or logs"
  },
  { 
    name: "Tool Misuse Risk", 
    score: 94, 
    issues: 1, 
    trend: "down",
    lastIssue: "Unauthorized API scope attempted",
    description: "Risk of tools/MCP servers being invoked incorrectly or unsafely"
  },
];

// RAG citation data
const ragCitations = [
  {
    query: "Customer refund policy Canada",
    docs: 3,
    fidelity: 95,
    model: "gemini-2.5-pro",
    confidence: 98,
    sources: ["refund-policy-2024.pdf", "customer-service-guide.docx", "legal-terms.pdf"],
  },
  {
    query: "Product pricing tier comparison",
    docs: 5,
    fidelity: 88,
    model: "gpt-5-mini",
    confidence: 92,
    sources: ["pricing-sheet-q4.xlsx", "competitor-analysis.pdf", "product-catalog.pdf"],
  },
  {
    query: "Supply chain lead times Asia",
    docs: 2,
    fidelity: 93,
    model: "gemini-2.5-flash",
    confidence: 89,
    sources: ["logistics-data-2024.csv", "supplier-contracts.pdf"],
  },
  {
    query: "Compliance requirements GDPR",
    docs: 4,
    fidelity: 97,
    model: "gpt-5",
    confidence: 99,
    sources: ["gdpr-guide.pdf", "legal-compliance.docx", "privacy-policy.pdf", "audit-log-2024.xlsx"],
  },
];

export default function Compliance() {
  const [replayModalOpen, setReplayModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const handleReplayOpen = (eventDetails: string) => {
    setSelectedEvent(eventDetails);
    setReplayModalOpen(true);
  };

  const handleRiskClick = (riskName: string) => {
    // Navigate to detailed risk analysis
    console.log("View risk details:", riskName);
  };

  const handleCitationClick = (sources: string[]) => {
    // Navigate to document context
    console.log("View sources:", sources);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <DecisionReplayModal
          open={replayModalOpen}
          onOpenChange={setReplayModalOpen}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-display font-bold mb-2 text-gradient-hero">
                Compliance & Audit
              </h1>
              <p className="text-muted-foreground text-lg">
                AI Governance, Explainability, and Decision Transparency
              </p>
            </div>
          </div>

          {/* A. Compliance Summary - AI-Specific KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <DCKPITile
              label="Explainability Score"
              value="96"
              unit="%"
              status="normal"
              trend="up"
              delta="+2.3%"
              icon={<Brain className="h-5 w-5" />}
            />
            <DCKPITile
              label="RAG Grounding Fidelity"
              value="93"
              unit="%"
              status="normal"
              trend="up"
              delta="+1.8%"
              icon={<BookOpen className="h-5 w-5" />}
            />
            <DCKPITile
              label="Tool Accuracy"
              value="97"
              unit="%"
              status="normal"
              trend="stable"
              icon={<Wrench className="h-5 w-5" />}
            />
            <DCKPITile
              label="Safety Events"
              value="6"
              subtitle="Last 30 days"
              status="warning"
              trend="down"
              delta="-3"
              icon={<AlertOctagon className="h-5 w-5" />}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* B. Audit Timeline - Left Column (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              <DCCard
                title="Audit Timeline"
                subtitle="Chronological view of agent executions, safety events, and tool calls"
                icon={<Clock className="h-5 w-5" />}
                status="operational"
                headerAction={
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Clock className="h-4 w-4 mr-2" />
                        Last 24h
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Filter events by time range</p>
                    </TooltipContent>
                  </Tooltip>
                }
              >
                  <div className="space-y-4">
                    {auditTimeline.map((event, idx) => {
                      const isHighRisk = event.risk === "High";
                      const isMediumRisk = event.risk === "Medium";
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-lg border transition-smooth hover:border-secondary/50 cursor-pointer ${
                            isHighRisk
                              ? "border-destructive/50 bg-destructive/5"
                              : isMediumRisk
                              ? "border-primary/30 bg-primary/5"
                              : "border-border"
                          }`}
                          onClick={() => handleReplayOpen(event.details)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`h-2 w-2 rounded-full ${
                                    isHighRisk ? "bg-destructive" : isMediumRisk ? "bg-primary" : "bg-secondary"
                                  }`}
                                />
                                {idx < auditTimeline.length - 1 && (
                                  <div className="h-12 w-px bg-border mt-2" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    {event.eventType}
                                  </Badge>
                                  <span className="font-semibold">{event.action}</span>
                                  <Badge
                                    variant={isHighRisk ? "destructive" : "outline"}
                                    className={`text-xs ${
                                      !isHighRisk && isMediumRisk
                                        ? "border-primary text-primary"
                                        : !isHighRisk ? "border-secondary text-secondary" : ""
                                    }`}
                                  >
                                    {event.risk} Risk
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {event.system}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {event.time}
                            </span>
                          </div>
                          <p className="text-sm pl-7 mb-3">{event.details}</p>
                          <div className="flex gap-2 pl-7">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReplayOpen(event.details);
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-2" />
                                  View Details
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View full event details and context</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReplayOpen(event.details);
                                  }}
                                >
                                  <GitBranch className="h-3 w-3 mr-2" />
                                  Decision Replay
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Replay the full reasoning and action sequence</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-6 border-t border-border text-center">
                    <Button variant="outline">
                      Load More History
                    </Button>
                  </div>
                </DCCard>
            </div>

            {/* Right Column (1/3 width) */}
            <div className="space-y-6">
              {/* C. Risk Overview - AI-Specific Risks */}
              <Card className="glass-panel">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-2xl font-display">Risk Overview</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI-specific risk indicators for reasoning, actions, and tool usage
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {aiRiskCategories.map((risk) => {
                      const isHighRisk = risk.score < 90;
                      return (
                        <Tooltip key={risk.name}>
                          <TooltipTrigger asChild>
                            <div 
                              className="cursor-pointer hover:bg-accent/50 p-3 rounded-lg transition-smooth border border-transparent hover:border-secondary/30"
                              onClick={() => handleRiskClick(risk.name)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">{risk.name}</span>
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${
                                        isHighRisk
                                          ? "border-primary text-primary"
                                          : "border-secondary text-secondary"
                                      }`}
                                    >
                                      {risk.issues > 0 ? `${risk.issues} issues` : "Clean"}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {risk.lastIssue}
                                  </p>
                                </div>
                                <span className="font-mono text-sm font-semibold ml-2">
                                  {risk.score}%
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-smooth ${
                                    isHighRisk ? "bg-primary" : "bg-secondary"
                                  }`}
                                  style={{ width: `${risk.score}%` }}
                                />
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <p>{risk.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* D. Decision Replay (Explainability Mode) */}
              <Card className="glass-panel">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle className="font-display">Decision Replay</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    View full reasoning and action sequences for any agent run
                  </p>
                </CardHeader>
                <CardContent>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleReplayOpen("Sample decision replay")}
                      >
                        <GitBranch className="h-4 w-4 mr-2" />
                        Replay Execution
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Open decision replay viewer with reasoning trace, workflow paths, and tool calls</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Target className="h-3 w-3" />
                      <span>Reasoning trace</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-3 w-3" />
                      <span>Workflow paths</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-3 w-3" />
                      <span>Tool & MCP calls</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3 w-3" />
                      <span>RAG citations</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* E. RAG Citations */}
              <Card className="glass-panel">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-5 w-5 text-secondary" />
                    <CardTitle className="font-display">RAG Citations</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Trace responses back to source documents
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ragCitations.map((item, idx) => (
                      <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                          <div
                            className="p-3 rounded-lg border border-border hover:border-secondary/50 transition-smooth text-sm cursor-pointer"
                            onClick={() => handleCitationClick(item.sources)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-xs line-clamp-1">{item.query}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCitationClick(item.sources);
                                }}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex gap-3 text-xs text-muted-foreground mb-2">
                              <span>
                                Docs: <span className="text-foreground font-medium">{item.docs}</span>
                              </span>
                              <span>
                                Fidelity:{" "}
                                <span className="text-secondary font-semibold">
                                  {item.fidelity}%
                                </span>
                              </span>
                              <span>
                                Confidence:{" "}
                                <span className="text-secondary font-semibold">
                                  {item.confidence}%
                                </span>
                              </span>
                            </div>
                            <div className="text-xs font-mono text-muted-foreground">
                              {item.model}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="font-semibold mb-2">Source Documents:</p>
                          <ul className="space-y-1">
                            {item.sources.map((source, i) => (
                              <li key={i} className="text-xs">• {source}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* F. Exportable Compliance Reports */}
              <Card className="glass-panel">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-secondary" />
                    <CardTitle className="font-display">Export Reports</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Download compliance documents for audits and governance
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Download className="h-3 w-3 mr-2" />
                          Decision Replay Report
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Detailed reasoning traces and decision paths</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Download className="h-3 w-3 mr-2" />
                          Tool & MCP Invocation Log
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Complete log of all tool and MCP server calls</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Download className="h-3 w-3 mr-2" />
                          RAG Usage Report
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>RAG fidelity scores, citations, and source documents</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Download className="h-3 w-3 mr-2" />
                          Safety Events Log
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>All safety blocks, policy violations, and risk events</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Download className="h-3 w-3 mr-2" />
                          Drift Analysis Summary
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Agent behavior changes and pattern deviations</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
