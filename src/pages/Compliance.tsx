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
  Users,
  CheckCircle2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { DecisionReplayModal } from "@/components/rag/DecisionReplayModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useBlueprint } from "@/hooks/useBlueprint";
import { useBlueprintScenarios } from "@/hooks/useBlueprintScenarios";
import { useSovereignty } from "@/sovereignty";
import { SovereigntyAuditTimeline } from "@/components/compliance/SovereigntyAuditTimeline";
import { SovereigntyRiskOverview } from "@/components/compliance/SovereigntyRiskOverview";
import { useActiveTwin } from "@/context/ActiveTwinContext";
import { useTwinSovereigntyEvents } from "@/hooks/useTwinData";
import { DOMAINS } from "@/ux";
import { getSovereigntyRulesForContext, type SovereigntyRule } from "@/domain/greenDc/sovereigntyConfig";
import { useTwinKPIsFromSimulation } from "@/hooks/useTwinKPIsFromSimulation";
import { KPI_CATALOG, KPIKey } from "@/domain/greenDc/kpiCatalog";
import { MetricValue } from "@/components/provenance/MetricValue";
import { notAssessedMetric } from "@/lib/provenance/kitMetrics";
import { describeExportBlock } from "@/lib/provenance/exporters";
import { staticMetric, demoMetric } from "@/lib/provenance";

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [replayModalOpen, setReplayModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedStressScenario, setSelectedStressScenario] = useState<string>('');
  
  // Twin context for scoped data
  const { twin, activeTwinId: twinId } = useActiveTwin();
  const { data: sovereigntyEvents } = useTwinSovereigntyEvents({ limit: 50 });
  
  // Get Blueprint data for workflows, roles, and scenarios - use twin's blueprint if available
  const blueprintId = twin?.blueprint_id || 'default';
  const { blueprint, summary, downloadBlueprint } = useBlueprint(blueprintId);
  const { scenarios } = useBlueprintScenarios(blueprintId);
  
  // Get sovereignty engine data
  const sovereignty = useSovereignty();
  
  // Get KPIs from simulation runs
  const { kpis: simulationKpis, loading: kpisLoading } = useTwinKPIsFromSimulation(twinId || undefined);
  
  // Get region and industry from twin for filtering sovereignty rules
  const twinRegion = twin?.region_code || 'CA-QC';
  const twinIndustry = twin?.industry || 'generic';
  
  // Get relevant sovereignty rules based on region + industry
  const relevantSovereigntyRules = useMemo(() => {
    return getSovereigntyRulesForContext(twinRegion, twinIndustry);
  }, [twinRegion, twinIndustry]);
  
  // Get compliance-relevant scenarios (sovereignty, facility_safety, financial)
  const complianceScenarios = useMemo(() => {
    return scenarios.filter(s => 
      s.domainsInvolved.some(d => 
        ['sovereignty', 'facility_safety', 'financial_carbon'].includes(d)
      )
    );
  }, [scenarios]);
  
  // Get workflows from Blueprint relevant to compliance
  const complianceWorkflows = useMemo(() => {
    if (!blueprint) return [];
    return blueprint.workflows.filter(w => 
      ['sovereignty', 'facility_safety', 'financial_carbon'].includes(w.domain)
    );
  }, [blueprint]);
  
  // Get human roles responsible for compliance
  const complianceRoles = useMemo(() => {
    if (!blueprint) return [];
    return blueprint.humanRoles.filter(r => 
      r.domains.some(d => ['sovereignty', 'facility_safety', 'financial_carbon'].includes(d))
    );
  }, [blueprint]);

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
                {t('compliance.title')}
              </h1>
              <p className="text-muted-foreground">
                {twin ? `${twin.name} - ${twin.city}` : t('compliance.subtitle')}
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} data-testid="compliance-export-audit-blocked">
                    <Button
                      variant="outline"
                      disabled
                      aria-disabled="true"
                      data-export-blocked="sovereignty-not-assessed"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t('compliance.exportAuditReport')}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  {describeExportBlock('sovereignty-not-assessed')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* DC-Specific KPIs - Now powered by Sovereignty Engine */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/*
              Phase 1A.1 §5: sovereignty score, audit readiness score and
              "certified frameworks" count are NOT sourced from an audited
              evidence store. They must render as "Not assessed" until real
              evidence collection exists (Phase 1B). Cross-border flow count
              and violation count come from the demo sovereignty fixture and
              are labelled `demo`.
            */}
            <Card className="p-4">
              <MetricValue
                id="compliance-sovereign"
                label="Sovereign compliance"
                metric={notAssessedMetric<number>(
                  'sovereignty-evidence-store',
                  'Not assessed — no wired evidence collection.',
                )}
                icon={<Globe className="h-4 w-4 text-blue-500" />}
                footer="Applicable frameworks: PIPEDA, Quebec Law 25 (configured, not achieved)."
              />
            </Card>

            <Card className="p-4">
              <MetricValue
                id="compliance-cross-border"
                label="Cross-border flows (demo)"
                metric={demoMetric<number>(sovereignty.crossBorderFlows, 'sovereignty-demo-fixture')}
                icon={<Shield className="h-4 w-4 text-purple-500" />}
                footer="Monitored flows from demonstration fixture."
              />
            </Card>

            <Card className="p-4">
              <MetricValue
                id="compliance-audit-readiness"
                label="Audit readiness"
                metric={notAssessedMetric<number>(
                  'audit-evidence-store',
                  'Not assessed — evidence not collected.',
                )}
                icon={<Target className="h-4 w-4 text-green-500" />}
                footer="Evidence not collected. Customer validation required."
              />
            </Card>

            <Card className="p-4">
              <MetricValue
                id="compliance-violations"
                label="Policy violations (demo)"
                metric={demoMetric<number>(sovereignty.violationCount, 'sovereignty-demo-fixture')}
                icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                footer={sovereignty.violationCount === 0 ? 'None in demonstration fixture.' : 'Active in demonstration fixture.'}
              />
            </Card>
          </div>

          {/* Applicable Sovereignty Rules - Filtered by Region + Industry */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Applicable Compliance Requirements
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Rules for {twinRegion} region, {twinIndustry} industry • {relevantSovereigntyRules.length} requirements
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relevantSovereigntyRules.map((rule: SovereigntyRule) => {
                  // Get KPI value if rule has a kpiKey
                  const kpiValue = rule.kpiKey ? simulationKpis[rule.kpiKey] : null;
                  const kpiDef = rule.kpiKey ? KPI_CATALOG[rule.kpiKey as KPIKey] : null;
                  const isCompliant = kpiValue !== null && kpiDef 
                    ? (kpiDef.direction === 'higher_is_better' ? kpiValue >= (kpiDef.target || 0) : kpiValue <= (kpiDef.target || 100))
                    : null;
                  
                  return (
                    <Card key={rule.id} className={`p-4 border ${
                      rule.severity === 'critical' ? 'border-destructive/50' : 
                      rule.severity === 'high' ? 'border-amber-500/50' : 'border-border'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={rule.severity === 'critical' ? 'destructive' : rule.severity === 'high' ? 'default' : 'secondary'}>
                            {rule.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{rule.id.toUpperCase()}</span>
                        </div>
                        {isCompliant !== null && (
                          <Badge variant={isCompliant ? 'default' : 'destructive'} className={isCompliant ? 'bg-green-600' : ''}>
                            {isCompliant ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                            {isCompliant ? 'Meets configured threshold' : 'Below configured threshold'}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium mb-1">{rule.label}</h4>
                      {rule.kpiKey && kpiDef && (
                        <div className="text-sm text-muted-foreground mb-2">
                          {kpiDef.label}: {kpiValue !== null ? `${kpiValue}${kpiDef.unit || ''}` : 'N/A'}
                        </div>
                      )}
                      <div className="space-y-1">
                        {rule.checklistItems.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            {item}
                          </div>
                        ))}
                        {rule.checklistItems.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{rule.checklistItems.length - 2} more requirements
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
                {relevantSovereigntyRules.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No specific sovereignty rules apply to this region and industry combination.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
              {/* Risk Overview - Now powered by Sovereignty Engine */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Risk Overview
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Sovereignty and compliance risk indicators
                  </p>
                </CardHeader>
                <CardContent>
                  <SovereigntyRiskOverview 
                    result={sovereignty.result} 
                    onClick={() => navigate('/data-centre-twin?tab=sovereignty')}
                  />
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
                  <TooltipProvider>
                    {[
                      { label: 'Sovereignty Audit Report', reason: 'sovereignty-not-assessed' as const },
                      { label: 'Thermal Safety Summary', reason: 'no-audited-source' as const },
                      { label: 'Carbon Emissions Report', reason: 'no-audited-source' as const },
                      { label: 'Power Stability Log', reason: 'no-audited-source' as const },
                    ].map((r) => (
                      <Tooltip key={r.label}>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="block">
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                              disabled
                              aria-disabled="true"
                              data-export-blocked={r.reason}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {r.label}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          {describeExportBlock(r.reason)}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    <p className="text-[10px] text-muted-foreground pt-1">
                      These reports will be enabled in Phase 1B once an audited data source is wired.
                    </p>
                  </TooltipProvider>
                </CardContent>
              </Card>

              {/* System Blueprint Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    System Blueprint
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {summary ? `${summary.totalWorkflows} workflows, ${summary.totalRoles} roles defined` : 'Loading...'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/blueprint/default?tab=workflows')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Workflows ({complianceWorkflows.length} compliance)
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/blueprint/default?tab=roles')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View Roles ({complianceRoles.length} compliance)
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={downloadBlueprint}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Blueprint JSON
                  </Button>
                </CardContent>
              </Card>
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
                      {complianceScenarios.map(scenario => (
                        <SelectItem key={scenario.id} value={scenario.id}>
                          {scenario.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    {complianceScenarios.length} compliance scenarios from Blueprint
                  </div>
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
