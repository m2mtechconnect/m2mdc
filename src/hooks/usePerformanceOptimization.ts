/**
 * usePerformanceOptimization - Performance utilities for simulation components
 * Provides memoization, debouncing, and render optimization helpers
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';

/**
 * Debounces rapid updates during simulation playback
 */
export function useDebouncedValue<T>(value: T, delay: number = 100): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Memoizes expensive KPI calculations
 */
export function useKPIMemo<T>(
  computeFn: () => T,
  deps: React.DependencyList,
  cacheKey?: string
): T {
  const cacheRef = useRef<Map<string, T>>(new Map());
  
  return useMemo(() => {
    if (cacheKey && cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey)!;
    }
    
    const result = computeFn();
    
    if (cacheKey) {
      cacheRef.current.set(cacheKey, result);
      // Limit cache size
      if (cacheRef.current.size > 50) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) cacheRef.current.delete(firstKey);
      }
    }
    
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Tracks render performance and logs slow renders
 */
export function useRenderPerformance(componentName: string, threshold: number = 16) {
  const startTimeRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);

  useEffect(() => {
    const endTime = performance.now();
    const duration = endTime - startTimeRef.current;
    renderCountRef.current++;

    if (duration > threshold && process.env.NODE_ENV === 'development') {
      console.warn(
        `[Performance] ${componentName} render #${renderCountRef.current} took ${duration.toFixed(2)}ms`
      );
    }
  });

  startTimeRef.current = performance.now();
}

/**
 * Batches multiple state updates into single render using RAF
 */
export function useBatchedUpdates() {
  const pendingUpdatesRef = useRef<(() => void)[]>([]);
  const frameIdRef = useRef<number | null>(null);

  const batchUpdate = useCallback((update: () => void) => {
    pendingUpdatesRef.current.push(update);

    if (frameIdRef.current === null) {
      frameIdRef.current = requestAnimationFrame(() => {
        const updates = pendingUpdatesRef.current;
        pendingUpdatesRef.current = [];
        frameIdRef.current = null;
        updates.forEach(fn => fn());
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, []);

  return batchUpdate;
}

/**
 * Limits update frequency for high-frequency data
 */
export function useThrottledState<T>(
  initialValue: T,
  throttleMs: number = 50
): [T, (value: T) => void] {
  const [state, setState] = useState(initialValue);
  const lastUpdateRef = useRef<number>(0);
  const pendingValueRef = useRef<T | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledSetState = useCallback((value: T) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate >= throttleMs) {
      lastUpdateRef.current = now;
      setState(value);
      pendingValueRef.current = null;
    } else {
      pendingValueRef.current = value;
      
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          if (pendingValueRef.current !== null) {
            lastUpdateRef.current = Date.now();
            setState(pendingValueRef.current);
            pendingValueRef.current = null;
          }
          timeoutRef.current = null;
        }, throttleMs - timeSinceLastUpdate);
      }
    }
  }, [throttleMs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, throttledSetState];
}
