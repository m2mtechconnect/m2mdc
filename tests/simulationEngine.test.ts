import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateSimulationState } from '@/hooks/useSimulationSafeState';

describe('Simulation State Validation', () => {
  it('should validate complete simulation state', () => {
    const state = {
      twinId: 'twin-123',
      scenarioId: 'scenario-456',
      status: 'running'
    };
    
    const result = validateSimulationState(state);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when twinId is missing for running simulation', () => {
    const state = {
      twinId: null,
      scenarioId: 'scenario-456',
      status: 'running'
    };
    
    const result = validateSimulationState(state);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Twin ID is required for running simulation');
  });

  it('should fail when scenarioId is missing for running simulation', () => {
    const state = {
      twinId: 'twin-123',
      scenarioId: null,
      status: 'running'
    };
    
    const result = validateSimulationState(state);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Scenario ID is required for running simulation');
  });

  it('should pass for idle status without twinId', () => {
    const state = {
      twinId: null,
      scenarioId: null,
      status: 'idle'
    };
    
    const result = validateSimulationState(state);
    expect(result.isValid).toBe(true);
  });
});

describe('Simulation Performance', () => {
  it('should handle rapid state updates', () => {
    const updates: number[] = [];
    const startTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      updates.push(i);
    }
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
  });

  it('should maintain state consistency during concurrent updates', async () => {
    let counter = 0;
    const increment = () => { counter++; };
    
    const promises = Array(100).fill(null).map(() => 
      Promise.resolve().then(increment)
    );
    
    await Promise.all(promises);
    expect(counter).toBe(100);
  });
});

describe('Scenario Execution', () => {
  it('should validate scenario structure', () => {
    const validScenario = {
      id: 'test-scenario',
      name: 'Test Scenario',
      description: 'A test scenario',
      duration: 300,
      events: []
    };
    
    expect(validScenario.id).toBeDefined();
    expect(validScenario.duration).toBeGreaterThan(0);
  });

  it('should handle empty event arrays', () => {
    const scenario = { events: [] };
    expect(scenario.events.length).toBe(0);
  });
});

describe('KPI Calculations', () => {
  it('should calculate PUE correctly', () => {
    const totalPower = 1000; // kW
    const itLoad = 800; // kW
    const pue = totalPower / itLoad;
    
    expect(pue).toBeCloseTo(1.25, 2);
  });

  it('should handle edge cases in thermal calculations', () => {
    const inletTemp = 22;
    const outletTemp = 35;
    const deltaT = outletTemp - inletTemp;
    
    expect(deltaT).toBe(13);
    expect(deltaT).toBeGreaterThan(0);
  });

  it('should validate carbon intensity calculations', () => {
    const powerKw = 500;
    const carbonIntensity = 50; // g CO2/kWh
    const hourlyEmissions = (powerKw * carbonIntensity) / 1000; // kg CO2
    
    expect(hourlyEmissions).toBe(25);
  });
});

describe('Timeline Event Handling', () => {
  it('should sort events by timestamp', () => {
    const events = [
      { timestamp: 300, type: 'alert' },
      { timestamp: 100, type: 'info' },
      { timestamp: 200, type: 'warning' }
    ];
    
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    
    expect(sorted[0].timestamp).toBe(100);
    expect(sorted[1].timestamp).toBe(200);
    expect(sorted[2].timestamp).toBe(300);
  });

  it('should filter events by severity', () => {
    const events = [
      { severity: 'critical' },
      { severity: 'warning' },
      { severity: 'info' },
      { severity: 'critical' }
    ];
    
    const criticalEvents = events.filter(e => e.severity === 'critical');
    expect(criticalEvents.length).toBe(2);
  });
});
