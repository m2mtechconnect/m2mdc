/**
 * Blueprint Designer Wrapper
 * Wraps Blueprint page with Designer mode context and Overlay context
 * Ensures no simulation components are shown
 */

import { ReactNode } from 'react';
import { BlueprintViewProvider } from '@/context/BlueprintViewContext';
import { TwinOverlayProvider } from '@/context/TwinOverlayContext';

interface BlueprintDesignerWrapperProps {
  children: ReactNode;
  twinId?: string;
}

/**
 * Wrap Blueprint page content with Designer mode
 * This ensures:
 * - All editing is enabled
 * - Validation warnings are shown
 * - Readiness scores are shown
 * - Overlay buttons work properly
 * - NO live telemetry, time-series, or heatmaps
 */
export function BlueprintDesignerWrapper({ children, twinId = 'default' }: BlueprintDesignerWrapperProps) {
  return (
    <TwinOverlayProvider twinId={twinId} defaultOverlay="thermal">
      <BlueprintViewProvider mode="designer">
        {children}
      </BlueprintViewProvider>
    </TwinOverlayProvider>
  );
}
