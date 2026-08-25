import { useTranslation } from "react-i18next";
/**
 * Blueprint Preview Page - READ-ONLY recommendation preview.
 *
 * Truth contract:
 * - renders only fields present in the recommendation payload;
 * - never infers Uptime tier, MW capacity, workflow count, role count, or data-source count;
 * - does not create or select a twin.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Eye, Bot, Activity, PlayCircle, MapPin, AlertCircle, Plus } from 'lucide-react';
import { useRecommendationStore } from '@/stores/recommendationStore';
import { ModeBadge, SnapshotBadge } from '@/components/ui/snapshot-indicator';
import { LoadingState } from '@/components/ui/empty-state';

function displayId(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function BlueprintPreview() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { recommendation, sourceUrl, isPreviewMode } = useRecommendationStore();
  const [activeTab, setActiveTab] = useState('overview');

  const locationState = location.state as { mode?: string } | undefined;
  const isPreview = locationState?.mode === 'preview' || isPreviewMode;

  if (!recommendation && !isPreview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md p-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-lg font-semibold mb-2">{t('blueprintPreview.noRecommendation')}</h1>
          <p className="text-muted-foreground mb-4">{t('blueprintPreview.noRecommendationDesc')}</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (!recommendation) {
    return <LoadingState message={t('blueprintPreview.loadingRecommendation')} />;
  }

  const twinName = recommendation.companyName
    ? `${recommendation.companyName} Data Centre Twin Recommendation`
    : 'Data Centre Twin Recommendation';
  const agents = recommendation.agents ?? [];
  const scenarios = recommendation.scenarios ?? [];
  const kpiTargetCount = Object.keys(recommendation.kpiTargets ?? {}).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <ModeBadge mode="snapshot" />
          <SnapshotBadge version="Recommendation preview" />
          <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-700 border-amber-500/30">
            <Eye className="h-3 w-3" />
            Read-Only Preview
          </Badge>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">{twinName}</h1>
          <p className="text-muted-foreground">
            {sourceUrl ? `Recommendation derived from ${sourceUrl}` : 'Recommendation preview from the current scan result'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Values on this page are recommendation inputs and planning targets. They are not deployed infrastructure, measured telemetry, or validated runtime results.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={() => navigate('/dashboard')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Data Centre Twin
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {recommendation.regions.map((region) => (
            <Badge key={region} variant="outline" className="gap-1">
              <MapPin className="h-3 w-3" />
              {region}
            </Badge>
          ))}
          <Badge variant="outline">Capacity tier: {displayId(recommendation.capacityTier)}</Badge>
          <Badge variant="secondary">{displayId(recommendation.industry)}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Recommended agents</span>
            </div>
            <p className="text-lg font-semibold">{agents.length}</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Planning KPI targets</span>
            </div>
            <p className="text-lg font-semibold">{kpiTargetCount}</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <PlayCircle className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Recommended scenarios</span>
            </div>
            <p className="text-lg font-semibold">{scenarios.length}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
              Overview
            </TabsTrigger>
            <TabsTrigger value="agents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
              Recommended Agents
            </TabsTrigger>
            <TabsTrigger value="kpis" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
              Target KPIs
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
              Scenarios
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview" className="m-0">
              <Card>
                <CardHeader><CardTitle>{t('blueprintPreview.recommendationOverview')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">{t('blueprintPreview.industry')}</h4>
                    <p className="text-muted-foreground">{displayId(recommendation.industry)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">{t('blueprintPreview.archetype')}</h4>
                    <p className="text-muted-foreground">{displayId(recommendation.archetypeId)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Capacity tier</h4>
                    <p className="text-muted-foreground">{displayId(recommendation.capacityTier)}</p>
                  </div>
                  {recommendation.objectives.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">{t('blueprintPreview.objectives')}</h4>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        {recommendation.objectives.map((objective) => <li key={objective}>{objective}</li>)}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agents" className="m-0">
              <Card>
                <CardHeader><CardTitle>{t('blueprintPreview.recommendedSubsystemAgents')}</CardTitle></CardHeader>
                <CardContent>
                  {agents.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {agents.map((agentId) => (
                        <Card key={agentId} className="p-4">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-primary" />
                            <span className="font-medium">{displayId(agentId)}</span>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">Recommendation ID: {agentId}</p>
                        </Card>
                      ))}
                    </div>
                  ) : <p className="text-muted-foreground">No agents were included in this recommendation.</p>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="kpis" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>{t('blueprintPreview.targetKpis')}</CardTitle>
                  <p className="text-sm text-muted-foreground">Planning targets from the recommendation, not measured KPI values.</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="p-4"><span className="font-medium">{t('blueprintPreview.pueTarget')}</span><p className="text-2xl font-bold">{recommendation.kpiTargets.pueTarget}</p></Card>
                    <Card className="p-4"><span className="font-medium">{t('blueprintPreview.renewableShare')}</span><p className="text-2xl font-bold">{recommendation.kpiTargets.renewableShareTargetPct}%</p></Card>
                    <Card className="p-4"><span className="font-medium">{t('blueprintPreview.sovereigntyScore')}</span><p className="text-2xl font-bold">{recommendation.kpiTargets.sovereigntyScoreTargetPct}%</p></Card>
                    <Card className="p-4"><span className="font-medium">{t('blueprintPreview.carbonIntensity')}</span><p className="text-2xl font-bold">{recommendation.kpiTargets.carbonIntensityTargetGPerKwh} g/kWh</p></Card>
                    <Card className="p-4"><span className="font-medium">{t('blueprintPreview.uptimeTarget')}</span><p className="text-2xl font-bold">{recommendation.kpiTargets.uptimeTargetPct}%</p></Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scenarios" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Recommended scenario IDs</CardTitle>
                  <p className="text-sm text-muted-foreground">These IDs are recommendation inputs only. Runtime availability is validated separately.</p>
                </CardHeader>
                <CardContent>
                  {scenarios.length ? (
                    <div className="flex flex-wrap gap-2">
                      {scenarios.map((scenarioId) => <Badge key={scenarioId} variant="outline">{displayId(scenarioId)}</Badge>)}
                    </div>
                  ) : <p className="text-muted-foreground">No scenarios were included in this recommendation.</p>}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
