import { useTranslation } from "react-i18next";
/**
 * Simulation Preview Page - READ-ONLY recommendation preview.
 *
 * Truth contract:
 * - scenario IDs come from the recommendation payload;
 * - registry metadata is shown only when the ID resolves to a committed scenario;
 * - KPI values are planning targets, never simulation results or live telemetry;
 * - this page does not create a twin or run a simulation.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Eye, PlayCircle, AlertCircle, Plus, Activity } from 'lucide-react';
import { useRecommendationStore } from '@/stores/recommendationStore';
import { ModeBadge, SnapshotBadge } from '@/components/ui/snapshot-indicator';
import { LoadingState } from '@/components/ui/empty-state';
import { PRESET_SCENARIOS } from '@/simulation/scenarioRegistry';

function displayId(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function severityClass(severity: string | undefined): string {
  switch (severity) {
    case 'critical':
    case 'emergency':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'high':
    case 'warning':
      return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function SimulationPreview() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { recommendation, isPreviewMode } = useRecommendationStore();

  const locationState = location.state as { mode?: string } | undefined;
  const isPreview = locationState?.mode === 'preview' || isPreviewMode;

  if (!recommendation && !isPreview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md p-6 text-center" role="status" aria-live="polite">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-lg font-semibold mb-2">No Recommendation to Preview</h1>
          <p className="text-muted-foreground mb-4">
            Generate a recommendation first, then inspect its proposed simulation scenarios.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (!recommendation) {
    return <LoadingState message="Loading recommendation..." />;
  }

  const twinName = recommendation.companyName
    ? `${recommendation.companyName} Data Centre Twin Recommendation`
    : 'Data Centre Twin Recommendation';
  const scenarioIds = recommendation.scenarios ?? [];
  const registry = new Map(PRESET_SCENARIOS.map((scenario) => [scenario.id, scenario]));

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
          <h1 className="text-2xl font-semibold mb-2 flex items-center gap-3">
            <PlayCircle className="h-6 w-6 text-primary" aria-hidden="true" />
            Simulation Recommendation Preview
          </h1>
          <p className="text-muted-foreground">Proposed scenario configuration for {twinName}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={() => navigate('/dashboard')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Twin to Configure Simulations
          </Button>
        </div>

        <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-700">{t('simulationPreview.previewMode')}</h4>
                <p className="text-sm text-amber-600">
                  No simulation is running on this page. Scenario IDs and KPI targets come from the recommendation. Runtime availability, calibration, persistence and telemetry are validated only after a twin is created and configured.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Recommended Scenario Templates
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Registry metadata is displayed only for recommendation IDs that resolve to committed scenario definitions.
            </p>
          </CardHeader>
          <CardContent>
            {scenarioIds.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scenarioIds.map((scenarioId) => {
                  const scenario = registry.get(scenarioId);
                  return (
                    <Card key={scenarioId} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <span className="font-medium">{scenario?.name ?? displayId(scenarioId)}</span>
                          <p className="text-xs text-muted-foreground mt-1">Recommendation ID: {scenarioId}</p>
                        </div>
                        {scenario ? (
                          <Badge variant="outline" className={severityClass(scenario.severity)}>{scenario.severity}</Badge>
                        ) : (
                          <Badge variant="outline">Registry metadata unavailable</Badge>
                        )}
                      </div>
                      {scenario ? (
                        <>
                          <p className="text-sm text-muted-foreground mb-3">{scenario.description}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{scenario.durationSeconds}s definition</Badge>
                            {scenario.domainsInvolved.map((domain) => <Badge key={domain} variant="outline">{displayId(domain)}</Badge>)}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          The recommendation contains this scenario ID, but this preview cannot prove a matching runtime scenario definition.
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">No simulation scenarios were included in this recommendation.</p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recommendation KPI Targets
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Planning targets from the recommendation. They are not measured baselines, simulated outcomes, SLA attestations or live KPI values.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-3 rounded-lg border bg-card"><span className="text-xs text-muted-foreground">PUE target</span><p className="text-lg font-semibold">{recommendation.kpiTargets.pueTarget}</p></div>
              <div className="p-3 rounded-lg border bg-card"><span className="text-xs text-muted-foreground">Renewable share target</span><p className="text-lg font-semibold">{recommendation.kpiTargets.renewableShareTargetPct}%</p></div>
              <div className="p-3 rounded-lg border bg-card"><span className="text-xs text-muted-foreground">Sovereignty target</span><p className="text-lg font-semibold">{recommendation.kpiTargets.sovereigntyScoreTargetPct}%</p></div>
              <div className="p-3 rounded-lg border bg-card"><span className="text-xs text-muted-foreground">Carbon intensity target</span><p className="text-lg font-semibold">{recommendation.kpiTargets.carbonIntensityTargetGPerKwh} g/kWh</p></div>
              <div className="p-3 rounded-lg border bg-card"><span className="text-xs text-muted-foreground">Uptime target</span><p className="text-lg font-semibold">{recommendation.kpiTargets.uptimeTargetPct}%</p></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
