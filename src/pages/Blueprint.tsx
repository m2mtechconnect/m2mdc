/**
 * System Blueprint Page - DESIGNER MODE
 * Central source of truth for Data Centre Twin configuration
 * This page operates in DESIGNER mode - full editing capabilities enabled
 * For read-only simulation snapshots, use SimulationBlueprintSnapshotPanel
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  MapPin,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { resolveFacilityNaming } from '@/workspace/facilityNaming';
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

// Co-Pilot Components
import { BlueprintCoPilotPanel, CoPilotModeHeader } from '@/components/copilot';

// UI Polish Components
import { SnapshotBadge, ModeBadge, LastUpdatedBadge, SnapshotHeader } from '@/components/ui/snapshot-indicator';
import { KpiTooltip } from '@/components/ui/kpi-tooltip';
import { LoadingState, SnapshotNotFoundEmptyState } from '@/components/ui/empty-state';
import { BlueprintModelSection } from '@/workspace/BlueprintModelSection';
import { formatPower } from '@/workspace/facilityModel';
import { normalizeLocation } from '@/lib/location/normalizeLocation';
import { classifyCreateTwinFields } from '@/lib/provenance/twinFieldProvenance';
import type { DataCentreBlueprint } from '@/types/dataCentreBlueprint';

/**
 * Static Tailwind class map. Interpolated classes (`bg-${color}/10`) are not
 * emitted by the JIT compiler and only rendered before because the literals
 * happened to exist elsewhere in the bundle.
 */
const STAT_TONES = {
  primary: { chip: 'bg-primary/10 group-hover:bg-primary/20', icon: 'group-hover:text-primary' },
  info: { chip: 'bg-info/10 group-hover:bg-info/20', icon: 'group-hover:text-info' },
  success: { chip: 'bg-success/10 group-hover:bg-success/20', icon: 'group-hover:text-success' },
  warning: { chip: 'bg-warning/10 group-hover:bg-warning/20', icon: 'group-hover:text-warning' },
  destructive: { chip: 'bg-destructive/10 group-hover:bg-destructive/20', icon: 'group-hover:text-destructive' },
} as const;

type StatTone = keyof typeof STAT_TONES;

/**
 * Blueprint tabs. Scenario configuration and run execution are owned by the
 * Simulation workspace, so there is no scenarios tab here.
 */
const BLUEPRINT_TABS = [
  'model',
  'overview',
  'agents',
  'data',
  'kpis',
  'workflows',
  'roles',
  'validation',
] as const;
type BlueprintTab = (typeof BLUEPRINT_TABS)[number];
const DEFAULT_TAB: BlueprintTab = 'model';

function isBlueprintTab(value: string | null): value is BlueprintTab {
  return !!value && (BLUEPRINT_TABS as readonly string[]).includes(value);
}

/** Tier values arrive either as "III" or already prefixed as "Tier III". */
function stripTierPrefix(tier: string): string {
  return tier.replace(/^\s*tier\s+/i, '');
}

function CreateTwinFromBlueprintButton({ blueprint }: { blueprint: DataCentreBlueprint }) {
  const { t } = useTranslation();
  const { createTwin } = useActiveTwin();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      // Facility identity comes from the blueprint being converted, never a
      // hard-coded Montreal default.
      // Typed normalization: structured fields win, nothing is guessed and
      // nothing defaults to Montreal / QC.
      const location = normalizeLocation(blueprint.location);
      const supplied = {
        name: blueprint.name,
        city: location.city ?? undefined,
        region_code: location.regionCode ?? undefined,
        tier: blueprint.tier || undefined,
        capacity_kw: blueprint.capacityKw || undefined,
      };
      const newTwin = await createTwin(null, {
        ...supplied,
        // `capacityKw` is already kilowatts. Multiplying by 1000 wrote watts into a
        // kW column and relied on normaliseStoredCapacityKw() to rescale it back.
        metadata: {
          from_blueprint: blueprint.id,
          racks: blueprint.racks,
          location_provenance: {
            displayLocation: location.displayLocation,
            source: location.source,
            confidence: location.confidence,
          },
          // Every context-applied default keeps its classification so no
          // assumption can later be read as a validated facility fact.
          field_provenance: classifyCreateTwinFields(supplied),
        },
      });

      if (newTwin) {
        toast({
          title: t('blueprint.twinCreated'),
          description: t('blueprint.twinCreatedDesc', { name: newTwin.name }),
        });
        navigate('/data-centre-twin');
      }
    } catch (err) {
      toast({
        title: t('blueprint.creationFailed'),
        description: err instanceof Error ? err.message : t('blueprint.creationFailed'),
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
          {t('blueprint.creating')}
        </>
      ) : (
        <>
          <Plus className="h-4 w-4 mr-2" />
          {t('blueprint.addToMyTwins')}
        </>
      )}
    </Button>
  );
}

export default function Blueprint() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openWithQuestion } = useCoPilotContext();
  const { twin, activeTwinId: twinId } = useActiveTwin();
  const [showCoPilotPanel, setShowCoPilotPanel] = useState(false);
  
  // The URL is authoritative: /blueprint/:id must render :id. The active twin's
  // blueprint is only a fallback when the route carries no id.
  const blueprintId = id || twin?.blueprint_id || 'default';
  const { blueprint, summary, isLoading, downloadBlueprint } = useBlueprint(blueprintId);
  
  // Read tab and highlight from query params
  const tabParam = searchParams.get('tab');
  const highlightParam = searchParams.get('highlight');
  // The URL is the single source of truth for the active tab.
  const activeTab: BlueprintTab = isBlueprintTab(tabParam) ? tabParam : DEFAULT_TAB;

  // Normalization only (invalid tab, legacy `scenarios` link, missing param)
  // uses replace so it never adds a history entry the user did not create.
  useEffect(() => {
    if (tabParam !== null && !isBlueprintTab(tabParam)) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', DEFAULT_TAB);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  // A deliberate tab selection is a navigation: push, so Browser Back and
  // Forward traverse tab changes. Re-selecting the active tab is a no-op.
  const handleTabChange = (value: string) => {
    if (value === activeTab) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next, { replace: false });
  };

  if (isLoading) {
    return <LoadingState message="Loading Blueprint..." />;
  }

  if (!blueprint) {
    return <SnapshotNotFoundEmptyState onGoBack={() => navigate('/dashboard')} />;
  }

  const handleAskCoPilot = (question: string) => {
    openWithQuestion(question);
  };

  return (
    <BlueprintDesignerWrapper twinId={blueprintId}>
      <div className="min-h-dvh bg-background">
        <div className="flex min-w-0">
          {/* Main Content */}
          <div className={`flex-1 min-w-0 transition-all duration-300 ${showCoPilotPanel ? 'lg:mr-96' : ''}`}>
            <div className="container mx-auto py-6 px-4 max-w-7xl">
              {/* DESIGNER MODE HEADER - Clear visual distinction */}
              <DesignerModeHeader
                twinName={resolveFacilityNaming({
                  name: twin?.name || blueprint.name,
                  city: twin?.city || blueprint.location,
                  regionCode: twin?.region_code,
                  tier: twin?.tier,
                  sovereigntyLevel: twin?.sovereignty_level,
                  industry: twin?.industry,
                }).displayName}
                twinId={blueprintId}
                location={twin?.city || blueprint.location}
                showSimulationLink={true}
                blueprintId={blueprintId}
                versionId={blueprint.version ?? null}
                returnTab={activeTab}
              />

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 min-w-0">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('blueprint.back')}
                  </Button>
                  
                  {/* Co-Pilot Mode Header */}
                  <CoPilotModeHeader mode="blueprint-designer" />
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
                  {/* Toggle Co-Pilot Panel */}
                  <Button
                    variant={showCoPilotPanel ? 'secondary' : 'outline'}
                    onClick={() => setShowCoPilotPanel(!showCoPilotPanel)}
                    className="gap-2"
                  >
                    {showCoPilotPanel ? (
                      <>
                        <PanelRightClose className="h-4 w-4" />
                        {t('blueprint.hideAssistant')}
                      </>
                    ) : (
                      <>
                        <PanelRightOpen className="h-4 w-4" />
                        {t('blueprint.showAssistant')}
                      </>
                    )}
                  </Button>
                  
                  {!twin && blueprintId === 'default' && (
                    <CreateTwinFromBlueprintButton blueprint={blueprint} />
                  )}
                  <Button variant="outline" onClick={downloadBlueprint}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('blueprint.downloadJson')}
                  </Button>
                </div>
              </div>

              {/* Blueprint Snapshot Header */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <SnapshotHeader
                  version={String(blueprint.version)}
                  mode="designer"
                  changesCount={0}
                  lastUpdated={blueprint.updatedAt ? new Date(blueprint.updatedAt) : undefined}
                />
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {twin?.city || blueprint.location}
                </Badge>
                <Badge variant="outline">{t('blueprint.tierBadge', { tier: stripTierPrefix(blueprint.tier) })}</Badge>
                <Badge variant="outline">{formatPower(blueprint.capacityKw)}</Badge>
                <Badge variant="outline">{t('blueprint.racksBadge', { racks: blueprint.racks })}</Badge>
              </div>

              {/* Quick Stats - Enhanced with animations and hover effects */}
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                  {[
                    { icon: Bot, label: t('blueprint.stats.agents'), value: summary.totalAgents, tone: 'primary' as StatTone },
                    { icon: Database, label: t('blueprint.stats.dataSources'), value: summary.totalDataSources, tone: 'info' as StatTone },
                    { icon: Activity, label: t('blueprint.stats.kpis'), value: summary.totalKpis, tone: 'success' as StatTone },
                    { icon: GitBranch, label: t('blueprint.stats.workflows'), value: summary.totalWorkflows, tone: 'warning' as StatTone },
                    { icon: Users, label: t('blueprint.stats.roles'), value: summary.totalRoles, tone: 'primary' as StatTone },
                    { icon: PlayCircle, label: t('blueprint.stats.scenarios'), value: summary.totalScenarios, tone: 'destructive' as StatTone },
                    { icon: Database, label: t('blueprint.stats.integrations'), value: summary.totalIntegrations, tone: 'info' as StatTone },
                  ].map((stat, index) => {
                    const Icon = stat.icon;
                    const tone = STAT_TONES[stat.tone];
                    return (
                      <div 
                        key={stat.label}
                        className="group p-3 rounded-lg border bg-card hover:bg-muted/50 hover:shadow-md hover:border-primary/30 transition-all duration-300 animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`p-1 rounded transition-colors ${tone.chip}`}>
                            <Icon className={`h-3.5 w-3.5 text-muted-foreground transition-colors ${tone.icon}`} />
                          </div>
                          <span className="text-xs text-muted-foreground">{stat.label}</span>
                        </div>
                        <p className="text-lg font-semibold group-hover:text-primary transition-colors">{stat.value}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Co-Pilot Quick Actions - Enhanced */}
              <div className="flex items-center gap-3 p-4 rounded-xl border bg-gradient-to-r from-primary/5 via-background to-primary/5 mb-6 animate-fade-in hover:shadow-md transition-all duration-300">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <span className="text-sm font-medium text-foreground">{t('blueprint.askCoPilot')}</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs hover:bg-primary/10 hover:text-primary transition-all group"
                    onClick={() => handleAskCoPilot('Which agents manage thermal safety in this data centre?')}
                  >
                    <MessageCircle className="h-3 w-3 mr-1 group-hover:scale-110 transition-transform" />
                    {t('blueprint.thermalAgents')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs hover:bg-primary/10 hover:text-primary transition-all group"
                    onClick={() => handleAskCoPilot('Show all workflows related to UPS failures in this blueprint.')}
                  >
                    <MessageCircle className="h-3 w-3 mr-1 group-hover:scale-110 transition-transform" />
                    {t('blueprint.upsWorkflows')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs hover:bg-primary/10 hover:text-primary transition-all group"
                    onClick={() => handleAskCoPilot('What KPIs relate to carbon and cost in this data centre?')}
                  >
                    <MessageCircle className="h-3 w-3 mr-1 group-hover:scale-110 transition-transform" />
                    {t('blueprint.carbonKpis')}
                  </Button>
                </div>
              </div>

              {/* Main Tabs - Enhanced with better styling */}
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto flex-wrap gap-1">
                  {[
                    { value: 'model', label: t('blueprint.tabs.model') },
                    { value: 'overview', label: t('blueprint.tabs.overview') },
                    { value: 'agents', label: t('blueprint.tabs.agents') },
                    { value: 'data', label: t('blueprint.tabs.data') },
                    { value: 'kpis', label: t('blueprint.tabs.kpis') },
                    { value: 'workflows', label: t('blueprint.tabs.workflows') },
                    { value: 'roles', label: t('blueprint.tabs.roles') },
                    { value: 'validation', label: t('blueprint.tabs.validation') },
                  ].map((tab) => (
                    <TabsTrigger 
                      key={tab.value}
                      value={tab.value}
                      className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5 text-muted-foreground data-[state=active]:text-foreground hover:text-foreground transition-all duration-200 data-[state=active]:font-medium"
                    >
                      {tab.label}
                      {activeTab === tab.value && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-pulse" />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="model" className="m-0">
                    <BlueprintModelSection />
                  </TabsContent>
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
                  <TabsContent value="validation" className="m-0">
                    <div className="grid lg:grid-cols-2 gap-6">
                      <BlueprintValidationPanel blueprint={blueprint} />
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            {t('blueprint.deploymentReadiness')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            {t('blueprint.deploymentReadinessDesc')}
                          </p>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                              <span className="text-sm">{t('blueprint.agentsConfigured')}</span>
                              <Badge variant="outline">{blueprint.agents.length}</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                              <span className="text-sm">{t('blueprint.kpisTracked')}</span>
                              <Badge variant="outline">{blueprint.kpis.length}</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                              <span className="text-sm">{t('blueprint.workflowsActive')}</span>
                              <Badge variant="outline">{blueprint.workflows.filter(w => w.enabled).length}</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                              <span className="text-sm">{t('blueprint.scenariosReady')}</span>
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
