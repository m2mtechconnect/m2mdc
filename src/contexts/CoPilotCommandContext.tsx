/**
 * CoPilot Command Context
 * 
 * Provides command execution handlers that allow CoPilot to trigger
 * real UI actions like running simulations, navigating tabs, etc.
 */

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';

export interface CoPilotCommands {
  runSimulation: (scenarioId?: string) => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  navigateToTab: (tabName: string) => void;
  openBuilderStep: (step: number) => void;
  highlightKPI: (kpiId: string) => void;
  toggleDomain: (domainName: string) => void;
}

interface CoPilotCommandContextValue {
  commands: CoPilotCommands;
  registerCommands: (cmds: Partial<CoPilotCommands>) => void;
  highlightedKPI: string | null;
  clearHighlight: () => void;
  executeCommand: (commandName: string, args?: any) => boolean;
}

const defaultCommands: CoPilotCommands = {
  runSimulation: () => console.log('[CoPilotCommand] runSimulation not registered'),
  pauseSimulation: () => console.log('[CoPilotCommand] pauseSimulation not registered'),
  resetSimulation: () => console.log('[CoPilotCommand] resetSimulation not registered'),
  navigateToTab: () => console.log('[CoPilotCommand] navigateToTab not registered'),
  openBuilderStep: () => console.log('[CoPilotCommand] openBuilderStep not registered'),
  highlightKPI: () => console.log('[CoPilotCommand] highlightKPI not registered'),
  toggleDomain: () => console.log('[CoPilotCommand] toggleDomain not registered'),
};

const CoPilotCommandContext = createContext<CoPilotCommandContextValue | undefined>(undefined);

/**
 * Commands that mutate simulation run state. Stage 7H: these are owned by the
 * Simulation workspace and must be unreachable from Blueprint surfaces, even
 * through an assistant action or a directly invoked callback.
 */
const SIMULATION_EXECUTION_COMMANDS = new Set(['runSimulation', 'pauseSimulation', 'resetSimulation']);

function isBlueprintSurface(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/blueprint');
}

export function CoPilotCommandProvider({ children }: { children: ReactNode }) {
  const [commands, setCommands] = useState<CoPilotCommands>(defaultCommands);
  const [highlightedKPI, setHighlightedKPI] = useState<string | null>(null);

  const registerCommands = useCallback((cmds: Partial<CoPilotCommands>) => {
    setCommands(prev => ({ ...prev, ...cmds }));
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightedKPI(null);
  }, []);

  // Execute a command by name with optional arguments
  const executeCommand = useCallback((commandName: string, args?: any): boolean => {
    console.log('[CoPilotCommand] executeCommand:', commandName, args);

    // Ownership boundary: Blueprint may hand a design to Simulation, never run it.
    if (SIMULATION_EXECUTION_COMMANDS.has(commandName) && isBlueprintSurface()) {
      console.warn('[CoPilotCommand] Blocked simulation execution from Blueprint:', commandName);
      return false;
    }

    switch (commandName) {
      case 'runSimulation':
        commands.runSimulation(args?.scenarioId);
        return true;
      case 'pauseSimulation':
        commands.pauseSimulation();
        return true;
      case 'resetSimulation':
        commands.resetSimulation();
        return true;
      case 'navigateToTab':
        commands.navigateToTab(args?.tabName || args);
        return true;
      case 'openBuilderStep':
        commands.openBuilderStep(args?.step || args);
        return true;
      case 'highlightKPI': {
        const kpiId = args?.kpiId || args;
        setHighlightedKPI(kpiId);
        commands.highlightKPI(kpiId);
        // Auto-clear after 5 seconds
        setTimeout(() => setHighlightedKPI(null), 5000);
        return true;
      }
      case 'toggleDomain':
        commands.toggleDomain(args?.domainName || args);
        return true;
      default:
        console.warn('[CoPilotCommand] Unknown command:', commandName);
        return false;
    }
  }, [commands]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<CoPilotCommandContextValue>(() => ({
    commands,
    registerCommands,
    highlightedKPI,
    clearHighlight,
    executeCommand,
  }), [commands, registerCommands, highlightedKPI, clearHighlight, executeCommand]);

  return (
    <CoPilotCommandContext.Provider value={contextValue}>
      {children}
    </CoPilotCommandContext.Provider>
  );
}

export function useCoPilotCommands() {
  const context = useContext(CoPilotCommandContext);
  if (!context) {
    throw new Error('useCoPilotCommands must be used within CoPilotCommandProvider');
  }
  return context;
}

// Helper hook for registering commands from components
// FIXED: Use useEffect instead of calling useCallback result directly in render
// registerCommands is stable (useCallback with empty deps), so we don't need it in our deps
export function useRegisterCoPilotCommands(cmds: Partial<CoPilotCommands>, deps: any[] = []) {
  const { registerCommands } = useCoPilotCommands();
  
  // Register on mount and when deps change - use useEffect, NOT calling during render
  // registerCommands is stable, no need to include in deps
  useEffect(() => {
    registerCommands(cmds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
