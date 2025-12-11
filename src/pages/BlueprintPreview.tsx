/**
 * Blueprint Preview Page - READ-ONLY preview of recommendation blueprint
 * This page displays a recommendation's blueprint WITHOUT creating a twin
 * Does NOT modify selectedTwinId or create any database records
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Eye,
  Bot, 
  Database, 
  Activity, 
  GitBranch, 
  Users, 
  PlayCircle,
  MapPin,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useState } from 'react';
import { useRecommendationStore } from '@/stores/recommendationStore';
import { ModeBadge, SnapshotBadge } from '@/components/ui/snapshot-indicator';
import { LoadingState } from '@/components/ui/empty-state';

// Industry-based default agents for preview
const getDefaultAgentsForIndustry = (industry: string) => {
  const baseAgents = [
    { id: 'thermal-guardian', name: 'Thermal Guardian', domain: 'thermal', status: 'recommended' },
    { id: 'power-monitor', name: 'Power & UPS Monitor', domain: 'power', status: 'recommended' },
    { id: 'cooling-optimizer', name: 'Cooling Optimizer', domain: 'cooling', status: 'recommended' },
    { id: 'sovereignty-sentinel', name: 'Sovereignty Sentinel', domain: 'sovereignty', status: 'recommended' },
    { id: 'carbon-tracker', name: 'Carbon & Financial Tracker', domain: 'financial', status: 'recommended' },
  ];
  
  // Add industry-specific agents
  if (industry === 'retail' || industry === 'retail_hyperscale') {
    baseAgents.push(
      { id: 'cold-chain-optimizer', name: 'Cold Chain Optimizer', domain: 'cooling', status: 'recommended' },
      { id: 'edge-resilience', name: 'Edge Resilience Agent', domain: 'network', status: 'recommended' }
    );
  }
  
  return baseAgents;
};

export default function BlueprintPreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { recommendation, sourceUrl, isPreviewMode } = useRecommendationStore();
  const [activeTab, setActiveTab] = useState('overview');
  
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
            Scan a website URL first to generate a recommendation, then preview the blueprint.
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
  
  const agents = getDefaultAgentsForIndustry(recommendation.industry);
  
  // Derive display values from recommendation
  const twinName = recommendation.companyName 
    ? `${recommendation.companyName} Sovereign Green AI Data Centre Twin`
    : 'Recommended Data Centre Twin';
  const regionDisplay = recommendation.regions?.[0] || 'Canada';
  const tierDisplay = recommendation.capacityTier === 'hyperscale' ? 'Tier IV' : 
                      recommendation.capacityTier === 'large' ? 'Tier III+' : 'Tier III';
  const capacityDisplay = recommendation.capacityTier === 'hyperscale' ? '20+ MW' :
                          recommendation.capacityTier === 'large' ? '10-20 MW' :
                          recommendation.capacityTier === 'medium' ? '5-10 MW' : '1-5 MW';
  
  const handleCreateTwin = () => {
    // Navigate to dashboard where user can click "Create Twin" CTA
    navigate('/dashboard');
  };
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* PREVIEW MODE HEADER - Clear visual distinction */}
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
          <h1 className="text-2xl font-semibold mb-2">
            {twinName}
          </h1>
          <p className="text-muted-foreground">
            Blueprint preview generated from {sourceUrl || 'scanned website'}
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
              Create Data Centre Twin
            </Button>
          </div>
        </div>
        
        {/* Blueprint Info Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Badge variant="outline" className="gap-1">
            <MapPin className="h-3 w-3" />
            {regionDisplay}
          </Badge>
          <Badge variant="outline">{tierDisplay}</Badge>
          <Badge variant="outline">{capacityDisplay}</Badge>
          <Badge variant="secondary">{recommendation.industry}</Badge>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Agents</span>
            </div>
            <p className="text-lg font-semibold">{agents.length}</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <Database className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Data Sources</span>
            </div>
            <p className="text-lg font-semibold">8</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">KPIs</span>
            </div>
            <p className="text-lg font-semibold">24</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Workflows</span>
            </div>
            <p className="text-lg font-semibold">12</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Roles</span>
            </div>
            <p className="text-lg font-semibold">4</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <PlayCircle className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Scenarios</span>
            </div>
            <p className="text-lg font-semibold">8</p>
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
              Recommended Agents
            </TabsTrigger>
            <TabsTrigger 
              value="kpis"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Target KPIs
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="overview" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Recommendation Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Industry</h4>
                    <p className="text-muted-foreground">{recommendation.industry}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Archetype</h4>
                    <p className="text-muted-foreground">{recommendation.archetypeId || 'Green Data Centre'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Region</h4>
                    <p className="text-muted-foreground">{regionDisplay}</p>
                  </div>
                  {recommendation.objectives && recommendation.objectives.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Objectives</h4>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        {recommendation.objectives.map((obj, idx) => (
                          <li key={idx}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="agents" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Subsystem Agents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map((agent) => (
                      <Card key={agent.id} className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="h-4 w-4 text-primary" />
                          <span className="font-medium">{agent.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{agent.domain}</Badge>
                          <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                            {agent.status}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="kpis" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Target KPIs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recommendation.kpiTargets && (
                      <>
                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="h-4 w-4 text-primary" />
                            <span className="font-medium">PUE Target</span>
                          </div>
                          <p className="text-2xl font-bold">{recommendation.kpiTargets.pueTarget}</p>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="h-4 w-4 text-primary" />
                            <span className="font-medium">Renewable Share</span>
                          </div>
                          <p className="text-2xl font-bold">{recommendation.kpiTargets.renewableShareTargetPct}%</p>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="h-4 w-4 text-primary" />
                            <span className="font-medium">Sovereignty Score</span>
                          </div>
                          <p className="text-2xl font-bold">{recommendation.kpiTargets.sovereigntyScoreTargetPct}%</p>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="h-4 w-4 text-primary" />
                            <span className="font-medium">Carbon Intensity</span>
                          </div>
                          <p className="text-2xl font-bold">{recommendation.kpiTargets.carbonIntensityTargetGPerKwh} g/kWh</p>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="h-4 w-4 text-primary" />
                            <span className="font-medium">Uptime Target</span>
                          </div>
                          <p className="text-2xl font-bold">{recommendation.kpiTargets.uptimeTargetPct}%</p>
                        </Card>
                      </>
                    )}
                    {!recommendation.kpiTargets && (
                      <p className="text-muted-foreground col-span-full">
                        KPI targets will be configured when you create this twin.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
