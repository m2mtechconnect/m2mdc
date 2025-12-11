/**
 * Blueprint Designer Wrapper
 * Wraps Blueprint page with Designer mode context
 * Ensures no simulation components are shown
 */

import { ReactNode } from 'react';
import { BlueprintViewProvider } from '@/context/BlueprintViewContext';

interface BlueprintDesignerWrapperProps {
  children: ReactNode;
}

/**
 * Wrap Blueprint page content with Designer mode
 * This ensures:
 * - All editing is enabled
 * - Validation warnings are shown
 * - Readiness scores are shown
 * - NO live telemetry, time-series, or heatmaps
 */
export function BlueprintDesignerWrapper({ children }: BlueprintDesignerWrapperProps) {
  return (
    <BlueprintViewProvider mode="designer">
      {children}
    </BlueprintViewProvider>
  );
}
