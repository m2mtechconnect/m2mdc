/**
 * Blueprint View Context - Designer vs Snapshot Mode
 * Single source of truth for blueprint view mode across all components
 */

import React, { createContext, useContext, ReactNode } from 'react';

export type BlueprintViewMode = 'designer' | 'snapshot';

interface BlueprintViewContextValue {
  mode: BlueprintViewMode;
  readOnly: boolean;
  // Snapshot-specific metadata (only present when mode === 'snapshot')
  snapshotMeta?: {
    simulationRunId: string;
    blueprintVersion: string;
    capturedAt: string;
  };
}

const BlueprintViewContext = createContext<BlueprintViewContextValue | undefined>(undefined);

interface BlueprintViewProviderProps {
  children: ReactNode;
  mode: BlueprintViewMode;
  snapshotMeta?: {
    simulationRunId: string;
    blueprintVersion: string;
    capturedAt: string;
  };
}

export function BlueprintViewProvider({ 
  children, 
  mode, 
  snapshotMeta 
}: BlueprintViewProviderProps) {
  const value: BlueprintViewContextValue = {
    mode,
    readOnly: mode === 'snapshot',
    snapshotMeta: mode === 'snapshot' ? snapshotMeta : undefined,
  };

  return (
    <BlueprintViewContext.Provider value={value}>
      {children}
    </BlueprintViewContext.Provider>
  );
}

export function useBlueprintView(): BlueprintViewContextValue {
  const context = useContext(BlueprintViewContext);
  
  // Default to designer mode if no provider
  if (context === undefined) {
    return {
      mode: 'designer',
      readOnly: false,
    };
  }
  
  return context;
}

/**
 * Hook for checking if current view is read-only
 * Convenience wrapper for common use case
 */
export function useBlueprintReadOnly(): boolean {
  const { readOnly } = useBlueprintView();
  return readOnly;
}
