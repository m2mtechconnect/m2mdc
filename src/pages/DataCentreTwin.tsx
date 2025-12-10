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
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20 border-t-primary"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-primary/30 animate-pulse"></div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-mono animate-pulse">
            Loading Twin Data...
          </p>
        </div>
      </div>
    );
  }
  
  // If we have a builder session, show builder tabs even without a saved twin
  if (hasBuilderSession) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6 px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="h-auto flex-wrap gap-1">
              <TabsTrigger value="overview" className="gap-2">
                <Eye className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="blueprint" className="gap-2">
                <FileText className="h-4 w-4" />
                Blueprint
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
            
            <TabsContent value="blueprint">
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
        title="Select a Data Centre"
        description="Choose a data centre from the header dropdown to view the digital twin dashboard, simulations, and blueprints."
      />
    );
  }
  
  // Facility not yet loaded
  if (!facility) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20 border-t-primary"></div>
          </div>
          <p className="text-sm text-muted-foreground font-mono animate-pulse">
            Initializing Data Centre Twin...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
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
