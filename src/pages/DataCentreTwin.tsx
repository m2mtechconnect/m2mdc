/**
 * Data Centre Digital Twin Page
 * Entry point for the Data Centre Twin dashboard
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      <DataCentreDashboard 
        facility={facility} 
        onScenarioSelect={(scenarioId) => {
          console.log('Scenario selected:', scenarioId);
        }}
      />
    </div>
  );
}
