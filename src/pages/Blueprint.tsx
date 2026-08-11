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
  Server, 
  Bot, 
  Database, 
  Activity, 
  GitBranch, 
  Users, 
  Plus,
  Loader2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
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
import { ChangeLogPanel } from '@/components/blueprint/ChangeLogPanel';
import {
  CONTROLS_SUBTABS,
  DEFAULT_TAB,
  canonicalTabParams,
  resolveBlueprintTabState,
  type BlueprintTab,
  type ControlsSubtab,
} from '@/pages/blueprint/tabModel';

// Assistant components
import { BlueprintCoPilotPanel } from '@/components/copilot';

// UI Polish Components
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
  const { twin, activeTwinId: twinId } = useActiveTwin();
  const [showCoPilotPanel, setShowCoPilotPanel] = useState(false);
  
  // The URL is authoritative: /blueprint/:id must render :id. The active twin's
  // blueprint is only a fallback when the route carries no id.
  const blueprintId = id || twin?.blueprint_id || 'default';
  const { blueprint, summary, isLoading, downloadBlueprint, capacityNote } =
    useBlueprint(blueprintId);
  
  // Read tab and highlight from query params
  const tabParam = searchParams.get('tab');
  const subParam = searchParams.get('sub');
  const highlightParam = searchParams.get('highlight');
  // The URL is the single source of truth for the active tab and subtab.
  const tabState = resolveBlueprintTabState(tabParam, subParam);
  const activeTab: BlueprintTab = tabState.tab;
  const activeSubtab: ControlsSubtab = tabState.sub;

  // Normalization only (invalid tab, legacy eight-tab deep link, missing
  // Controls subtab) uses replace so it never adds a history entry the user
  // did not create.
  useEffect(() => {
    if (!tabState.normalized) return;
    const next = new URLSearchParams(searchParams);
    const canonical = canonicalTabParams(tabState);
    next.set('tab', canonical.tab);
    if (canonical.sub) next.set('sub', canonical.sub);
    else next.delete('sub');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam, subParam, tabState.normalized]);

  // A deliberate tab selection is a navigation: push, so Browser Back and
  // Forward traverse tab changes. Re-selecting the active tab is a no-op.
  const handleTabChange = (value: string) => {
    if (value === activeTab) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    if (value === 'controls') next.set('sub', activeSubtab);
    else next.delete('sub');
    setSearchParams(next, { replace: false });
  };

  // Controls subtab selection is equally deliberate navigation.
  const handleSubtabChange = (value: string) => {
    if (value === activeSubtab) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'controls');
    next.set('sub', value);
    setSearchParams(next, { replace: false });
  };

  if (isLoading) {
    return <LoadingState message="Loading Blueprint..." />;
  }

  if (!blueprint) {
    return <SnapshotNotFoundEmptyState onGoBack={() => navigate('/dashboard')} />;
  }

  return (
    <BlueprintDesignerWrapper twinId={blueprintId}>
      <div className="min-h-dvh bg-background">
        <div className="flex min-w-0">
          {/* Main Content */}
          <div className={`flex-1 min-w-0 transition-all duration-300 ${showCoPilotPanel ? 'lg:mr-96' : ''}`}>
            <div className="container mx-auto py-4 px-4 max-w-7xl">
              {/*
                Stage 7J: a single compact header. Identity, facility facts and
                every Blueprint action live here so the modelling workspace
                stays above the fold, and the assistant has exactly one entry
                point.
              */}
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
                tier={t('blueprint.tierBadge', { tier: stripTierPrefix(blueprint.tier) })}
                capacityLabel={formatPower(blueprint.capacityKw)}
                rackLabel={t('blueprint.racksBadge', { racks: blueprint.racks })}
                updatedAt={blueprint.updatedAt ? new Date(blueprint.updatedAt) : null}
                dataNote={capacityNote}
                onBack={() => navigate(-1)}
                onDownload={downloadBlueprint}
                assistantOpen={showCoPilotPanel}
                onToggleAssistant={() => setShowCoPilotPanel((open) => !open)}
                assistantLabel={
                  showCoPilotPanel ? t('blueprint.hideAssistant') : t('blueprint.showAssistant')
                }
                extraAction={
                  !twin && blueprintId === 'default' ? (
                    <CreateTwinFromBlueprintButton blueprint={blueprint} />
                  ) : undefined
                }
              />

              {/*
                Counts the Blueprint owns are shown plainly. Roles and
                Integrations are referenced from other workspaces, and
                Scenarios are owned by Simulation, so they are not presented
                here as Blueprint-owned configuration.
              */}
              {summary && (
                <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {[
                    { icon: Bot, label: t('blueprint.stats.agents'), value: summary.totalAgents, tone: 'primary' as StatTone },
                    { icon: Database, label: t('blueprint.stats.dataSources'), value: summary.totalDataSources, tone: 'info' as StatTone },
                    { icon: Activity, label: t('blueprint.stats.kpis'), value: summary.totalKpis, tone: 'success' as StatTone },
                    { icon: GitBranch, label: t('blueprint.stats.workflows'), value: summary.totalWorkflows, tone: 'warning' as StatTone },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    const tone = STAT_TONES[stat.tone];
                    return (
                      <div
                        key={stat.label}
                        className="flex items-center gap-2 rounded-lg border bg-card p-2"
                      >
                        <div className={`rounded p-1 ${tone.chip}`}>
                          <Icon className={`h-3.5 w-3.5 text-muted-foreground ${tone.icon}`} aria-hidden />
                        </div>
                        <span className="truncate text-xs text-muted-foreground">{stat.label}</span>
                        <span className="ml-auto text-sm font-semibold text-foreground">{stat.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}


              {/* Main Tabs - Enhanced with better styling */}
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList
                  aria-label={t('blueprint.tabs.listLabel')}
                  className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto flex-wrap gap-1"
                >
                  {[
                    { value: 'model', label: t('blueprint.tabs.model') },
                    { value: 'assets', label: t('blueprint.tabs.assets') },
                    { value: 'controls', label: t('blueprint.tabs.controls') },
                    { value: 'validation', label: t('blueprint.tabs.validation') },
                    { value: 'versions', label: t('blueprint.tabs.versions') },
                  ].map((tab) => (
                    <TabsTrigger 
                      key={tab.value}
                      value={tab.value}
                      data-blueprint-tab={tab.value}
                      className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5 text-muted-foreground data-[state=active]:text-foreground hover:text-foreground transition-all duration-200 data-[state=active]:font-medium"
                    >
                      {tab.label}
                      {activeTab === tab.value && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary motion-safe:animate-pulse"
                        />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="model" className="m-0">
                    <BlueprintModelSection />
                  </TabsContent>
                  <TabsContent value="assets" className="m-0 space-y-8">
                    <BlueprintOverviewTab blueprint={blueprint} summary={summary} />
                    <BlueprintDataTab dataSources={blueprint.dataSources} integrations={blueprint.integrations} />
                    <BlueprintRolesTab roles={blueprint.humanRoles} />
                  </TabsContent>
                  <TabsContent value="controls" className="m-0">
                    <Tabs value={activeSubtab} onValueChange={handleSubtabChange} className="w-full">
                      <TabsList
                        aria-label={t('blueprint.tabs.controlsListLabel')}
                        className="mb-6 flex-wrap"
                      >
                        {CONTROLS_SUBTABS.map((sub) => (
                          <TabsTrigger key={sub} value={sub} data-blueprint-subtab={sub}>
                            {t(`blueprint.tabs.${sub}`)}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      <TabsContent value="agents" className="m-0">
                        <BlueprintAgentsTab agents={blueprint.agents} domains={blueprint.domains} highlightAgentId={highlightParam || undefined} />
                      </TabsContent>
                      <TabsContent value="kpis" className="m-0">
                        <BlueprintKPIsTab kpis={blueprint.kpis} />
                      </TabsContent>
                      <TabsContent value="workflows" className="m-0">
                        <BlueprintWorkflowsTab workflows={blueprint.workflows} />
                      </TabsContent>
                    </Tabs>
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
                            {/* Stage 7J: scenario readiness is owned by the
                                Simulation workspace, not by Blueprint. */}
                            <p className="text-xs text-muted-foreground">
                              {t('blueprint.scenariosOwnedBySimulation')}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  <TabsContent value="versions" className="m-0">
                    <ChangeLogPanel />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* Assistant side panel */}
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
