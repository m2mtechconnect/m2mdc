/**
 * Simulation Integration Test Utilities
 * Provides testing helpers for verifying simulation flow
 */

import { SimulationEngine, getSimulationEngine, resetSimulationEngine } from '@/simulation/SimulationEngine';
import { PRESET_SCENARIOS } from '@/simulation/scenarioRegistry';
import type { SimulationStatus, SimulationEvent, KPISnapshot } from '@/simulation/types';

export interface SimulationTestResult {
  passed: boolean;
  testName: string;
  duration: number;
  details: string;
  errors: string[];
}

/**
 * Test: Engine initializes with baseline KPIs
 */
export function testEngineInitialization(): SimulationTestResult {
  const start = performance.now();
  const errors: string[] = [];
  
  try {
    resetSimulationEngine();
    const engine = getSimulationEngine({ pue: 1.3, gpuUtilization: 75 });
    const state = engine.getState();
    
    if (state.status !== 'idle') {
      errors.push(`Expected status 'idle', got '${state.status}'`);
    }
    if (state.currentTime !== 0) {
      errors.push(`Expected currentTime 0, got ${state.currentTime}`);
    }
    if (!state.baselineKpis.pue) {
      errors.push('Baseline KPI pue not set');
    }
  } catch (e) {
    errors.push(`Exception: ${(e as Error).message}`);
  }
  
  return {
    passed: errors.length === 0,
    testName: 'Engine Initialization',
    duration: performance.now() - start,
    details: 'Verifies engine starts in idle state with baseline KPIs',
    errors
  };
}

/**
 * Test: Scenario starts and emits events
 */
export function testScenarioStart(): SimulationTestResult {
  const start = performance.now();
  const errors: string[] = [];
  
  try {
    resetSimulationEngine();
    const engine = getSimulationEngine({ pue: 1.3 });
    const scenarios = PRESET_SCENARIOS;
    
    if (scenarios.length === 0) {
      errors.push('No preset scenarios available');
      return { passed: false, testName: 'Scenario Start', duration: performance.now() - start, details: '', errors };
    }
    
    const testScenario = scenarios[0];
    let eventReceived = false;
    
    engine.subscribe((event) => {
      if (event.type === 'scenario-start') {
        eventReceived = true;
      }
    });
    
    engine.startScenario(testScenario.id);
    const state = engine.getState();
    
    if (state.status !== 'running') {
      errors.push(`Expected status 'running', got '${state.status}'`);
    }
    if (state.activeScenarioId !== testScenario.id) {
      errors.push(`Expected activeScenarioId '${testScenario.id}', got '${state.activeScenarioId}'`);
    }
    if (!eventReceived) {
      errors.push('scenario-start event not emitted');
    }
    
    engine.reset();
  } catch (e) {
    errors.push(`Exception: ${(e as Error).message}`);
  }
  
  return {
    passed: errors.length === 0,
    testName: 'Scenario Start',
    duration: performance.now() - start,
    details: 'Verifies scenario starts and emits start event',
    errors
  };
}

/**
 * Test: Pause and resume work correctly
 */
export function testPauseResume(): SimulationTestResult {
  const start = performance.now();
  const errors: string[] = [];
  
  try {
    resetSimulationEngine();
    const engine = getSimulationEngine({ pue: 1.3 });
    const scenarios = PRESET_SCENARIOS;
    
    if (scenarios.length === 0) {
      errors.push('No preset scenarios available');
      return { passed: false, testName: 'Pause/Resume', duration: performance.now() - start, details: '', errors };
    }
    
    engine.startScenario(scenarios[0].id);
    
    engine.pause();
    if (engine.getState().status !== 'paused') {
      errors.push(`Expected status 'paused' after pause(), got '${engine.getState().status}'`);
    }
    
    engine.resume();
    if (engine.getState().status !== 'running') {
      errors.push(`Expected status 'running' after resume(), got '${engine.getState().status}'`);
    }
    
    engine.reset();
  } catch (e) {
    errors.push(`Exception: ${(e as Error).message}`);
  }
  
  return {
    passed: errors.length === 0,
    testName: 'Pause/Resume',
    duration: performance.now() - start,
    details: 'Verifies pause and resume toggle status correctly',
    errors
  };
}

/**
 * Test: Reset clears state
 */
export function testReset(): SimulationTestResult {
  const start = performance.now();
  const errors: string[] = [];
  
  try {
    resetSimulationEngine();
    const engine = getSimulationEngine({ pue: 1.3 });
    const scenarios = PRESET_SCENARIOS;
    
    if (scenarios.length > 0) {
      engine.startScenario(scenarios[0].id);
      engine.reset();
      
      const state = engine.getState();
      if (state.status !== 'idle') {
        errors.push(`Expected status 'idle' after reset, got '${state.status}'`);
      }
      if (state.activeScenarioId !== null) {
        errors.push(`Expected activeScenarioId null after reset, got '${state.activeScenarioId}'`);
      }
      if (state.events.length !== 0) {
        errors.push(`Expected events array empty after reset, got ${state.events.length} events`);
      }
    }
  } catch (e) {
    errors.push(`Exception: ${(e as Error).message}`);
  }
  
  return {
    passed: errors.length === 0,
    testName: 'Reset',
    duration: performance.now() - start,
    details: 'Verifies reset clears all simulation state',
    errors
  };
}

/**
 * Test: Twin switch protection
 */
export function testTwinSwitchProtection(): SimulationTestResult {
  const start = performance.now();
  const errors: string[] = [];
  
  try {
    resetSimulationEngine();
    const engine = getSimulationEngine({ pue: 1.3 }, 'twin-1');
    const scenarios = PRESET_SCENARIOS;
    
    if (scenarios.length > 0) {
      engine.startScenario(scenarios[0].id);
      
      // Attempt to get engine with different twin ID
      const engine2 = getSimulationEngine({ pue: 1.4 }, 'twin-2');
      const state = engine2.getState();
      
      // Should have reset when twin changed
      if (state.status !== 'idle') {
        errors.push(`Expected engine to reset when twin changes, got status '${state.status}'`);
      }
    }
    
    resetSimulationEngine();
  } catch (e) {
    errors.push(`Exception: ${(e as Error).message}`);
  }
  
  return {
    passed: errors.length === 0,
    testName: 'Twin Switch Protection',
    duration: performance.now() - start,
    details: 'Verifies engine resets when twin context changes',
    errors
  };
}

/**
 * Run all integration tests
 */
export function runAllSimulationTests(): SimulationTestResult[] {
  const results: SimulationTestResult[] = [];
  
  results.push(testEngineInitialization());
  results.push(testScenarioStart());
  results.push(testPauseResume());
  results.push(testReset());
  results.push(testTwinSwitchProtection());
  
  return results;
}

/**
 * Format test results for console output
 */
export function formatTestResults(results: SimulationTestResult[]): string {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  let output = `\n=== Simulation Integration Tests ===\n`;
  output += `Passed: ${passed} | Failed: ${failed}\n\n`;
  
  results.forEach(r => {
    const status = r.passed ? '✓' : '✗';
    output += `${status} ${r.testName} (${r.duration.toFixed(2)}ms)\n`;
    if (!r.passed) {
      r.errors.forEach(e => {
        output += `  └─ ${e}\n`;
      });
    }
  });
  
  return output;
}
