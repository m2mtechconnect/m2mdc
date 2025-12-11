/**
 * System Blueprint Page - DESIGNER MODE
 * Central source of truth for Data Centre Twin configuration
 * This page operates in DESIGNER mode - full editing capabilities enabled
 * For read-only simulation snapshots, use SimulationBlueprintSnapshotPanel
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useBlueprint } from '@/hooks/useBlueprint';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Download, 
  Server, 
  Bot, 
  Database, 
  Activity, 
  GitBranch, 
  Users, 
  PlayCircle,
  MessageCircle,
  Sparkles,
  Plus,
  Loader2,
  Edit3,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useToast } from '@/hooks/use-toast';
import { BLUEPRINT } from '@/ux';

// Blueprint View Context - Designer Mode
import { BlueprintDesignerWrapper } from '@/components/blueprint/BlueprintDesignerWrapper';
import { BlueprintValidationPanel } from '@/components/blueprint/BlueprintValidationPanel';
import { DesignerModeHeader } from '@/components/blueprint/DesignerModeHeader';

// Blueprint Tab Components
import { BlueprintOverviewTab } from '@/components/blueprint/tabs/BlueprintOverviewTab';
import { BlueprintAgentsTab } from '@/components/blueprint/tabs/BlueprintAgentsTab';
import { BlueprintDataTab } from '@/components/blueprint/tabs/BlueprintDataTab';
import { BlueprintKPIsTab } from '@/components/blueprint/tabs/BlueprintKPIsTab';
import { BlueprintWorkflowsTab } from '@/components/blueprint/tabs/BlueprintWorkflowsTab';
import { BlueprintRolesTab } from '@/components/blueprint/tabs/BlueprintRolesTab';
import { BlueprintScenariosTab } from '@/components/blueprint/tabs/BlueprintScenariosTab';

// Co-Pilot Components
import { BlueprintCoPilotPanel, CoPilotModeHeader } from '@/components/copilot';

// Create Twin from Blueprint Button Component
function CreateTwinFromBlueprintButton({ blueprint }: { blueprint: any }) {
  const { createTwin } = useActiveTwin();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const newTwin = await createTwin(null, {
        name: blueprint.name || 'Montreal Sovereign AI DC',
        city: 'Montreal',
        region_code: 'QC',
        tier: blueprint.tier || 'Tier III',
        capacity_kw: blueprint.capacityKw * 1000 || 10000,
        industry: 'ai_compute',
        pue_target: blueprint.pueTarget || 1.3,
        renewable_target_pct: 95,
        carbon_intensity: 12,
        sovereignty_level: 'federal',
        metadata: {
          from_blueprint: 'default',
          racks: blueprint.racks,
        },
      });

      if (newTwin) {
        toast({
          title: 'Twin Created',
          description: `${newTwin.name} is now available in the selector.`,
        });
        navigate('/data-centre-twin');
      }
    } catch (err) {
      toast({
        title: 'Creation Failed',
        description: err instanceof Error ? err.message : 'Failed to create twin',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button onClick={handleCreate} disabled={isCreating}>
      {isCreating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <Plus className="h-4 w-4 mr-2" />
          Add to My Twins
        </>
      )}
    </Button>
  );
}

export default function Blueprint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openWithQuestion } = useCoPilotContext();
  const { twin, activeTwinId: twinId } = useActiveTwin();
  const [showCoPilotPanel, setShowCoPilotPanel] = useState(false);
  
  // Use twin's blueprint_id if available, otherwise use URL param or 'default'
  const blueprintId = twin?.blueprint_id || id || 'default';
  const { blueprint, summary, isLoading, downloadBlueprint } = useBlueprint(blueprintId);
  
  // Read tab and highlight from query params
  const tabParam = searchParams.get('tab');
  const highlightParam = searchParams.get('highlight');
  const [activeTab, setActiveTab] = useState(tabParam || 'overview');
  
  // Switch tab when query param changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  if (isLoading || !blueprint) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20 border-t-primary"></div>
          <p className="text-sm text-muted-foreground">Loading Blueprint...</p>
        </div>
      </div>
    );
  }

  const handleAskCoPilot = (question: string) => {
    openWithQuestion(question);
  };

  return (
    <BlueprintDesignerWrapper>
      <div className="min-h-screen bg-background">
        <div className="flex">
          {/* Main Content */}
          <div className={`flex-1 transition-all duration-300 ${showCoPilotPanel ? 'mr-96' : ''}`}>
            <div className="container mx-auto py-6 px-4 max-w-7xl">
              {/* DESIGNER MODE HEADER - Clear visual distinction */}
              <DesignerModeHeader
                twinName={twin?.name || blueprint.name}
                twinId={blueprintId}
                location={twin?.city || blueprint.location}
                showSimulationLink={true}
              />

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  
                  {/* Co-Pilot Mode Header */}
                  <CoPilotModeHeader mode="blueprint-designer" />
                </div>
                <div className="flex gap-2">
                  {/* Toggle Co-Pilot Panel */}
                  <Button
                    variant={showCoPilotPanel ? 'secondary' : 'outline'}
                    onClick={() => setShowCoPilotPanel(!showCoPilotPanel)}
                    className="gap-2"
                  >
                    {showCoPilotPanel ? (
                      <>
                        <PanelRightClose className="h-4 w-4" />
                        Hide Assistant
                      </>
                    ) : (
                      <>
                        <PanelRightOpen className="h-4 w-4" />
                        Show Assistant
                      </>
                    )}
                  </Button>
                  
                  {!twin && blueprintId === 'default' && (
                    <CreateTwinFromBlueprintButton blueprint={blueprint} />
                  )}
                  <Button variant="outline" onClick={downloadBlueprint}>
                    <Download className="h-4 w-4 mr-2" />
                    Download JSON
                  </Button>
                </div>
              </div>

              {/* Blueprint Info Card */}
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge variant="outline">Tier {blueprint.tier}</Badge>
                <Badge variant="outline">{blueprint.capacityKw} MW</Badge>
                <Badge variant="outline">{blueprint.racks} Racks</Badge>
                <Badge variant="secondary">v{blueprint.version}</Badge>
              </div>

              {/* Quick Stats */}
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Agents</span>
                    </div>
                    <p className="text-lg font-semibold">{summary.totalAgents}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Data Sources</span>
                    </div>
                    <p className="text-lg font-semibold">{summary.totalDataSources}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">KPIs</span>
                    </div>
                    <p className="text-lg font-semibold">{summary.totalKpis}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Workflows</span>
                    </div>
                    <p className="text-lg font-semibold">{summary.totalWorkflows}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Roles</span>
                    </div>
                    <p className="text-lg font-semibold">{summary.totalRoles}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <PlayCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Scenarios</span>
                    </div>
                    <p className="text-lg font-semibold">{summary.totalScenarios}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Integrations</span>
                    </div>
                    <p className="text-lg font-semibold">{summary.totalIntegrations}</p>
                  </div>
                </div>
              )}

              {/* Co-Pilot Quick Actions */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 mb-6">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Ask Co-Pilot:</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleAskCoPilot('Which agents manage thermal safety in this data centre?')}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Thermal Agents
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleAskCoPilot('Show all workflows related to UPS failures in this blueprint.')}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    UPS Workflows
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleAskCoPilot('What KPIs relate to carbon and cost in this data centre?')}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Carbon KPIs
                  </Button>
                </div>
              </div>

              {/* Main Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
                  <TabsTrigger 
                    value="overview" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="agents"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                  >
                    Agents
                  </TabsTrigger>
                  <TabsTrigger 
                    value="data"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                  >
                    Data
                  </TabsTrigger>
                  <TabsTrigger 
                    value="kpis"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                  >
                    KPIs
                  </TabsTrigger>
                  <TabsTrigger 
                    value="workflows"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                  >
                    Workflows
                  </TabsTrigger>
                  <TabsTrigger 
                    value="roles"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                  >
                    Roles
                  </TabsTrigger>
                  <TabsTrigger 
                    value="scenarios"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                  >
                    Scenarios
                  </TabsTrigger>
                  <TabsTrigger 
                    value="validation"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                  >
                    Validation
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="overview" className="m-0">
                    <BlueprintOverviewTab blueprint={blueprint} summary={summary} />
                  </TabsContent>
                  <TabsContent value="agents" className="m-0">
                    <BlueprintAgentsTab agents={blueprint.agents} domains={blueprint.domains} highlightAgentId={highlightParam || undefined} />
                  </TabsContent>
                  <TabsContent value="data" className="m-0">
                    <BlueprintDataTab dataSources={blueprint.dataSources} integrations={blueprint.integrations} />
                  </TabsContent>
                  <TabsContent value="kpis" className="m-0">
                    <BlueprintKPIsTab kpis={blueprint.kpis} />
                  </TabsContent>
                  <TabsContent value="workflows" className="m-0">
                    <BlueprintWorkflowsTab workflows={blueprint.workflows} />
                  </TabsContent>
                  <TabsContent value="roles" className="m-0">
                    <BlueprintRolesTab roles={blueprint.humanRoles} />
                  </TabsContent>
                  <TabsContent value="scenarios" className="m-0">
                    <BlueprintScenariosTab scenarios={blueprint.simulationScenarios} />
                  </TabsContent>
                  <TabsContent value="validation" className="m-0">
                    <div className="grid lg:grid-cols-2 gap-6">
                      <BlueprintValidationPanel blueprint={blueprint} />
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Deployment Readiness
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            Review validation issues before deploying this blueprint to production.
                          </p>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                              <span className="text-sm">Agents Configured</span>
                              <Badge variant="outline">{blueprint.agents.length}</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                              <span className="text-sm">KPIs Tracked</span>
                              <Badge variant="outline">{blueprint.kpis.length}</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                              <span className="text-sm">Workflows Active</span>
                              <Badge variant="outline">{blueprint.workflows.filter(w => w.enabled).length}</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                              <span className="text-sm">Scenarios Ready</span>
                              <Badge variant="outline">{blueprint.simulationScenarios.length}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* Co-Pilot Side Panel */}
          {showCoPilotPanel && (
            <div className="fixed right-0 top-16 bottom-0 w-96 border-l bg-background shadow-lg z-40 overflow-hidden">
              <BlueprintCoPilotPanel activeTab={activeTab} className="h-full" />
            </div>
          )}
        </div>
      </div>
    </BlueprintDesignerWrapper>
  );
}
