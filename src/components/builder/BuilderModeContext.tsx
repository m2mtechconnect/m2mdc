/**
 * Builder Mode Context
 * Provides Quick Edit vs Architect Mode toggle across all builder steps
 */

import { createContext, useContext, useState, ReactNode } from 'react';

export type BuilderMode = 'quick' | 'architect';

interface BuilderModeContextValue {
  mode: BuilderMode;
  setMode: (mode: BuilderMode) => void;
  isQuickMode: boolean;
  isArchitectMode: boolean;
}

const BuilderModeContext = createContext<BuilderModeContextValue | null>(null);

export function BuilderModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<BuilderMode>('quick');

  return (
    <BuilderModeContext.Provider
      value={{
        mode,
        setMode,
        isQuickMode: mode === 'quick',
        isArchitectMode: mode === 'architect',
      }}
    >
      {children}
    </BuilderModeContext.Provider>
  );
}

export function useBuilderMode() {
  const context = useContext(BuilderModeContext);
  if (!context) {
    // Default to quick mode if not wrapped in provider
    return {
      mode: 'quick' as BuilderMode,
      setMode: () => {},
      isQuickMode: true,
      isArchitectMode: false,
    };
  }
  return context;
}
