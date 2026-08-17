/**
 * Data Centre Digital Twin Page
 * Entry point for the Data Centre Twin Dashboard
 * Supports both operational view and builder preview tabs
 * ENHANCED: Added 3D Twin Visualization header
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataCentreDashboard } from '@/components/data-centre-twin';
import { 
  DCOverviewTab, 
  DCBlueprintTab, 
  DCPreviewTab, 
  DCDeployTab 
} from '@/components/dc-twin/tabs';
import { montrealSovereignDC, sovereignQCFacility } from '@/twins/dataCenter/mockData';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { TwinOverlayProvider } from '@/context/TwinOverlayContext';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { EmptyStateSelectTwin } from '@/components/twin-selector';
import { Eye, FileText, MessageSquare, Rocket, LayoutDashboard, Activity } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';
import { OVERVIEW } from '@/ux';
import { TwinVisualizationLayout } from '@/components/twin-visualization/TwinVisualizationLayout';

// UI Polish Components
import { LoadingState, NoTwinSelectedEmptyState } from '@/components/ui/empty-state';
import { ModeBadge, SnapshotBadge } from '@/components/ui/snapshot-indicator';

export default function DataCentreTwin() {
  const { t } = useTranslation();
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
  
  // Check for demo/sandbox mode - enabled when:
  // 1. Explicitly requested via ?demo=true
  // 2. No twin available and navigating to simulation/dashboard views
  const isDemoMode = searchParams.get('demo') === 'true' || 
    (!twin && !hasBuilderSession && twins.length === 0 && isInitialized);
  
  const defaultTab = hasBuilderSession ? 'overview' : 'dashboard';
  // When view=simulation is specified in demo mode, we stay on 'dashboard' tab 
  // but pass initialTab='simulation' to DataCentreDashboard for its internal tabs
  // When not in demo mode and view param is set, use it directly
  const effectiveTab = (isDemoMode && urlTab === 'simulation') ? 'dashboard' : (urlTab || defaultTab);
  const [activeTab, setActiveTab] = useState(effectiveTab);
  
  // An explicit identifier that resolves to nothing must fail closed rather
  // than quietly rendering the default twin.
  const requestedUnknownTwin =
    !!id &&
    id !== 'default' &&
    isInitialized &&
    !isLoading &&
    !isDemoMode &&
    twins.length > 0 &&
    !twins.some((candidate) => candidate.id === id);

  // Set twin from URL param if provided
  useEffect(() => {
    if (id && id !== 'default' && id !== activeTwinId && !requestedUnknownTwin) {
      setActiveTwin(id);
    }
  }, [id, activeTwinId, setActiveTwin, requestedUnknownTwin]);
  
  // Auto-select first twin if none selected and twins are available (skip in demo mode)
  useEffect(() => {
    if (isInitialized && !isDemoMode && !activeTwinId && !twin && twins.length > 0) {
      console.log('[DataCentreTwin] Auto-selecting first twin:', twins[0].id);
      setActiveTwin(twins[0].id);
    }
  }, [isInitialized, isDemoMode, activeTwinId, twin, twins, setActiveTwin]);
  
  useEffect(() => {
    // Set page title based on mode
    if (isDemoMode) {
      document.title = 'Data Centre Twin | Demo Mode';
    } else if (twin) {
      document.title = `Data Centre Twin | ${twin.name}`;
    } else if (hasBuilderSession) {
      document.title = `Data Centre Twin | ${dcBuilderStore.overview.twinName}`;
    }
    
    // Use mock facility data enhanced with current twin info
    if (twin) {
      const enhancedFacility: DataCentreFacility = {
        ...montrealSovereignDC,
        id: twin?.id || montrealSovereignDC.id,
        name: twin?.name || montrealSovereignDC.name,
        location: twin?.city 
          ? { ...montrealSovereignDC.location, city: twin.city }
          : montrealSovereignDC.location,
      };
      setFacility(enhancedFacility);
    }
  }, [twin, isDemoMode, hasBuilderSession, dcBuilderStore.overview.twinName]);
  
  // Loading state - skip in demo mode
  if (!isDemoMode && (isLoading || !isInitialized)) {
    return <LoadingState message={t('dataCentreTwin.loadingTwinData')} />;
  }
  
  // Still loading if we're about to auto-select a twin
  if (!isDemoMode && !activeTwinId && !twin && twins.length > 0) {
    return <LoadingState message="Selecting Data Centre Twin..." />;
  }

  // Fail closed on an unknown identifier. Silently falling back to the default
  // twin made the page claim to show a facility the address did not name.
  if (requestedUnknownTwin) {
    return (
      <div className="container mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-lg font-semibold text-foreground">Data centre twin not found</h1>
        <p className="text-sm text-muted-foreground">
          No twin matches the identifier <span className="font-mono">{id}</span> in this account.
          It may have been deleted, or the address may be incorrect.
        </p>
        <Button asChild variant="outline">
          <Link to="/manage/facilities">Back to facilities</Link>
        </Button>
      </div>
    );
  }

  // DEMO MODE: Show simulation with mock data
  if (isDemoMode || hasBuilderSession) {
    return (
      <TwinOverlayProvider twinId={isDemoMode ? 'demo' : dcBuilderStore.sessionId || 'draft'}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6 px-4 space-y-6">
          {/* Demo/Session Header - Hidden for cleaner UI */}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="h-auto flex-wrap gap-1">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              {!isDemoMode && (
                <>
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
                  <TabsTrigger value="deploy" className="gap-2">
                    <Rocket className="h-4 w-4" />
                    Deploy
                  </TabsTrigger>
                </>
              )}
            </TabsList>
            
            
            <TabsContent value="dashboard">
              <DataCentreDashboard 
                facility={montrealSovereignDC} 
                initialTab={urlTab === 'simulation' ? 'simulation' : undefined}
                onScenarioSelect={(scenarioId) => {
                  console.log('Scenario selected:', scenarioId);
                }}
              />
            </TabsContent>
            
            {!isDemoMode && (
              <>
                <TabsContent value="overview">
                  <DCOverviewTab />
                </TabsContent>
                
                <TabsContent value="design">
                  <DCBlueprintTab />
                </TabsContent>
                
                <TabsContent value="preview">
                  <DCPreviewTab />
                </TabsContent>
                
                <TabsContent value="deploy">
                  <DCDeployTab />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </div>
      </TwinOverlayProvider>
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
    <TwinOverlayProvider twinId={activeTwinId || twin?.id || 'default'}>
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Operational Mode Header - Hidden for cleaner UI */}
        
        {/* 3D Twin Visualization Header */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Facility Model (Simulated)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TwinVisualizationLayout mode="dashboard" />
          </CardContent>
        </Card>
        
        <DataCentreDashboard 
          facility={facility} 
          initialTab={urlTab === 'simulation' ? 'simulation' : undefined}
          onScenarioSelect={(scenarioId) => {
            console.log('Scenario selected:', scenarioId);
          }}
        />
      </div>
    </div>
    </TwinOverlayProvider>
  );
}
