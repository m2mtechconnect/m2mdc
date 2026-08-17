import { useCallback, useRef, useEffect } from 'react';

/**
 * Guards against state updates on unmounted components during async simulation operations.
 * Returns a wrapped setState that only executes if component is still mounted.
 */
export function useSimulationSafeState() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback(<T>(setter: React.Dispatch<React.SetStateAction<T>>, value: T | ((prev: T) => T)) => {
    if (isMountedRef.current) {
      setter(value as any);
    }
  }, []);

  const isMounted = useCallback(() => isMountedRef.current, []);

  return { safeSetState, isMounted };
}

/**
 * Debounces rapid state updates during simulation playback.
 * Prevents UI thrashing from high-frequency tick emissions.
 */
export function useThrottledCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 50
): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    if (timeSinceLastCall >= delay) {
      lastCallRef.current = now;
      callback(...args);
    } else if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback(...args);
        timeoutRef.current = null;
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]) as T;
}

/**
 * Validates simulation state before operations.
 * Returns validation result with specific error messages.
 */
export function validateSimulationState(state: {
  twinId?: string | null;
  scenarioId?: string | null;
  status?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  // Requirements only apply once a simulation is actually running; an idle
  // workspace legitimately has no twin or scenario selected yet.
  const isRunning = state.status === 'running';

  if (!state.twinId && isRunning) {
    errors.push('Twin ID is required for running simulation');
  }

  if (!state.scenarioId && isRunning) {
    errors.push('Scenario ID is required for running simulation');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
