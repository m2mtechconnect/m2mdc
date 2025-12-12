# Simulation Engine Performance Optimizations

## Overview
The simulation system has been optimized for smooth 60fps rendering during high-frequency updates.

## Applied Optimizations

### 1. Component Memoization
All simulation components use `React.memo()` to prevent unnecessary re-renders:
- `DCSimulationPanel` - Main simulation container
- `DCKPIDeltas` - KPI delta display cards
- `DCEventTimeline` - Event timeline with severity markers
- `AnimatedRackHeatmap` - Thermal visualization grid

### 2. Debounced Updates
`useDebouncedValue` hook prevents UI thrashing during rapid simulation ticks:
- Rack metrics recalculation debounced by 100ms
- Prevents excessive DOM updates during fast playback

### 3. Batched State Updates
`useBatchedUpdates` hook batches multiple state changes into single render:
- Uses `requestAnimationFrame` for optimal timing
- Reduces layout thrashing

### 4. Memoized Calculations
Expensive calculations are memoized with `useMemo`:
- KPI delta/percentage calculations
- Event sorting by timestamp
- Rack temperature aggregations (hot count, average, optimal/elevated/critical counts)

### 5. Throttled Callbacks
`useThrottledCallback` prevents callback spam during simulation:
- Event hover handlers throttled
- Click handlers stabilized

### 6. Performance Monitoring
`useRenderPerformance` hook tracks render times in development:
- Logs warnings for renders exceeding 16ms threshold
- Helps identify performance regressions

## Performance Hooks

Located in `src/hooks/usePerformanceOptimization.ts`:

```typescript
// Debounce rapid value changes
const debouncedValue = useDebouncedValue(value, 100);

// Memoize expensive KPI calculations with optional caching
const result = useKPIMemo(() => expensiveCalculation(), [deps], 'cache-key');

// Track component render times (dev only)
useRenderPerformance('ComponentName', 16);

// Batch multiple state updates
const batchUpdate = useBatchedUpdates();
batchUpdate(() => { setState1(); setState2(); });

// Throttle high-frequency state updates
const [value, setValue] = useThrottledState(initial, 50);
```

## Safe State Management

Located in `src/hooks/useSimulationSafeState.ts`:

```typescript
// Prevent state updates on unmounted components
const { safeSetState, isMounted } = useSimulationSafeState();

// Throttle callbacks during simulation
const throttledFn = useThrottledCallback(callback, 50);

// Validate simulation state
const { isValid, errors } = validateSimulationState(state);
```

## Testing

Unit tests in `tests/simulationEngine.test.ts` cover:
- State validation
- Performance benchmarks
- Scenario execution
- KPI calculations
- Timeline event handling

Integration tests in `src/simulation/integrationTests.ts` verify:
- Engine initialization
- Scenario start/events
- Pause/resume functionality
- Reset behavior
- Twin switch protection
