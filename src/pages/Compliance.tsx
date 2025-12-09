import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield,
  AlertTriangle,
  Clock,
  FileText,
  Download,
  Eye,
  GitBranch,
  Target,
  Thermometer,
  Zap,
  Globe,
  Server,
  Activity,
  PlayCircle,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DecisionReplayModal } from "@/components/rag/DecisionReplayModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// DC-specific audit timeline
const auditTimeline = [
  {
    time: "09:41 AM",
    eventType: "Sovereignty Check",
    action: "Data Routing Verified",
    system: "Thermal Guardian",
    risk: "Low",
    details: "All workload data confirmed within Canadian jurisdiction",
    decisionPath: true,
  },
  {
    time: "10:15 AM",
    eventType: "Thermal Alert",
    action: "Zone Temperature Warning",
    system: "Thermal Guardian",
    risk: "Medium",
    details: "Hot Aisle B exceeded 28°C threshold - cooling boost activated",
    decisionPath: true,
  },
  {
    time: "11:30 AM",
    eventType: "Power Event",
    action: "UPS Battery Check",
    system: "Power Stability Monitor",
    risk: "Low",
    details: "Scheduled battery health assessment completed - 98% capacity",
    decisionPath: true,
  },
  {
    time: "01:45 PM",
    eventType: "Compliance Violation",
    action: "Sovereignty Routing Alert",
    system: "Sovereignty Sentinel",
    risk: "High",
    details: "Attempted data transfer to non-sovereign region blocked",
    decisionPath: true,
  },
  {
    time: "02:30 PM",
    eventType: "Workload Optimization",
    action: "GPU Cluster Rebalance",
    system: "Workload Orchestrator",
    risk: "Low",
    details: "Redistributed training jobs across 4 GPU clusters for efficiency",
    decisionPath: true,
  },
  {
    time: "03:20 PM",
    eventType: "PUE Drift",
    action: "Efficiency Alert",
    system: "Cooling Optimization Agent",
    risk: "Medium",
    details: "PUE increased to 1.42 - investigating cooling inefficiency",
    decisionPath: true,
  },
];

// DC-specific risk categories
const dcRiskCategories = [
  { 
    name: "Sovereign Compliance Score", 
    score: 98, 
    issues: 1, 
    trend: "up",
    lastIssue: "Routing violation blocked",
    description: "Data residency and sovereignty compliance across all workloads"
  },
  { 
    name: "Thermal Safety Events", 
    score: 94, 
    issues: 3, 
    trend: "down",
    lastIssue: "Zone B temperature spike",
    description: "Thermal threshold violations and cooling efficiency"
  },
  { 
    name: "Power/UPS Stability", 
    score: 99, 
    issues: 0, 
    trend: "neutral",
    lastIssue: "None in 30 days",
    description: "Power redundancy and UPS health status"
  },
  { 
    name: "Policy Violations", 
    score: 96, 
    issues: 2, 
    trend: "up",
    lastIssue: "Workload scheduling policy",
    description: "Operational policy and SLA compliance"
  },
  { 
    name: "Carbon Target Compliance", 
    score: 92, 
    issues: 1, 
    trend: "down",
    lastIssue: "Monthly emissions exceeded target",
    description: "Carbon emissions against sustainability targets"
  },
];

export default function Compliance() {
  const navigate = useNavigate();
  const [replayModalOpen, setReplayModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedStressScenario, setSelectedStressScenario] = useState<string>('');

  const handleReplayOpen = (eventDetails: string) => {
    setSelectedEvent(eventDetails);
    setReplayModalOpen(true);
  };

  const handleRiskClick = (riskName: string) => {
    console.log("View risk details:", riskName);
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
              <h1 className="text-2xl font-semibold mb-2 flex items-center gap-3">
                <Shield className="h-6 w-6 text-primary" />
                Sovereignty & Safety Audit
              </h1>
              <p className="text-muted-foreground">
                Data Centre compliance, thermal safety, and operational governance
              </p>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Audit Report
            </Button>
          </div>

          {/* DC-Specific KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground uppercase">Sovereign Compliance</span>
              </div>
              <div className="text-2xl font-bold">98%</div>
              <div className="text-xs text-green-600">+1.2% this month</div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground uppercase">Thermal Safety</span>
              </div>
              <div className="text-2xl font-bold">3</div>
              <div className="text-xs text-amber-600">Events this week</div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground uppercase">Power Warnings</span>
              </div>
              <div className="text-2xl font-bold">0</div>
              <div className="text-xs text-green-600">All systems nominal</div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground uppercase">Policy Violations</span>
              </div>
              <div className="text-2xl font-bold">2</div>
              <div className="text-xs text-muted-foreground">Last 30 days</div>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Audit Timeline */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Audit Timeline
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Subsystem events, safety checks, and compliance actions
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Clock className="h-4 w-4 mr-2" />
                    Last 24h
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {auditTimeline.map((event, idx) => {
                      const isHighRisk = event.risk === "High";
                      const isMediumRisk = event.risk === "Medium";
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer ${
                            isHighRisk
                              ? "border-destructive/50 bg-destructive/5"
                              : isMediumRisk
                              ? "border-amber-500/30 bg-amber-500/5"
                              : "border-border"
                          }`}
                          onClick={() => handleReplayOpen(event.details)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`h-2 w-2 rounded-full ${
                                    isHighRisk ? "bg-destructive" : isMediumRisk ? "bg-amber-500" : "bg-green-500"
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
                                        ? "border-amber-500 text-amber-600"
                                        : !isHighRisk ? "border-green-500 text-green-600" : ""
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
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Risk Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Risk Overview
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Data Centre operational risk indicators
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dcRiskCategories.map((risk) => {
                      const isHighRisk = risk.score < 90;
                      return (
                        <Tooltip key={risk.name}>
                          <TooltipTrigger asChild>
                            <div 
                              className="cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors border border-transparent hover:border-border"
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
                                          ? "border-amber-500 text-amber-600"
                                          : "border-green-500 text-green-600"
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
                                  className={`h-full transition-all ${
                                    isHighRisk ? "bg-amber-500" : "bg-green-500"
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

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Compliance Reports
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Sovereignty Audit Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Thermal Safety Summary
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Carbon Emissions Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Power Stability Log
                  </Button>
                </CardContent>
              </Card>

              {/* Simulation Stress Test Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlayCircle className="h-5 w-5" />
                    Simulation Stress Test
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Run a data residency or thermal safety scenario to see potential impact on compliance.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedStressScenario} onValueChange={setSelectedStressScenario}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose scenario..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sovereignty_routing_violation">Cross-border routing attempt</SelectItem>
                      <SelectItem value="carbon_price_shock">Carbon target breach</SelectItem>
                      <SelectItem value="fire_suppression_discharge">Thermal safety incident</SelectItem>
                      <SelectItem value="water_leak_corridor_sensor">Water leak emergency</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    className="w-full gap-2"
                    disabled={!selectedStressScenario}
                    onClick={() => navigate(`/data-centre-twin?view=simulation&scenarioId=${selectedStressScenario}`)}
                  >
                    <Activity className="h-4 w-4" />
                    Open Simulation
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
