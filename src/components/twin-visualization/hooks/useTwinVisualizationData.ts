/**
 * Hook: useTwinVisualizationData
 * Maps builder + KPI + simulation state into visual primitives
 */

import { useMemo } from 'react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { useActiveTwin } from '@/context/ActiveTwinContext';
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
  const { activeTwinId } = useActiveTwin();
  const builderState = useDCTwinBuilderStore();
  
  const visualData = useMemo(() => {
    const overview = builderState.overview;
    const capacityKw = overview?.capacityKw || 500;
    const facilityName = overview?.twinName || 'Data Centre Twin';
    
    // Get scenario events if simulation is active
    const activeScenario = builderState.scenarios?.find(s => s.enabled);
    const scenarioEvents: any[] = [];
    
    // Generate layout
    const { racks, rows } = generateRackLayout(capacityKw, scenarioEvents);
    const powerSegments = generatePowerSegments(racks);
    const thermalZones = generateThermalZones(rows, racks);
    const { nodes: networkNodes, links: networkLinks } = generateNetworkTopology(racks);
    
    // Calculate aggregate metrics
    const totalPower = racks.reduce((sum, r) => sum + r.powerKw, 0);
    const avgUtil = racks.reduce((sum, r) => sum + r.utilizationPercent, 0) / (racks.length || 1);
    const pue = 1.2 + (avgUtil / 500); // Simulated PUE based on utilization
    
    // Map simulation events
    const events: SimulationEventVisual[] = scenarioEvents.map((e, idx) => ({
      id: `event-${idx}`,
      timestamp: new Date(Date.now() + idx * 60000).toISOString(),
      timeSeconds: idx * 60,
      label: e.label || 'Event',
      severity: e.severity || 'info',
      domain: e.domain || 'compute',
      affectedRacks: e.affectedRacks,
      affectedNodes: e.affectedNodes
    }));

    return {
      racks,
      rows,
      powerSegments,
      thermalZones,
      networkNodes,
      networkLinks,
      events,
      isSimulating: false,
      activeScenario: activeScenario?.id || null,
      currentTime: 0,
      facilityName,
      totalCapacityKw: capacityKw,
      pue,
      carbonIntensity: (overview as any)?.carbonIntensityGCo2PerKwh || 30
    };
  }, [builderState, activeTwinId]);

  return visualData;
}
