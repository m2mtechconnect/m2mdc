/**
 * Data Centre Digital Twin Page
 * Entry point for the Data Centre Twin Dashboard
 * Supports both operational view and builder preview tabs
 * ENHANCED: Added 3D Twin Visualization header
 */

import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataCentreDashboard } from '@/components/data-centre-twin';
import { 
  DCOverviewTab, 
  DCBlueprintTab, 
  DCPreviewTab, 
  DCSimulationTab, 
  DCDeployTab 
} from '@/components/dc-twin/tabs';
import { sovereignQCFacility } from '@/twins/dataCenter/mockData';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { EmptyStateSelectTwin } from '@/components/twin-selector';
import { Eye, FileText, MessageSquare, PlayCircle, Rocket, LayoutDashboard, Activity } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';
import { OVERVIEW, SIMULATION, EMPTY_STATES } from '@/ux';

// UI Polish Components
import { LoadingState, NoTwinSelectedEmptyState } from '@/components/ui/empty-state';
import { ModeBadge, SnapshotBadge } from '@/components/ui/snapshot-indicator';

// Lazy load 3D visualization for performance
const TwinVisualizationLayout = lazy(() => 
  import('@/components/twin-visualization').then(m => ({ default: m.TwinVisualizationLayout }))
);

function VisualizationSkeleton() {
  return (
    <div className="h-64 bg-muted rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading 3D Twin...</p>
      </div>
    </div>
  );
}

export default function DataCentreTwin() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { twin, activeTwinId, setActiveTwin, isLoading, twins, isInitialized } = useActiveTwin();
  const [facility, setFacility] = useState<DataCentreFacility | null>(null);
  
  // Check if we have an active builder session
  // CRITICAL: Only use builder session when there's NO active twin from header dropdown
  const dcBuilderStore = useDCTwinBuilderStore();
  const hasBuilderSession = !twin && dcBuilderStore.sessionId && dcBuilderStore.overview.twinName;
  
  // Get tab from URL - support both 'tab' and 'view' params
  const urlTab = searchParams.get('tab') || searchParams.get('view');
  const defaultTab = hasBuilderSession ? 'overview' : 'dashboard';
  const [activeTab, setActiveTab] = useState(urlTab || defaultTab);
  
  // Set twin from URL param if provided
  useEffect(() => {
    if (id && id !== activeTwinId) {
      setActiveTwin(id);
    }
  }, [id, activeTwinId, setActiveTwin]);
  
  // Auto-select first twin if none selected and twins are available
  useEffect(() => {
    if (isInitialized && !activeTwinId && !twin && twins.length > 0) {
      console.log('[DataCentreTwin] Auto-selecting first twin:', twins[0].id);
      setActiveTwin(twins[0].id);
    }
  }, [isInitialized, activeTwinId, twin, twins, setActiveTwin]);
  
  useEffect(() => {
    // CRITICAL: Always prioritize real twin over builder session
    // Builder session is only for preview/sandbox mode
    if (!twin && !hasBuilderSession) return;
    
    // Update page title - ALWAYS use twin.name if available
    const twinName = twin?.name || (hasBuilderSession ? dcBuilderStore.overview.twinName : 'Sovereign AI Facility');
    document.title = `Data Centre Twin | ${twinName}`;
    
    // Use mock facility data enhanced with current twin info
    if (twin) {
      const enhancedFacility: DataCentreFacility = {
        ...sovereignQCFacility,
        id: twin?.id || sovereignQCFacility.id,
        name: twin?.name || sovereignQCFacility.name,
        location: twin?.city 
          ? { ...sovereignQCFacility.location, city: twin.city }
          : sovereignQCFacility.location,
      };
      setFacility(enhancedFacility);
    }
  }, [twin, hasBuilderSession, dcBuilderStore.overview.twinName]);
  
  // Loading state - also show loading while auto-selecting twin
  if (isLoading || (!isInitialized && twins.length === 0)) {
    return <LoadingState message="Loading Twin Data..." />;
  }
  
  // Still loading if we're about to auto-select a twin
  if (!activeTwinId && !twin && twins.length > 0) {
    return <LoadingState message="Selecting Data Centre Twin..." />;
  }
  
  // If we have a builder session, show builder tabs even without a saved twin
  if (hasBuilderSession) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6 px-4 space-y-6">
          {/* Builder Session Header */}
          <div className="flex items-center gap-2">
            <ModeBadge mode="designer" />
            <SnapshotBadge version="Draft" />
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="h-auto flex-wrap gap-1">
              <TabsTrigger value="overview" className="gap-2">
                <Eye className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="design" className="gap-2">
                <FileText className="h-4 w-4" />
                Design
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="simulation" className="gap-2">
                <PlayCircle className="h-4 w-4" />
                Simulation
              </TabsTrigger>
              <TabsTrigger value="deploy" className="gap-2">
                <Rocket className="h-4 w-4" />
                Deploy
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <DCOverviewTab />
            </TabsContent>
            
            <TabsContent value="design">
              <DCBlueprintTab />
            </TabsContent>
            
            <TabsContent value="preview">
              <DCPreviewTab />
            </TabsContent>
            
            <TabsContent value="simulation">
              <DCSimulationTab />
            </TabsContent>
            
            <TabsContent value="deploy">
              <DCDeployTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  
  // No twin selected and no builder session - show empty state
  if (!activeTwinId || !twin) {
    return (
      <EmptyStateSelectTwin 
        title={OVERVIEW.EMPTY_STATE.NO_TWIN.split('.')[0]}
        description={OVERVIEW.EMPTY_STATE.NO_TWIN}
      />
    );
  }
  
  // Facility not yet loaded
  if (!facility) {
    return <LoadingState message="Initializing Data Centre Twin..." />;
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Operational Mode Header */}
        <div className="flex items-center gap-2">
          <ModeBadge mode="snapshot" />
          <SnapshotBadge version="Live" />
        </div>
        
        {/* 3D Twin Visualization Header */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Live Digital Twin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<VisualizationSkeleton />}>
              <TwinVisualizationLayout mode="dashboard" />
            </Suspense>
          </CardContent>
        </Card>
        
        <DataCentreDashboard 
          facility={facility} 
          onScenarioSelect={(scenarioId) => {
            console.log('Scenario selected:', scenarioId);
          }}
        />
      </div>
    </div>
  );
}
