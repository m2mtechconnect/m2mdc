/**
 * Simulation Commands Hook
 * Provides simulation command handling for CoPilot and global search
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRESET_SCENARIOS } from '@/simulation/scenarioRegistry';

export interface SimulationCommand {
  pattern: RegExp;
  scenarioId?: string;
  action: 'run' | 'show' | 'list' | 'custom' | 'open';
  description: string;
}

const SIMULATION_COMMANDS: SimulationCommand[] = [
  // Direct scenario commands
  { pattern: /cooling\s*(failure|fail|breakdown)/i, scenarioId: 'cooling_failure_hot_aisle', action: 'run', description: 'Run cooling failure scenario' },
  { pattern: /gpu\s*spike/i, scenarioId: 'gpu_spike_training_job', action: 'run', description: 'Run GPU spike scenario' },
  { pattern: /ups\s*(failure|fail|battery)/i, scenarioId: 'ups_failure_runtime_drop', action: 'run', description: 'Run UPS failure scenario' },
  { pattern: /grid\s*(outage|drop|fail)/i, scenarioId: 'grid_outage_ups_generator_failover', action: 'run', description: 'Run grid outage scenario' },
  { pattern: /water\s*leak/i, scenarioId: 'water_leak_corridor_sensor', action: 'run', description: 'Run water leak scenario' },
  { pattern: /fire\s*suppression/i, scenarioId: 'fire_suppression_discharge', action: 'run', description: 'Run fire suppression scenario' },
  { pattern: /sovereignty|cross.?border|routing\s*violation/i, scenarioId: 'sovereignty_routing_violation', action: 'run', description: 'Run sovereignty violation scenario' },
  { pattern: /carbon\s*(price|shock|spike)/i, scenarioId: 'carbon_price_shock', action: 'run', description: 'Run carbon price shock scenario' },
  { pattern: /network\s*(congestion|slow|latency)/i, scenarioId: 'network_congestion_event', action: 'run', description: 'Run network congestion scenario' },
  { pattern: /thermal\s*(safety|incident|emergency)/i, scenarioId: 'thermal_safety_incident', action: 'run', description: 'Run thermal safety incident scenario' },
  
  // General commands
  { pattern: /simulate|run\s*simulation|start\s*simulation/i, action: 'open', description: 'Open simulation dashboard' },
  { pattern: /kpi\s*delta|show\s*kpi|what\s*happens/i, action: 'show', description: 'Show KPI deltas' },
  { pattern: /list\s*scenarios?|available\s*scenarios?/i, action: 'list', description: 'List available scenarios' },
  { pattern: /custom\s*scenario|create\s*scenario/i, action: 'custom', description: 'Open custom scenario builder' },
];

export function useSimulationCommands() {
  const navigate = useNavigate();
  
  const parseCommand = useCallback((query: string): {
    matched: boolean;
    command?: SimulationCommand;
    scenarioId?: string;
    navigateTo?: string;
  } => {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check if query matches any simulation pattern
    for (const cmd of SIMULATION_COMMANDS) {
      if (cmd.pattern.test(normalizedQuery)) {
        let navigateTo = '/data-centre-twin?view=simulation';
        
        if (cmd.scenarioId) {
          navigateTo += `&scenarioId=${cmd.scenarioId}`;
        }
        
        if (cmd.action === 'custom') {
          navigateTo += '&showBuilder=true';
        }
        
        return {
          matched: true,
          command: cmd,
          scenarioId: cmd.scenarioId,
          navigateTo,
        };
      }
    }
    
    return { matched: false };
  }, []);
  
  const executeCommand = useCallback((query: string): boolean => {
    const result = parseCommand(query);
    
    if (result.matched && result.navigateTo) {
      navigate(result.navigateTo);
      return true;
    }
    
    return false;
  }, [parseCommand, navigate]);
  
  const getScenarioSuggestions = useCallback((query: string): {
    id: string;
    name: string;
    description: string;
    navigateTo: string;
  }[] => {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Keywords that suggest user wants simulation
    const simulationKeywords = ['simulate', 'simulation', 'scenario', 'gpu', 'ups', 'cooling', 
      'failure', 'test', 'what if', 'impact', 'thermal', 'power', 'carbon', 'grid'];
    
    const hasSimKeyword = simulationKeywords.some(kw => normalizedQuery.includes(kw));
    
    if (!hasSimKeyword) return [];
    
    // Return matching scenarios
    return PRESET_SCENARIOS
      .filter(s => 
        s.name.toLowerCase().includes(normalizedQuery) ||
        s.description.toLowerCase().includes(normalizedQuery) ||
        s.tags?.some(t => normalizedQuery.includes(t.toLowerCase()))
      )
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        navigateTo: `/data-centre-twin?view=simulation&scenarioId=${s.id}`,
      }));
  }, []);
  
  return {
    parseCommand,
    executeCommand,
    getScenarioSuggestions,
    availableScenarios: PRESET_SCENARIOS,
  };
}
