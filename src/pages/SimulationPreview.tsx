import { useTranslation } from "react-i18next";
/**
 * Simulation Preview Page - READ-ONLY preview of recommendation simulation
 * This page displays a recommendation's simulation config WITHOUT creating a twin
 * Does NOT modify selectedTwinId or create any database records
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
} from 'lucide-react';
import { useRecommendationStore } from '@/stores/recommendationStore';
import { ModeBadge, SnapshotBadge } from '@/components/ui/snapshot-indicator';
import { LoadingState } from '@/components/ui/empty-state';

// Sample scenarios for preview
const previewScenarios = [
  {
    id: 'thermal-spike',
    name: 'GPU Cluster Thermal Spike',
    domain: 'thermal',
    severity: 'high',
    duration: '15 min',
    description: 'Simulates sudden temperature increase in GPU cluster zone',
  },
  {
    id: 'power-fluctuation',
    name: 'Grid Power Fluctuation',
    domain: 'power',
    severity: 'medium',
    duration: '5 min',
    description: 'Tests UPS response to utility power instability',
  },
  {
    id: 'cooling-failure',
    name: 'CRAH Unit Failure',
    domain: 'cooling',
    severity: 'high',
    duration: '30 min',
    description: 'Simulates failure of primary cooling unit',
  },
  {
    id: 'sovereignty-violation',
    name: 'Cross-Border Data Attempt',
    domain: 'sovereignty',
    severity: 'critical',
    duration: '2 min',
    description: 'Tests sovereignty guardrails for data routing',
  },
];

export default function SimulationPreview() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { recommendation, sourceUrl, isPreviewMode } = useRecommendationStore();
  
  // Check if we're in preview mode via location state or store
  const locationState = location.state as { mode?: string } | undefined;
  const isPreview = locationState?.mode === 'preview' || isPreviewMode;
  
  // If no recommendation and not in preview mode, redirect
  if (!recommendation && !isPreview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md p-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Recommendation to Preview</h2>
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
  
  // Derive display values from recommendation
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
        {/* PREVIEW MODE HEADER */}
        <div className="flex items-center gap-3 mb-6">
          <ModeBadge mode="snapshot" />
          <SnapshotBadge version="Preview" />
          <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-700 border-amber-500/30">
            <Eye className="h-3 w-3" />
            Read-Only Preview
          </Badge>
        </div>
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2 flex items-center gap-3">
            <PlayCircle className="h-6 w-6 text-primary" />
            Simulation Preview
          </h1>
          <p className="text-muted-foreground">
            Preview simulation scenarios for {twinName}
          </p>
        </div>
        
        {/* Quick Actions Bar */}
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
        
        {/* Preview Notice */}
        <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-700">Preview Mode</h4>
                <p className="text-sm text-amber-600">
                  This is a preview of available simulation scenarios. To run simulations with real-time KPI tracking, 
                  create a Data Centre Twin first.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Available Scenarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Available Simulation Scenarios
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              These scenarios will be available when you create a twin from this recommendation
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
        
        {/* KPI Impact Preview */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Expected KPI Impacts</CardTitle>
            <p className="text-sm text-muted-foreground">
              Simulations will track these KPIs in real-time
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
                <p className="text-xs text-muted-foreground">Target baseline</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Thermal Events</span>
                </div>
                <p className="text-lg font-semibold">0-5</p>
                <p className="text-xs text-muted-foreground">Per scenario</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Sovereignty</span>
                </div>
                <p className="text-lg font-semibold">99%+</p>
                <p className="text-xs text-muted-foreground">Compliance target</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Uptime</span>
                </div>
                <p className="text-lg font-semibold">99.99%</p>
                <p className="text-xs text-muted-foreground">SLA target</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
