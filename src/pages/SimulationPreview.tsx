import { useTranslation } from "react-i18next";
/**
 * Simulation Preview Page - READ-ONLY preview of recommendation simulation.
 * This page displays a recommendation's simulation config WITHOUT creating a twin.
 * Does NOT modify selectedTwinId or create any database records.
 *
 * Fidelity note: the scenario cards below are bundled preview fixtures. They
 * demonstrate the AURA workflow; they are not measured telemetry, calibrated
 * physics, or evidence that an NVIDIA DSX/Omniverse solver executed.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Eye,
  PlayCircle,
  AlertCircle,
  Plus,
  Thermometer,
  Zap,
  Globe,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { useRecommendationStore } from '@/stores/recommendationStore';
import { ModeBadge, SnapshotBadge } from '@/components/ui/snapshot-indicator';
import { LoadingState } from '@/components/ui/empty-state';
import { SIMULATION_PREVIEW_FIDELITY } from '@/simulation/fidelity';

// Bundled demonstration scenarios for preview only.
const previewScenarios = [
  {
    id: 'thermal-spike',
    name: 'GPU Cluster Thermal Spike',
    domain: 'thermal',
    severity: 'high',
    duration: '15 min',
    description: 'Demonstrates a scripted temperature-increase scenario in a GPU cluster zone',
  },
  {
    id: 'power-fluctuation',
    name: 'Grid Power Fluctuation',
    domain: 'power',
    severity: 'medium',
    duration: '5 min',
    description: 'Demonstrates a scripted UPS-response scenario for utility power instability',
  },
  {
    id: 'cooling-failure',
    name: 'CRAH Unit Failure',
    domain: 'cooling',
    severity: 'high',
    duration: '30 min',
    description: 'Demonstrates a scripted primary-cooling-unit failure scenario',
  },
  {
    id: 'sovereignty-violation',
    name: 'Cross-Border Data Attempt',
    domain: 'sovereignty',
    severity: 'critical',
    duration: '2 min',
    description: 'Demonstrates sovereignty guardrail behavior for a scripted routing event',
  },
];

export default function SimulationPreview() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { recommendation, sourceUrl, isPreviewMode } = useRecommendationStore();

  // Preserve the recommendation source in the read-only store contract even
  // though this page does not render or fetch it directly.
  void sourceUrl;

  const locationState = location.state as { mode?: string } | undefined;
  const isPreview = locationState?.mode === 'preview' || isPreviewMode;

  if (!recommendation && !isPreview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md p-6 text-center" role="status" aria-live="polite">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-lg font-semibold mb-2">No Recommendation to Preview</h1>
          <p className="text-muted-foreground mb-4">
            Scan a website URL first to generate a recommendation, then preview simulation scenarios.
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
    ? `${recommendation.companyName} Sovereign Green AI Data Centre Twin`
    : 'Recommended Data Centre Twin';

  const handleCreateTwin = () => {
    navigate('/dashboard');
  };

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'thermal': return Thermometer;
      case 'power': return Zap;
      case 'sovereignty': return Globe;
      default: return Activity;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'high': return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
      case 'medium': return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <ModeBadge mode="snapshot" />
          <SnapshotBadge version="Preview" />
          <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-700 border-amber-500/30">
            <Eye className="h-3 w-3" />
            Read-Only Preview
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            {SIMULATION_PREVIEW_FIDELITY.label}
          </Badge>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2 flex items-center gap-3">
            <PlayCircle className="h-6 w-6 text-primary" aria-hidden="true" />
            Simulation Preview
          </h1>
          <p className="text-muted-foreground">
            Preview bundled scenario models for {twinName}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleCreateTwin}>
              <Plus className="h-4 w-4 mr-2" />
              Create Twin to Run Simulations
            </Button>
          </div>
        </div>

        <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-700">{t('simulationPreview.previewMode')}</h4>
                <p className="text-sm text-amber-600">
                  These are bundled demonstration models. They are not measured live telemetry, are not
                  calibrated thermal/electrical/airflow physics, and do not execute NVIDIA DSX/Omniverse
                  solver code. Create a Data Centre Twin to run AURA scenario models against its baseline.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Available Demonstration Scenarios
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              These scripted scenario models demonstrate workflow behavior; they are not runs of record.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previewScenarios.map((scenario) => {
                const Icon = getDomainIcon(scenario.domain);
                return (
                  <Card key={scenario.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{scenario.name}</span>
                      </div>
                      <Badge variant="outline" className={getSeverityColor(scenario.severity)}>
                        {scenario.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {scenario.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{scenario.domain}</Badge>
                      <Badge variant="secondary">{scenario.duration}</Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('simulationPreview.expectedKpiImpacts')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Illustrative targets/benchmarks shown for preview context; these are not measured predictions.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">PUE</span>
                </div>
                <p className="text-lg font-semibold">~1.35</p>
                <p className="text-xs text-muted-foreground">{t('simulationPreview.targetBaseline')}</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Thermal Events</span>
                </div>
                <p className="text-lg font-semibold">0-5</p>
                <p className="text-xs text-muted-foreground">{t('simulationPreview.perScenario')}</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Sovereignty</span>
                </div>
                <p className="text-lg font-semibold">99%+</p>
                <p className="text-xs text-muted-foreground">{t('simulationPreview.complianceTarget')}</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Uptime</span>
                </div>
                <p className="text-lg font-semibold">99.99%</p>
                <p className="text-xs text-muted-foreground">{t('simulationPreview.slaTarget')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
