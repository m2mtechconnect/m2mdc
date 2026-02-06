# M2M Digital Twin Platform - Architecture Documentation

## Overview

The M2M Digital Twin Platform is an enterprise-grade application for creating, managing, and simulating AI-powered digital twins for data center operations. Built with React, TypeScript, and Supabase, it follows a modern architecture with clear separation of concerns.

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, TypeScript | UI rendering and type safety |
| **Styling** | Tailwind CSS, shadcn/ui | Design system and components |
| **State** | Zustand | Global state management |
| **Data Fetching** | TanStack React Query | Server state and caching |
| **Backend** | Supabase (Lovable Cloud) | Database, Auth, Edge Functions |
| **3D Visualization** | Three.js, React Three Fiber | Data center visualizations |
| **Charts** | Recharts | KPI dashboards and analytics |
| **Animation** | Framer Motion | UI animations |

## Directory Structure

```
src/
├── assets/              # Static images and icons
├── components/          # React components (40+ directories)
│   ├── ui/              # shadcn/ui base components
│   ├── dc-*/            # Data center specific components
│   ├── agent-*/         # Agent management components
│   └── shared/          # Reusable shared components
├── context/             # React Context providers (consolidated)
├── engines/             # Business logic engines
│   ├── carbon/          # Carbon emissions calculations
│   ├── financial/       # Financial modeling
│   └── kpi/             # KPI overlay and forecasting
├── hooks/               # Custom React hooks
├── integrations/        # External service integrations
│   └── supabase/        # Supabase client and types
├── lib/                 # Utility libraries
│   ├── utils/           # General utilities
│   └── errorHandlers.ts # Centralized error handling
├── pages/               # Route page components
├── services/            # API service layers
├── simulation/          # Simulation engine types and logic
├── stores/              # Zustand state stores
├── types/               # TypeScript type definitions
└── App.tsx              # Application root

supabase/
├── functions/           # Edge Functions (127+)
│   ├── _shared/         # Shared utilities
│   │   ├── auth.ts      # Authentication helpers
│   │   ├── handler.ts   # Standardized request handler
│   │   ├── rest-client.ts # External API client
│   │   └── types.ts     # API response types
│   └── [function-name]/ # Individual functions
└── migrations/          # Database migrations

tests/
├── unit/                # Unit tests (Vitest)
├── integration/         # Integration tests
├── e2e/                 # End-to-end tests (Playwright)
└── fixtures/            # Test fixtures and mocks
```

## Architecture Patterns

### State Management

```
┌─────────────────────────────────────────────────────────────┐
│                    Application State                         │
├─────────────────┬─────────────────┬────────────────────────┤
│   Zustand       │  React Query    │  React Context         │
│   (Client)      │  (Server)       │  (Component Tree)      │
├─────────────────┼─────────────────┼────────────────────────┤
│ blueprintStore  │ useQuery()      │ ActiveTwinContext      │
│ dcTwinBuilder   │ useMutation()   │ RBACContext            │
│ catalogStore    │ Cache           │ CoPilotContext         │
│ simulationStore │ Optimistic      │                        │
└─────────────────┴─────────────────┴────────────────────────┘
```

**Stores:**
- `blueprintStore` - Current agent blueprint state
- `dcTwinBuilderStore` - DC Twin builder wizard state
- `catalogStore` - Template and catalog data
- `simulationSnapshotStore` - Simulation timeline state

### Data Flow

```
┌──────────┐    ┌───────────┐    ┌──────────────┐    ┌──────────┐
│   User   │───▶│ Component │───▶│ Zustand      │───▶│ Edge     │
│   Action │    │           │    │ Store/Query  │    │ Function │
└──────────┘    └───────────┘    └──────────────┘    └────┬─────┘
                                                          │
     ┌────────────────────────────────────────────────────┘
     │
     ▼
┌──────────┐    ┌───────────┐    ┌──────────────┐
│ Supabase │───▶│ RLS       │───▶│ Response     │
│ Database │    │ Policies  │    │ + Types      │
└──────────┘    └───────────┘    └──────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Pages (Routes)                          │
│    Dashboard | Agents | Simulation | Blueprint | Deploy      │
├─────────────────────────────────────────────────────────────┤
│                   Feature Components                         │
│  DCTwinBuilder | AgentChat | SimulationEngine | KPIOverlay  │
├─────────────────────────────────────────────────────────────┤
│                   Shared Components                          │
│  StatusBadge | LoadingSpinner | ErrorBoundary | NavBar      │
├─────────────────────────────────────────────────────────────┤
│                     UI Components                            │
│       Button | Card | Dialog | Input | Badge | Tabs         │
└─────────────────────────────────────────────────────────────┘
```

## Key Subsystems

### 1. DC Twin Builder

The DC Twin Builder is a multi-step wizard for creating data center digital twins.

```
Step 1: Overview    →  Twin name, industry, capacity
Step 2: Blueprint   →  Agents, data sources, KPIs
Step 3: Preview     →  Intelligence configuration
Step 4: Workflows   →  Automation and scenarios
Step 5: Deploy      →  Region, compliance checks
```

**Store:** `useDCTwinBuilderStore`
**Key Features:**
- Auto-creation of required entities (KPIs, agents, workflows)
- Industry-specific defaults
- Canadian sovereignty compliance
- Financial model integration

### 2. Calculation Engines

#### Carbon Engine (`src/engines/carbon/`)
- Emissions calculation per region
- Renewable offset calculations
- Carbon pricing simulation
- Budget tracking

```typescript
CarbonEngine.evaluate(input) → CarbonMetricsOutput
CarbonEngine.compareRegions(input, from, to) → Comparison
CarbonEngine.simulateCarbonPriceShock(metrics, old, new) → ShockResult
```

#### KPI Overlay Engine (`src/engines/kpi/`)
- Threshold zones with severity levels
- Anomaly detection (Z-score based)
- Linear regression forecasting
- Correlation matrix calculation

```typescript
detectAnomalies(snapshots, kpiId, sensitivity) → KPIAnomaly[]
generateForecast(snapshots, kpiId, horizon) → KPIForecast
calculateCorrelationMatrix(snapshots, kpiIds) → { matrix, topDrivers }
```

### 3. Edge Functions

Standardized edge function pattern with shared utilities:

```typescript
// handler.ts pattern
export const handler = createHandler({
  name: 'function-name',
  authLevel: 'user',
  inputSchema: z.object({ ... }),
  handler: async (input, context) => {
    // Business logic
    return result;
  },
});
```

**Standard Response Envelope:**
```typescript
{
  success: boolean;
  data: T | null;
  error: ApiError | null;
  correlationId: string;
}
```

### 4. Authentication & Authorization

- Supabase Auth for user authentication
- Row Level Security (RLS) for data isolation
- RBAC context for permission checks

```
User → Auth Token → RLS Policies → Data Access
                 ↓
           RBAC Context → Feature Access
```

## Security Model

### Row Level Security (RLS)

All user data tables have RLS enabled with policies:
- SELECT: User sees own data
- INSERT: Links to authenticated user
- UPDATE: Ownership verification
- DELETE: Ownership verification

**Example Policy:**
```sql
CREATE POLICY "Users can view their own twins"
ON data_centre_twins FOR SELECT
USING (auth.uid() = created_by_user);
```

### Edge Function Security

- JWT validation via `getAuthContext()`
- Zod schema validation for inputs
- Error codes mapped to HTTP status
- Correlation IDs for tracing

## Performance Optimizations

### Bundle Splitting (vite.config.ts)

```typescript
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-ui': ['@radix-ui/*'],
  'vendor-charts': ['recharts'],
  'vendor-3d': ['three', '@react-three/fiber', '@react-three/drei'],
  'vendor-query': ['@tanstack/react-query'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-motion': ['framer-motion'],
}
```

### React Optimization Patterns

- `React.memo` for expensive components
- `useMemo` / `useCallback` for stable references
- Suspense for lazy loading
- Virtual lists for large datasets

## Testing Strategy

| Type | Framework | Coverage Target |
|------|-----------|-----------------|
| Unit | Vitest | 80% core logic |
| Integration | Vitest | API contracts |
| E2E | Playwright | Critical paths |
| Accessibility | axe-core | WCAG 2.1 AA |

**Test Location:**
- Unit: `tests/unit/`
- Integration: `tests/integration/`
- E2E: `tests/e2e/`

## Error Handling

Centralized error handling via `src/lib/errorHandlers.ts`:

```typescript
// Usage
handleError(error, { component: 'Dashboard', action: 'loadData' });

// Features
- Automatic toast notifications
- Structured logging
- Error normalization
- Context enrichment
```

## Logging

Production logging via `src/lib/logger.ts`:

```typescript
logger.info('Operation completed', { twinId });
logger.warn('Threshold exceeded', { value, threshold });
logger.error('Failed to save', error, { component: 'Builder' });
```

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `data_centre_twins` | Digital twin configurations |
| `agents` | AI agent instances |
| `agent_runs` | Agent execution history |
| `agent_templates` | Reusable agent templates |
| `dc_scan_sessions` | URL scan results |
| `dc_blueprint_templates` | Industry blueprints |

## Deployment

- **Preview**: Automatic on every commit
- **Production**: Manual publish from Lovable
- **Edge Functions**: Auto-deployed with code changes
- **Database**: Migrations via Lovable Cloud

## Related Documentation

- [TypeScript Strict Migration](./TYPESCRIPT_STRICT_MIGRATION.md)
- [Security Policy](../SECURITY.md)
- [Implementation Plan](../.lovable/plan.md)

---

## Architecture Diagrams

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                        M2M Platform                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   React SPA  │◄──▶│   Supabase   │◄──▶│   External   │      │
│  │   Frontend   │    │   Backend    │    │   APIs       │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Lovable Cloud                         │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐   │   │
│  │  │ Postgres│ │Auth     │ │Storage  │ │Edge         │   │   │
│  │  │ + RLS   │ │         │ │         │ │Functions    │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Simulation Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  Scenario  │────▶│ Simulation │────▶│   KPI      │
│  Config    │     │  Engine    │     │  Overlay   │
└────────────┘     └────────────┘     └────────────┘
      │                  │                   │
      ▼                  ▼                   ▼
 ┌─────────┐       ┌─────────┐        ┌─────────┐
 │ Events  │       │Snapshots│        │Anomalies│
 │ Timeline│       │ History │        │Forecasts│
 └─────────┘       └─────────┘        └─────────┘
```
