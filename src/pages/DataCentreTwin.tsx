/**
 * Data Centre Digital Twin Page
 * Entry point for the Data Centre Twin Dashboard
 * Uses Studio design system (light theme)
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DataCentreDashboard } from '@/components/data-centre-twin';
import { sovereignQCFacility } from '@/twins/dataCenter/mockData';
import { useTwinContext } from '@/contexts/TwinContext';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

export default function DataCentreTwin() {
  const { id } = useParams<{ id?: string }>();
  const { twin, setTwinId, isLoading: twinLoading } = useTwinContext();
  const [facility, setFacility] = useState<DataCentreFacility | null>(null);
  
  // Set twin from URL param if provided
  useEffect(() => {
    if (id) {
      setTwinId(id);
    }
  }, [id, setTwinId]);
  
  useEffect(() => {
    // Update page title with current twin name
    const twinName = twin?.name || 'Sovereign AI Facility';
    document.title = `Data Centre Twin | ${twinName}`;
    
    // Use mock facility data enhanced with current twin info
    const enhancedFacility: DataCentreFacility = {
      ...sovereignQCFacility,
      id: twin?.id || sovereignQCFacility.id,
      name: twin?.name || sovereignQCFacility.name,
      location: twin?.city 
        ? { ...sovereignQCFacility.location, city: twin.city }
        : sovereignQCFacility.location,
    };
    setFacility(enhancedFacility);
  }, [twin]);
  
  if (!facility || twinLoading) {
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
            {twinLoading ? 'Loading Twin Data...' : 'Initializing Data Centre Twin...'}
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
