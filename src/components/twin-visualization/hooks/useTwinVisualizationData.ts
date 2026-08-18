/**
 * Hook: useTwinVisualizationData
 * Maps active twin + builder state into visual primitives
 * 
 * CRITICAL: 
 * 1. Prioritizes ActiveTwinContext data over builder store
 * 2. INTEGRATES with SimulationEngine for live updates during simulation
 * 3. Never uses builder store values when a real twin is selected
 * 4. Uses centralized KPI key mapping for consistent alias resolution
 */

import { useMemo } from 'react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { useTwinContext } from '@/hooks/useTwinContext';
import { useSimulationVisualization } from '@/hooks/useSimulationVisualization';
import { getKpiValue } from '@/lib/kpiKeyMap';
import type {
  RackVisual,
  RowVisual,
  PowerSegmentVisual,
  ThermalZoneVisual,
  NetworkNodeVisual,
  NetworkLinkVisual,
  SimulationEventVisual,
  TwinVisualizationState
} from '../types';

// Generate rack layout based on capacity
function generateRackLayout(capacityKw: number, scenarioEvents: any[] = []): {
  racks: RackVisual[];
  rows: RowVisual[];
} {
  const rackCount = Math.max(8, Math.min(40, Math.floor(capacityKw / 50)));
  const rowCount = Math.ceil(rackCount / 8);
  const racksPerRow = Math.ceil(rackCount / rowCount);
  
  const rows: RowVisual[] = [];
  const racks: RackVisual[] = [];
  
  const affectedRackIds = new Set(
    scenarioEvents.flatMap(e => e.affectedRacks || [])
  );

  for (let r = 0; r < rowCount; r++) {
    const rowId = `row-${r + 1}`;
    rows.push({
      id: rowId,
      name: `Row ${String.fromCharCode(65 + r)}`,
      position: [0, 0, r * 4],
      rackCount: racksPerRow,
      isHotAisle: r % 2 === 1
    });

    for (let i = 0; i < racksPerRow && racks.length < rackCount; i++) {
      const rackId = `rack-${r + 1}-${i + 1}`;
      const baseUtil = 40 + Math.random() * 50;
      const baseTemp = 20 + Math.random() * 10;
      const basePower = 15 + Math.random() * 25;
      
      const isAffected = affectedRackIds.has(rackId);
      
      racks.push({
        id: rackId,
        name: `Rack ${String.fromCharCode(65 + r)}${i + 1}`,
        rowId,
        position: [i * 1.2, 0, r * 4],
        heightU: 42,
        utilizationPercent: Math.min(100, baseUtil + (isAffected ? 20 : 0)),
        powerKw: basePower,
        thermalCelsius: baseTemp + (isAffected ? 5 : 0),
        isCritical: baseTemp > 30 || baseUtil > 90,
        isAffected
      });
    }
  }

  return { racks, rows };
}

// Generate power topology
function generatePowerSegments(racks: RackVisual[]): PowerSegmentVisual[] {
  const segments: PowerSegmentVisual[] = [];
  
  // Grid to UPS connections
  segments.push({
    id: 'grid-ups-a',
    from: 'grid',
    to: 'ups-a',
    fromType: 'grid',
    toType: 'ups',
    loadKw: racks.reduce((sum, r) => sum + r.powerKw, 0) * 0.5,
    capacityKw: 2000,
    isDegraded: false,
    fromPosition: [-5, 2, -3],
    toPosition: [-3, 1.5, -2]
  });
  
  segments.push({
    id: 'grid-ups-b',
    from: 'grid',
    to: 'ups-b',
    fromType: 'grid',
    toType: 'ups',
    loadKw: racks.reduce((sum, r) => sum + r.powerKw, 0) * 0.5,
    capacityKw: 2000,
    isDegraded: false,
    fromPosition: [-5, 2, 3],
    toPosition: [-3, 1.5, 4]
  });

  // UPS to PDU connections
  const halfRacks = Math.ceil(racks.length / 2);
  segments.push({
    id: 'ups-a-pdu-1',
    from: 'ups-a',
    to: 'pdu-1',
    fromType: 'ups',
    toType: 'pdu',
    loadKw: racks.slice(0, halfRacks).reduce((sum, r) => sum + r.powerKw, 0),
    capacityKw: 1000,
    isDegraded: false,
    fromPosition: [-3, 1.5, -2],
    toPosition: [-1, 1, 0]
  });

  segments.push({
    id: 'ups-b-pdu-2',
    from: 'ups-b',
    to: 'pdu-2',
    fromType: 'ups',
    toType: 'pdu',
    loadKw: racks.slice(halfRacks).reduce((sum, r) => sum + r.powerKw, 0),
    capacityKw: 1000,
    isDegraded: false,
    fromPosition: [-3, 1.5, 4],
    toPosition: [-1, 1, 6]
  });

  return segments;
}

// Generate thermal zones
function generateThermalZones(rows: RowVisual[], racks: RackVisual[]): ThermalZoneVisual[] {
  const zones: ThermalZoneVisual[] = [];
  
  rows.forEach((row, idx) => {
    const rowRacks = racks.filter(r => r.rowId === row.id);
    const avgTemp = rowRacks.reduce((sum, r) => sum + r.thermalCelsius, 0) / (rowRacks.length || 1);
    
    zones.push({
      id: `zone-${row.id}`,
      areaLabel: row.isHotAisle ? 'Hot Aisle' : 'Cold Aisle',
      position: [-0.5, 0.01, row.position[2] - 0.5],
      size: [rowRacks.length * 1.2 + 1, 3],
      avgCelsius: avgTemp,
      hotspot: avgTemp > 28
    });
  });

  return zones;
}

// Generate network topology
function generateNetworkTopology(racks: RackVisual[]): {
  nodes: NetworkNodeVisual[];
  links: NetworkLinkVisual[];
} {
  const nodes: NetworkNodeVisual[] = [
    { id: 'core-sw-1', type: 'core-switch', label: 'Core Switch 1', position: [4, 0], critical: false },
    { id: 'core-sw-2', type: 'core-switch', label: 'Core Switch 2', position: [8, 0], critical: false },
    { id: 'firewall-1', type: 'firewall', label: 'Firewall', position: [6, -2], critical: false },
    { id: 'router-1', type: 'router', label: 'Border Router', position: [6, -4], critical: false }
  ];

  // Add TOR switches for each row
  const rowIds = [...new Set(racks.map(r => r.rowId))];
  rowIds.forEach((rowId, idx) => {
    nodes.push({
      id: `tor-${rowId}`,
      type: 'tor-switch',
      label: `TOR ${rowId}`,
      position: [2 + idx * 3, 3 + idx],
      critical: false
    });
  });

  const links: NetworkLinkVisual[] = [
    { id: 'link-core-1-2', from: 'core-sw-1', to: 'core-sw-2', bandwidthGbps: 100, utilizationPercent: 45, degraded: false },
    { id: 'link-core-fw', from: 'core-sw-1', to: 'firewall-1', bandwidthGbps: 40, utilizationPercent: 30, degraded: false },
    { id: 'link-fw-router', from: 'firewall-1', to: 'router-1', bandwidthGbps: 40, utilizationPercent: 25, degraded: false }
  ];

  // Connect TOR switches to core
  rowIds.forEach((rowId) => {
    links.push({
      id: `link-tor-${rowId}-core1`,
      from: `tor-${rowId}`,
      to: 'core-sw-1',
      bandwidthGbps: 25,
      utilizationPercent: 40 + Math.random() * 30,
      degraded: false
    });
  });

  return { nodes, links };
}

export function useTwinVisualizationData(): TwinVisualizationState {
  const { activeTwin, isPreviewMode, recommendation } = useTwinContext();
  const builderState = useDCTwinBuilderStore();
  
  // CRITICAL: Connect to simulation engine for live updates
  const simulation = useSimulationVisualization();
  
  const visualData = useMemo(() => {
    // PRIORITY: ActiveTwin (from header) > Recommendation preview > Builder store
    // NEVER use builder store when a real twin is selected
    let capacityKw = 500;
    let facilityName = 'Data Centre Twin';
    let carbonIntensity = 30;
    
    if (activeTwin) {
      // Real twin selected via header dropdown - EXCLUSIVE source
      capacityKw = activeTwin.capacity_kw || 500;
      facilityName = activeTwin.name || 'Data Centre Twin';
      carbonIntensity = activeTwin.carbon_intensity || 30;
    } else if (isPreviewMode && recommendation) {
      // Preview mode from scanner - derive capacity from capacityTier
      const tierToKw: Record<string, number> = {
        'small': 1000,
        'medium': 5000,
        'large': 10000,
        'hyperscale': 20000,
      };
      capacityKw = tierToKw[recommendation.capacityTier] || 5000;
      facilityName = recommendation.companyName 
        ? `${recommendation.companyName} Sovereign Green AI Data Centre Twin` 
        : 'Preview Twin';
      carbonIntensity = recommendation.kpiTargets?.carbonIntensityTargetGPerKwh || 30;
    } else {
      // Fallback to builder store ONLY when no twin selected (sandbox mode)
      const overview = builderState.overview;
      capacityKw = overview?.capacityKw || 500;
      facilityName = overview?.twinName || 'Data Centre Twin';
      carbonIntensity = (overview as any)?.carbonIntensityGCo2PerKwh || 30;
    }
    
    // Use simulation events if simulation is active
    const scenarioEvents = simulation.isSimulating ? simulation.events : [];
    
    // Generate base layout
    const { racks, rows } = generateRackLayout(capacityKw, scenarioEvents);
    let powerSegments = generatePowerSegments(racks);
    let thermalZones = generateThermalZones(rows, racks);
    const { nodes: networkNodes, links: networkLinks } = generateNetworkTopology(racks);
    
    // CRITICAL: Apply simulation effects when simulation is running
    if (simulation.isSimulating) {
      racks = simulation.applyRackEffects(racks);
      thermalZones = simulation.applyThermalEffects(thermalZones);
      powerSegments = simulation.applyPowerEffects(powerSegments);
    }
    
    // Calculate aggregate metrics from simulation KPIs or base values
    const totalPower = racks.reduce((sum, r) => sum + r.powerKw, 0);
    const avgUtil = racks.reduce((sum, r) => sum + r.utilizationPercent, 0) / (racks.length || 1);
    
    // Use simulation PUE if available (using centralized key mapping), otherwise calculate
    const pue = simulation.isSimulating 
      ? getKpiValue(simulation.currentKpis, 'pue', 1.2 + (avgUtil / 500))
      : 1.2 + (avgUtil / 500);
    
    // Map simulation events for timeline visualization with type normalization
    const domainMap: Record<string, SimulationEventVisual['domain']> = {
      'thermal': 'thermal',
      'power': 'power',
      'cooling': 'cooling',
      'network': 'network',
      'compute': 'compute',
      'workload': 'workload',
      'sovereignty': 'sovereignty',
      'financial': 'financial',
      'facility_safety': 'cooling', // Map facility_safety to closest domain
    };
    
    const severityMap: Record<string, SimulationEventVisual['severity']> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical',
      'info': 'info',
      'warning': 'warning',
    };
    
    const events: SimulationEventVisual[] = simulation.events.map((e, idx) => ({
      id: e.id || `event-${idx}`,
      timestamp: new Date(Date.now() + e.timestamp * 1000).toISOString(),
      timeSeconds: e.timestamp,
      label: e.title || 'Event',
      severity: severityMap[e.severity] || 'info',
      domain: domainMap[e.domain] || 'compute',
      affectedRacks: e.affectedRacks || [],
      affectedNodes: e.affectedZones || []
    }));

    return {
      racks,
      rows,
      powerSegments,
      thermalZones,
      networkNodes,
      networkLinks,
      events,
      isSimulating: simulation.isSimulating,
      activeScenario: simulation.activeScenarioId,
      currentTime: simulation.currentTime,
      facilityName,
      totalCapacityKw: capacityKw,
      pue,
      carbonIntensity,
      // Expose simulation KPIs for external use
      simulationKpis: simulation.currentKpis,
      simulationProgress: simulation.progress,
    };
  }, [
    activeTwin, 
    isPreviewMode, 
    recommendation, 
    builderState.overview,
    simulation.isSimulating,
    simulation.events,
    simulation.currentKpis,
    simulation.currentTime,
    simulation.activeScenarioId,
    simulation.progress,
    simulation.applyRackEffects,
    simulation.applyThermalEffects,
    simulation.applyPowerEffects,
  ]);

  return visualData;
}
