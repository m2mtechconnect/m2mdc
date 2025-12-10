/**
 * usePerformanceMonitor - Hook for measuring component and operation performance
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  type: 'render' | 'hydration' | 'compute' | 'network' | 'simulation';
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  warnings: string[];
  averages: Record<string, number>;
  peakLoad?: number;
}

const PERFORMANCE_THRESHOLD_MS = 200;

// Global performance store for cross-component access
const globalMetrics: PerformanceMetric[] = [];
const subscribers: Set<(metrics: PerformanceMetric[]) => void> = new Set();

function notifySubscribers() {
  subscribers.forEach(fn => fn([...globalMetrics]));
}

export function usePerformanceMonitor(componentName: string) {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const renderStartRef = useRef<number>(0);
  const mountTimeRef = useRef<number>(0);

  // Subscribe to global metrics
  useEffect(() => {
    const handler = (m: PerformanceMetric[]) => setMetrics(m.filter(x => x.name.startsWith(componentName)));
    subscribers.add(handler);
    return () => { subscribers.delete(handler); };
  }, [componentName]);

  // Track component mount/render time
  useEffect(() => {
    const mountEnd = performance.now();
    const mountDuration = mountEnd - mountTimeRef.current;
    
    if (mountTimeRef.current > 0) {
      const metric: PerformanceMetric = {
        name: `${componentName}:mount`,
        startTime: mountTimeRef.current,
        endTime: mountEnd,
        duration: mountDuration,
        type: 'hydration',
      };
      globalMetrics.push(metric);
      notifySubscribers();

      if (mountDuration > PERFORMANCE_THRESHOLD_MS) {
        console.warn(`[Performance] ${componentName} mount exceeded ${PERFORMANCE_THRESHOLD_MS}ms: ${mountDuration.toFixed(2)}ms`);
      }
    }
  }, [componentName]);

  // Set mount start time on first render
  if (mountTimeRef.current === 0) {
    mountTimeRef.current = performance.now();
  }

  // Manual timing functions
  const startTiming = useCallback((operationName: string, type: PerformanceMetric['type'] = 'compute') => {
    const metric: PerformanceMetric = {
      name: `${componentName}:${operationName}`,
      startTime: performance.now(),
      type,
    };
    globalMetrics.push(metric);
    return globalMetrics.length - 1; // Return index for endTiming
  }, [componentName]);

  const endTiming = useCallback((index: number) => {
    if (globalMetrics[index]) {
      const metric = globalMetrics[index];
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      notifySubscribers();

      if (metric.duration > PERFORMANCE_THRESHOLD_MS) {
        console.warn(`[Performance] ${metric.name} exceeded ${PERFORMANCE_THRESHOLD_MS}ms: ${metric.duration.toFixed(2)}ms`);
      }

      return metric.duration;
    }
    return 0;
  }, []);

  // Measure async operation
  const measureAsync = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>,
    type: PerformanceMetric['type'] = 'compute'
  ): Promise<T> => {
    const idx = startTiming(operationName, type);
    try {
      const result = await operation();
      endTiming(idx);
      return result;
    } catch (e) {
      endTiming(idx);
      throw e;
    }
  }, [startTiming, endTiming]);

  // Measure sync operation
  const measureSync = useCallback(<T>(
    operationName: string,
    operation: () => T,
    type: PerformanceMetric['type'] = 'compute'
  ): T => {
    const idx = startTiming(operationName, type);
    try {
      const result = operation();
      endTiming(idx);
      return result;
    } catch (e) {
      endTiming(idx);
      throw e;
    }
  }, [startTiming, endTiming]);

  // Generate performance report
  const getReport = useCallback((): PerformanceReport => {
    const componentMetrics = globalMetrics.filter(m => m.name.startsWith(componentName) && m.duration !== undefined);
    const warnings: string[] = [];
    const averages: Record<string, number> = {};

    // Calculate averages by type
    const byType: Record<string, number[]> = {};
    componentMetrics.forEach(m => {
      if (!byType[m.type]) byType[m.type] = [];
      byType[m.type].push(m.duration!);
      
      if (m.duration! > PERFORMANCE_THRESHOLD_MS) {
        warnings.push(`${m.name}: ${m.duration!.toFixed(2)}ms exceeds threshold`);
      }
    });

    Object.entries(byType).forEach(([type, durations]) => {
      averages[type] = durations.reduce((a, b) => a + b, 0) / durations.length;
    });

    const peakLoad = componentMetrics.length > 0 
      ? Math.max(...componentMetrics.map(m => m.duration!)) 
      : undefined;

    return { metrics: componentMetrics, warnings, averages, peakLoad };
  }, [componentName]);

  // Log performance summary
  const logSummary = useCallback(() => {
    const report = getReport();
    console.group(`[Performance] ${componentName} Summary`);
    console.log('Metrics:', report.metrics.length);
    console.log('Averages:', report.averages);
    if (report.peakLoad) console.log('Peak Load:', report.peakLoad.toFixed(2), 'ms');
    if (report.warnings.length > 0) {
      console.warn('Warnings:', report.warnings);
    }
    console.groupEnd();
  }, [componentName, getReport]);

  return {
    metrics,
    startTiming,
    endTiming,
    measureAsync,
    measureSync,
    getReport,
    logSummary,
  };
}

// Utility to get all global metrics
export function getAllPerformanceMetrics(): PerformanceMetric[] {
  return [...globalMetrics];
}

// Utility to clear all metrics
export function clearPerformanceMetrics(): void {
  globalMetrics.length = 0;
  notifySubscribers();
}

// Subscribe to global metrics
export function subscribeToMetrics(callback: (metrics: PerformanceMetric[]) => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}
