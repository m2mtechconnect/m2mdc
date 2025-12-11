/**
 * Timeline <-> KPI Sync Engine
 * Universal synchronization layer between timeline events and KPI charts
 */

import { useState, useCallback, useEffect, createContext, useContext, useMemo } from 'react';
import type { SimulationEvent, KPISnapshot, KPIAnomaly } from '@/simulation/types';
import { detectAnomalies, DEFAULT_KPI_CONFIGS } from '@/engines/kpi/KPIOverlayEngine';

interface TimelineSyncState {
  currentTime: number;
  selectedEventId: string | null;
  hoveredEventId: string | null;
  selectedKpiId: string | null;
  scrubbing: boolean;
  playbackSpeed: number;
  isPlaying: boolean;
}

interface TimelineSyncContextValue extends TimelineSyncState {
  setCurrentTime: (time: number) => void;
  selectEvent: (eventId: string | null) => void;
  hoverEvent: (eventId: string | null) => void;
  selectKpi: (kpiId: string | null) => void;
  startScrubbing: () => void;
  stopScrubbing: () => void;
  setPlaybackSpeed: (speed: number) => void;
  play: () => void;
  pause: () => void;
  seekToEvent: (event: SimulationEvent) => void;
  getEventsAtTime: (time: number, tolerance?: number) => SimulationEvent[];
  getKpiValueAtTime: (kpiId: string, time: number) => number | null;
  getAnomaliesInRange: (startTime: number, endTime: number) => KPIAnomaly[];
}

const TimelineSyncContext = createContext<TimelineSyncContextValue | null>(null);

export function useTimelineSync() {
  const context = useContext(TimelineSyncContext);
  if (!context) {
    throw new Error('useTimelineSync must be used within a TimelineSyncProvider');
  }
  return context;
}

interface TimelineSyncProviderProps {
  children: React.ReactNode;
  events: SimulationEvent[];
  snapshots: KPISnapshot[];
  onTimeChange?: (time: number) => void;
  onEventSelect?: (event: SimulationEvent | null) => void;
}

export function TimelineSyncProvider({
  children,
  events,
  snapshots,
  onTimeChange,
  onEventSelect,
}: TimelineSyncProviderProps) {
  const [state, setState] = useState<TimelineSyncState>({
    currentTime: 0,
    selectedEventId: null,
    hoveredEventId: null,
    selectedKpiId: null,
    scrubbing: false,
    playbackSpeed: 1,
    isPlaying: false,
  });

  // Memoize anomalies detection
  const allAnomalies = useMemo(() => {
    const anomalies: KPIAnomaly[] = [];
    const kpiIds = Object.keys(DEFAULT_KPI_CONFIGS);
    
    for (const kpiId of kpiIds) {
      const config = DEFAULT_KPI_CONFIGS[kpiId];
      if (config.anomalyDetectionEnabled) {
        anomalies.push(...detectAnomalies(snapshots, kpiId, config.anomalySensitivity));
      }
    }
    
    return anomalies;
  }, [snapshots]);

  // Auto-generate events from anomalies
  const enhancedEvents = useMemo(() => {
    const anomalyEvents: SimulationEvent[] = allAnomalies.map(anomaly => ({
      id: `anomaly-event-${anomaly.id}`,
      timestamp: anomaly.timestamp,
      type: 'ANOMALY' as const,
      domain: DEFAULT_KPI_CONFIGS[anomaly.kpiId]?.domain || 'thermal_hardware',
      severity: anomaly.severity === 'high' ? 'critical' : anomaly.severity === 'medium' ? 'high' : 'medium',
      title: `${anomaly.type === 'spike' ? 'Spike' : 'Dip'} in ${DEFAULT_KPI_CONFIGS[anomaly.kpiId]?.name}`,
      description: anomaly.description,
      affectedKpis: [anomaly.kpiId],
    }));

    return [...events, ...anomalyEvents].sort((a, b) => a.timestamp - b.timestamp);
  }, [events, allAnomalies]);

  const setCurrentTime = useCallback((time: number) => {
    setState(prev => ({ ...prev, currentTime: time }));
    onTimeChange?.(time);
  }, [onTimeChange]);

  const selectEvent = useCallback((eventId: string | null) => {
    setState(prev => ({ ...prev, selectedEventId: eventId }));
    
    if (eventId) {
      const event = enhancedEvents.find(e => e.id === eventId);
      if (event) {
        setCurrentTime(event.timestamp);
        onEventSelect?.(event);
      }
    } else {
      onEventSelect?.(null);
    }
  }, [enhancedEvents, setCurrentTime, onEventSelect]);

  const hoverEvent = useCallback((eventId: string | null) => {
    setState(prev => ({ ...prev, hoveredEventId: eventId }));
  }, []);

  const selectKpi = useCallback((kpiId: string | null) => {
    setState(prev => ({ ...prev, selectedKpiId: kpiId }));
  }, []);

  const startScrubbing = useCallback(() => {
    setState(prev => ({ ...prev, scrubbing: true, isPlaying: false }));
  }, []);

  const stopScrubbing = useCallback(() => {
    setState(prev => ({ ...prev, scrubbing: false }));
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, playbackSpeed: speed }));
  }, []);

  const play = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const seekToEvent = useCallback((event: SimulationEvent) => {
    setCurrentTime(event.timestamp);
    selectEvent(event.id);
  }, [setCurrentTime, selectEvent]);

  const getEventsAtTime = useCallback((time: number, tolerance: number = 5): SimulationEvent[] => {
    return enhancedEvents.filter(
      e => Math.abs(e.timestamp - time) <= tolerance
    );
  }, [enhancedEvents]);

  const getKpiValueAtTime = useCallback((kpiId: string, time: number): number | null => {
    // Find the closest snapshot
    const closestSnapshot = snapshots.reduce((prev, curr) => {
      return Math.abs(curr.timestamp - time) < Math.abs(prev.timestamp - time) ? curr : prev;
    }, snapshots[0]);

    return closestSnapshot?.[kpiId] ?? null;
  }, [snapshots]);

  const getAnomaliesInRange = useCallback((startTime: number, endTime: number): KPIAnomaly[] => {
    return allAnomalies.filter(
      a => a.timestamp >= startTime && a.timestamp <= endTime
    );
  }, [allAnomalies]);

  // Playback timer
  useEffect(() => {
    if (!state.isPlaying) return;

    const interval = setInterval(() => {
      setState(prev => {
        const maxTime = snapshots[snapshots.length - 1]?.timestamp ?? 0;
        const newTime = prev.currentTime + prev.playbackSpeed;
        
        if (newTime >= maxTime) {
          return { ...prev, currentTime: maxTime, isPlaying: false };
        }
        
        return { ...prev, currentTime: newTime };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isPlaying, snapshots]);

  const value: TimelineSyncContextValue = {
    ...state,
    setCurrentTime,
    selectEvent,
    hoverEvent,
    selectKpi,
    startScrubbing,
    stopScrubbing,
    setPlaybackSpeed,
    play,
    pause,
    seekToEvent,
    getEventsAtTime,
    getKpiValueAtTime,
    getAnomaliesInRange,
  };

  return (
    <TimelineSyncContext.Provider value={value}>
      {children}
    </TimelineSyncContext.Provider>
  );
}

// Export a hook for creating threshold breach events
export function useThresholdBreachEvents(snapshots: KPISnapshot[]): SimulationEvent[] {
  return useMemo(() => {
    const events: SimulationEvent[] = [];
    const kpiIds = Object.keys(DEFAULT_KPI_CONFIGS);

    for (let i = 1; i < snapshots.length; i++) {
      for (const kpiId of kpiIds) {
        const config = DEFAULT_KPI_CONFIGS[kpiId];
        const prevValue = snapshots[i - 1][kpiId] ?? 0;
        const currValue = snapshots[i][kpiId] ?? 0;

        // Check if we crossed a threshold
        const prevInCritical = config.lowerIsBetter 
          ? prevValue > config.criticalLevel 
          : prevValue < config.criticalLevel;
        const currInCritical = config.lowerIsBetter 
          ? currValue > config.criticalLevel 
          : currValue < config.criticalLevel;

        if (!prevInCritical && currInCritical) {
          events.push({
            id: `threshold-breach-${kpiId}-${i}`,
            timestamp: snapshots[i].timestamp,
            type: 'THRESHOLD_BREACH',
            domain: config.domain,
            severity: 'critical',
            title: `${config.name} Critical Threshold Breach`,
            description: `${config.name} crossed critical threshold: ${currValue.toFixed(2)}${config.unit}`,
            affectedKpis: [kpiId],
          });
        }
      }
    }

    return events;
  }, [snapshots]);
}
