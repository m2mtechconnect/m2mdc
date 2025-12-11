/**
 * Data Centre Digital Twin Page
 * Entry point for the Data Centre Twin Dashboard
 * Supports both operational view and builder preview tabs
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Eye, FileText, MessageSquare, PlayCircle, Rocket, LayoutDashboard } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';
import { OVERVIEW, SIMULATION, EMPTY_STATES } from '@/ux';

// UI Polish Components
import { LoadingState, NoTwinSelectedEmptyState } from '@/components/ui/empty-state';
import { ModeBadge, SnapshotBadge } from '@/components/ui/snapshot-indicator';

export default function DataCentreTwin() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { twin, activeTwinId, setActiveTwin, isLoading } = useActiveTwin();
  const [facility, setFacility] = useState<DataCentreFacility | null>(null);
  
  // Check if we have an active builder session
  const dcBuilderStore = useDCTwinBuilderStore();
  const hasBuilderSession = dcBuilderStore.sessionId && dcBuilderStore.overview.twinName;
  
  // Get tab from URL or default
  const urlTab = searchParams.get('tab');
  const defaultTab = hasBuilderSession ? 'overview' : 'dashboard';
  const [activeTab, setActiveTab] = useState(urlTab || defaultTab);
  
  // Set twin from URL param if provided
  useEffect(() => {
    if (id && id !== activeTwinId) {
      setActiveTwin(id);
    }
  }, [id, activeTwinId, setActiveTwin]);
  
  useEffect(() => {
    if (!twin && !hasBuilderSession) return;
    
    // Update page title
    const twinName = hasBuilderSession 
      ? dcBuilderStore.overview.twinName 
      : (twin?.name || 'Sovereign AI Facility');
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
  
  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading Twin Data..." />;
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
