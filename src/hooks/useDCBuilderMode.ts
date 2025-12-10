/**
 * Hook to detect and manage DC Twin Builder mode
 * Returns whether we're in DC Twin mode and provides the appropriate store actions
 */

import { useSearchParams } from 'react-router-dom';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';

export function useDCBuilderMode() {
  const [searchParams] = useSearchParams();
  const fromScanner = searchParams.get('fromScanner') === 'true';
  
  // Get stores
  const wizardStore = useWizardBuilderStore();
  const dcStore = useDCTwinBuilderStore();
  
  // Determine which store to use
  const isDCMode = fromScanner || (dcStore.sessionId && dcStore.overview.twinName);
  
  return {
    isDCMode,
    fromScanner,
    
    // Step navigation
    currentStep: isDCMode ? dcStore.currentStep : wizardStore.currentStep,
    setCurrentStep: isDCMode ? dcStore.setCurrentStep : wizardStore.setCurrentStep,
    markStepComplete: isDCMode ? dcStore.markStepComplete : wizardStore.markStepComplete,
    completedSteps: isDCMode ? dcStore.completedSteps : wizardStore.completedSteps,
    
    // Loading state
    isLoading: isDCMode ? dcStore.isLoading : wizardStore.isLoading,
    
    // Get overview data
    getOverview: () => {
      if (isDCMode) {
        return {
          name: dcStore.overview.twinName,
          description: dcStore.overview.description || dcStore.overview.twinSummary,
          industry: dcStore.overview.industries[0] || 'Data Centre',
          department: 'Infrastructure',
          type: 'agent' as const,
          goals: dcStore.overview.keyCapabilities,
          expectedRoi: dcStore.overview.displayRoi,
          timeSaved: dcStore.overview.displayTimeSaved,
        };
      }
      return {
        name: wizardStore.template || 'AI System',
        description: wizardStore.goal,
        industry: wizardStore.industry,
        department: wizardStore.department,
        type: wizardStore.type,
        goals: [],
        expectedRoi: '35-50%',
        timeSaved: '20+ hrs/week',
      };
    },
    
    // Stores for direct access when needed
    wizardStore,
    dcStore,
  };
}
