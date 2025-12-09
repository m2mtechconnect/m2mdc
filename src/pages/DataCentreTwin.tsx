/**
 * Data Centre Digital Twin Page
 * Entry point for the Data Centre Twin NOC Dashboard
 * Enterprise-grade DCIM interface
 */

import { useEffect, useState } from 'react';
import { DataCentreDashboard } from '@/components/data-centre-twin';
import { sovereignQCFacility } from '@/twins/dataCenter/mockData';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

export default function DataCentreTwin() {
  const [facility, setFacility] = useState<DataCentreFacility | null>(null);
  
  useEffect(() => {
    // Set document title
    document.title = 'Data Centre Twin | Sovereign AI Facility';
    
    // Load demo facility data
    setFacility(sovereignQCFacility);
  }, []);
  
  if (!facility) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-dc-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-dc-primary/20 border-t-dc-primary"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-dc-primary/30 animate-pulse"></div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-mono animate-pulse">
            Initializing Data Centre Twin...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-dc-background">
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
