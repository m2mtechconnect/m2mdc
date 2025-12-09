/**
 * System Blueprint Page
 * Central source of truth for Data Centre Twin configuration
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useBlueprint } from '@/hooks/useBlueprint';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  Sparkles
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCoPilotContext } from '@/contexts/CoPilotContext';

// Blueprint Tab Components
import { BlueprintOverviewTab } from '@/components/blueprint/tabs/BlueprintOverviewTab';
import { BlueprintAgentsTab } from '@/components/blueprint/tabs/BlueprintAgentsTab';
import { BlueprintDataTab } from '@/components/blueprint/tabs/BlueprintDataTab';
import { BlueprintKPIsTab } from '@/components/blueprint/tabs/BlueprintKPIsTab';
import { BlueprintWorkflowsTab } from '@/components/blueprint/tabs/BlueprintWorkflowsTab';
import { BlueprintRolesTab } from '@/components/blueprint/tabs/BlueprintRolesTab';
import { BlueprintScenariosTab } from '@/components/blueprint/tabs/BlueprintScenariosTab';

export default function Blueprint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openWithQuestion } = useCoPilotContext();
  const { blueprint, summary, isLoading, downloadBlueprint } = useBlueprint(id || 'default');
  
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Server className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">{blueprint.name}</h1>
                  <p className="text-sm text-muted-foreground">{blueprint.location}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline">Tier {blueprint.tier}</Badge>
                <Badge variant="outline">{blueprint.capacityKw} MW</Badge>
                <Badge variant="outline">{blueprint.racks} Racks</Badge>
                <Badge variant="secondary">v{blueprint.version}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadBlueprint}>
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
            </div>
          </div>
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
          </div>
        </Tabs>
      </div>
    </div>
  );
}
