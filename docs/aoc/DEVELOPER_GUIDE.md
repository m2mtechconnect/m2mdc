# AOC Developer Guide

Complete guide for developers extending and integrating with the Agent Operations Center.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Edge Functions](#edge-functions)
4. [Real-time Integration](#real-time-integration)
5. [Custom Controls](#custom-controls)
6. [API Reference](#api-reference)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Contributing](#contributing)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────┐
│  Frontend (React + TypeScript)          │
│  - AOC Dashboard                        │
│  - React Query for state                │
│  - Real-time subscriptions              │
└───────────┬─────────────────────────────┘
            │
            ↓ HTTPS + WebSocket
            │
┌───────────┴─────────────────────────────┐
│  Supabase Backend                       │
│  ├─ PostgreSQL Database                 │
│  ├─ Edge Functions (Deno)               │
│  ├─ Real-time Server                    │
│  └─ Authentication                      │
└─────────────────────────────────────────┘
```

### Data Flow

```typescript
// 1. User action (e.g., "Start Agent")
button.onClick() 
  ↓
// 2. API call
fetch('/edge-function/aoc-runtime-control')
  ↓
// 3. Edge function processes
async function startAgent(agentId: string)
  ↓
// 4. Database update
UPDATE agents SET status = 'active'
  ↓
// 5. Real-time broadcast
NOTIFY agents_channel
  ↓
// 6. Frontend receives update
supabase.channel().on('postgres_changes', ...)
  ↓
// 7. UI updates
setState({ status: 'active' })
```

### Tech Stack

**Frontend**:
- React 18
- TypeScript
- TanStack Query (React Query)
- Tailwind CSS
- Radix UI Components
- Recharts for metrics

**Backend**:
- Supabase (PostgreSQL + Edge Functions)
- Deno runtime for edge functions
- Real-time via WebSocket

**Testing**:
- Vitest for unit tests
- Playwright for E2E tests
- Faker for test data

---

## Development Setup

### Prerequisites

```bash
# Required
node >= 18
npm >= 9
supabase-cli >= 1.100.0

# Optional
deno >= 1.40 (for local edge function dev)
```

### Initial Setup

1. **Clone repository**:
```bash
git clone <your-repo>
cd aura-platform
```

2. **Install dependencies**:
```bash
npm install
```

3. **Link Supabase project**:
```bash
supabase link --project-ref your-project-id
```

4. **Pull database schema**:
```bash
supabase db pull
```

5. **Start dev server**:
```bash
npm run dev
```

6. **Start Supabase locally** (optional):
```bash
supabase start
```

### Environment Variables

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_AOC_DEBUG=true
```

### Project Structure

```
src/
├── components/
│   └── aoc/
│       ├── AOC.tsx                    # Main component
│       ├── ActivityStream.tsx         # Log viewer
│       ├── ControlPanel.tsx           # Agent controls
│       ├── MetricsPanel.tsx           # KPIs
│       ├── WorkflowGraph.tsx          # Visualization
│       ├── hooks/
│       │   ├── useAgentControl.ts     # Control logic
│       │   ├── useActivityStream.ts   # Log streaming
│       │   ├── useMetrics.ts          # Metrics queries
│       │   └── useRealtime.ts         # WebSocket
│       └── __tests__/
│           ├── AOCIntegration.test.tsx
│           └── AOCHooks.test.tsx
│
├── integrations/
│   └── supabase/
│       ├── client.ts                  # Supabase client
│       └── types.ts                   # Generated types
│
└── pages/
    └── AOC.tsx                        # Page wrapper

supabase/
├── functions/
│   ├── aoc-runtime-control/
│   │   └── index.ts                   # Runtime control API
│   └── aoc-simulate-test/
│       └── index.ts                   # Test simulation
│
└── migrations/
    └── 20240101000000_aoc_tables.sql  # Database schema

tests/
└── e2e/
    └── aoc.spec.ts                    # End-to-end tests

docs/
└── aoc/
    └── *.md                           # Documentation
```

---

## Edge Functions

### Creating New Functions

```typescript
// supabase/functions/my-function/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', { 
        headers: corsHeaders 
      });
    }

    // Parse request
    const { agentId, action } = await req.json();

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Your logic here
    const { data, error } = await supabase
      .from('agents')
      .update({ status: 'active' })
      .eq('id', agentId)
      .select()
      .single();

    if (error) throw error;

    // Return response
    return new Response(
      JSON.stringify({ data }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### Runtime Control Function

The main control function:

```typescript
// supabase/functions/aoc-runtime-control/index.ts

export interface ControlRequest {
  agentId: string;
  action: 'start' | 'pause' | 'stop' | 'restart';
  options?: {
    pauseDuration?: number;
    reason?: string;
  };
}

export interface ControlResponse {
  success: boolean;
  status: string;
  message: string;
}

async function controlAgent(
  request: ControlRequest
): Promise<ControlResponse> {
  const { agentId, action, options } = request;

  switch (action) {
    case 'start':
      return await startAgent(agentId);
      
    case 'pause':
      return await pauseAgent(agentId, options?.pauseDuration);
      
    case 'stop':
      return await stopAgent(agentId, options?.reason);
      
    case 'restart':
      await stopAgent(agentId);
      return await startAgent(agentId);
      
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
```

### Testing Edge Functions Locally

```bash
# Start functions locally
supabase functions serve aoc-runtime-control --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/aoc-runtime-control \
  -H \"Authorization: Bearer YOUR_ANON_KEY\" \
  -H \"Content-Type: application/json\" \
  -d '{\"agentId\": \"123\", \"action\": \"start\"}'
```

### Deploying Functions

```bash
# Deploy single function
supabase functions deploy aoc-runtime-control

# Deploy all functions
supabase functions deploy --all

# Set secrets
supabase secrets set MY_SECRET=value
```

---

## Real-time Integration

### Setting Up Subscriptions

```typescript
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeAgents(agentId: string) {
  useEffect(() => {
    const channel = supabase
      .channel(`agent-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'agents',
          filter: `id=eq.${agentId}`,
        },
        (payload) => {
          console.log('Agent changed:', payload);
          // Update state
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);
}
```

### Multiple Table Subscriptions

```typescript
export function useRealtimeLogs(agentId: string) {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel('logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_action_logs',
          filter: `system_id=eq.${agentId}`,
        },
        (payload) => {
          setLogs((prev) => [payload.new as Log, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_runs',
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          // Handle run events
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  return logs;
}
```

### Presence Tracking

Track who's viewing AOC:

```typescript
export function usePresence(agentId: string) {
  const [viewers, setViewers] = useState<Viewer[]>([]);

  useEffect(() => {
    const channel = supabase.channel(`presence-${agentId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setViewers(Object.values(state).flat());
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  return viewers;
}
```

### Real-time Performance

**Optimize subscriptions**:

```typescript
// ✅ Good: Single channel, multiple listeners
const channel = supabase.channel('aoc');
channel
  .on('postgres_changes', { ... }, handler1)
  .on('postgres_changes', { ... }, handler2)
  .subscribe();

// ❌ Bad: Multiple channels
const channel1 = supabase.channel('logs').on(...).subscribe();
const channel2 = supabase.channel('runs').on(...).subscribe();
```

**Batch updates**:

```typescript
// Accumulate changes, emit once per 100ms
const buffer: Change[] = [];
let timeout: NodeJS.Timeout;

function handleChange(change: Change) {
  buffer.push(change);
  clearTimeout(timeout);
  
  timeout = setTimeout(() => {
    emit(buffer);
    buffer.length = 0;
  }, 100);
}
```

---

## Custom Controls

### Adding Custom Actions

1. **Create hook**:

```typescript
// src/components/aoc/hooks/useCustomAction.ts

export function useCustomAction(agentId: string) {
  const { mutate, isPending } = useMutation({
    mutationFn: async (params: ActionParams) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-action`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ agentId, ...params }),
        }
      );

      if (!response.ok) throw new Error('Action failed');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Action completed');
    },
    onError: (error) => {
      toast.error(`Action failed: ${error.message}`);
    },
  });

  return { executeAction: mutate, isPending };
}
```

2. **Create UI component**:

```typescript
// src/components/aoc/CustomActionButton.tsx

export function CustomActionButton({ agentId }: Props) {
  const { executeAction, isPending } = useCustomAction(agentId);

  return (
    <Button
      onClick={() => executeAction({ action: 'custom' })}
      disabled={isPending}
    >
      {isPending ? 'Processing...' : 'Custom Action'}
    </Button>
  );
}
```

3. **Add to control panel**:

```typescript
// src/components/aoc/ControlPanel.tsx

import { CustomActionButton } from './CustomActionButton';

export function ControlPanel({ agent }: Props) {
  return (
    <div className="control-panel">
      {/* Existing controls */}
      <CustomActionButton agentId={agent.id} />
    </div>
  );
}
```

### Custom Metrics

Add custom KPIs:

```typescript
// src/components/aoc/hooks/useCustomMetric.ts

export function useCustomMetric(agentId: string) {
  return useQuery({
    queryKey: ['custom-metric', agentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_runs')
        .select('metadata')
        .eq('agent_id', agentId);

      // Custom calculation
      const customValue = data.reduce((sum, run) => {
        return sum + (run.metadata?.customField || 0);
      }, 0);

      return customValue;
    },
    refetchInterval: 30000, // 30 seconds
  });
}
```

Display in metrics panel:

```typescript
export function CustomMetricCard({ agentId }: Props) {
  const { data, isLoading } = useCustomMetric(agentId);

  return (
    <Card>
      <CardHeader>Custom Metric</CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton />
        ) : (
          <div className="text-3xl font-bold">{data}</div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## API Reference

### Agent Control API

```typescript
POST /functions/v1/aoc-runtime-control

Request:
{
  "agentId": "uuid",
  "action": "start" | "pause" | "stop" | "restart",
  "options": {
    "pauseDuration": 3600,  // seconds (optional)
    "reason": "string"       // optional
  }
}

Response:
{
  "success": boolean,
  "status": "active" | "paused" | "stopped",
  "message": "string"
}
```

### Query API

Get agent data:

```typescript
// Get agent
const { data: agent } = await supabase
  .from('agents')
  .select('*')
  .eq('id', agentId)
  .single();

// Get runs with filters
const { data: runs } = await supabase
  .from('agent_runs')
  .select('*')
  .eq('agent_id', agentId)
  .gte('created_at', startDate)
  .lte('created_at', endDate)
  .order('created_at', { ascending: false })
  .limit(100);

// Get logs
const { data: logs } = await supabase
  .from('agent_action_logs')
  .select('*')
  .eq('system_id', agentId)
  .in('status', ['error', 'warning'])
  .order('created_at', { ascending: false });
```

### Metrics API

Calculate metrics:

```typescript
// Success rate
const { data } = await supabase.rpc('calculate_success_rate', {
  p_agent_id: agentId,
  p_start_date: startDate,
  p_end_date: endDate,
});

// Custom aggregation
const { data } = await supabase
  .from('agent_runs')
  .select('status, duration_ms')
  .eq('agent_id', agentId);

const metrics = {
  successRate: data.filter(r => r.status === 'completed').length / data.length,
  avgLatency: data.reduce((sum, r) => sum + r.duration_ms, 0) / data.length,
  totalRuns: data.length,
};
```

---

## Testing

### Unit Tests (Vitest)

```typescript
// src/components/aoc/__tests__/useAgentControl.test.tsx

import { renderHook, waitFor } from '@testing-library/react';
import { useAgentControl } from '../hooks/useAgentControl';

describe('useAgentControl', () => {
  it('starts agent successfully', async () => {
    const { result } = renderHook(() => 
      useAgentControl('agent-123')
    );

    result.current.startAgent();

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.status).toBe('active');
  });

  it('handles start failure', async () => {
    // Mock failure
    server.use(
      rest.post('/functions/v1/aoc-runtime-control', (req, res, ctx) => {
        return res(ctx.status(400), ctx.json({ error: 'Failed' }));
      })
    );

    const { result } = renderHook(() => 
      useAgentControl('agent-123')
    );

    result.current.startAgent();

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

### Integration Tests

```typescript
// src/components/aoc/__tests__/AOCIntegration.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AOC } from '../AOC';

describe('AOC Integration', () => {
  it('full user workflow', async () => {
    const user = userEvent.setup();
    render(<AOC agentId="agent-123" />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Agent #123')).toBeInTheDocument();
    });

    // Start agent
    await user.click(screen.getByRole('button', { name: /start/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    // Check logs appear
    await waitFor(() => {
      expect(screen.getByText(/log entry/i)).toBeInTheDocument();
    });

    // Stop agent
    await user.click(screen.getByRole('button', { name: /stop/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Stopped')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/aoc.spec.ts

import { test, expect } from '@playwright/test';

test.describe('AOC E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/agents/test-agent/operations');
  });

  test('user can control agent', async ({ page }) => {
    // Check page loaded
    await expect(page.locator('h1')).toContainText('Agent Operations');

    // Start agent
    await page.click('button:has-text("Start")');
    await expect(page.locator('.status')).toHaveText('Active');

    // Verify logs streaming
    await expect(page.locator('.activity-stream')).toBeVisible();
    await expect(page.locator('.log-entry')).toHaveCount.greaterThan(0);

    // Stop agent
    await page.click('button:has-text("Stop")');
    await page.click('button:has-text("Confirm")');
    await expect(page.locator('.status')).toHaveText('Stopped');
  });

  test('metrics update in real-time', async ({ page }) => {
    // Get initial metrics
    const initialRuns = await page.locator('[data-metric="total-runs"]').textContent();

    // Trigger action that creates run
    await page.click('button:has-text("Test Run")');

    // Wait for metrics to update
    await expect(page.locator('[data-metric="total-runs"]')).not.toHaveText(initialRuns);
  });
});
```

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E in UI mode
npm run test:e2e:ui
```

---

## Deployment

### CI/CD Pipeline

Example GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml

name: Deploy AOC

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e

  deploy-functions:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      
      - run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Manual Deployment

```bash
# 1. Run tests
npm run test
npm run test:e2e

# 2. Deploy edge functions
supabase functions deploy --all

# 3. Build frontend
npm run build

# 4. Deploy to hosting
vercel --prod
# or
netlify deploy --prod
```

---

## Contributing

### Code Style

Follow project conventions:

```typescript
// ✅ Good
export function useAgentControl(agentId: string) {
  const { mutate, isPending } = useMutation({...});
  return { startAgent: mutate, isPending };
}

// ❌ Bad
export function useAgentControl(agentId: string) {
  let loading = false;
  function start() {
    loading = true;
    // ...
  }
  return { start, loading };
}
```

Use TypeScript strictly:

```typescript
// ✅ Typed
interface AgentControlProps {
  agentId: string;
  onSuccess?: () => void;
}

// ❌ Untyped
function AgentControl(props: any) {
  // ...
}
```

### Pull Request Process

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes with tests
3. Run linter: `npm run lint`
4. Run tests: `npm run test`
5. Commit: `git commit -m \"feat: add custom action\"`
6. Push: `git push origin feature/my-feature`
7. Open PR on GitHub
8. Wait for review and CI to pass
9. Merge when approved

### Commit Convention

Follow Conventional Commits:

```
feat: add custom metric support
fix: resolve real-time connection issue
docs: update API reference
test: add E2E test for workflow graph
chore: update dependencies
```

---

## Next Steps

- 📖 [User Guide](./USER_GUIDE.md) - Learn to use AOC
- ⚙️ [Admin Guide](./ADMIN_GUIDE.md) - Configure and maintain
- ❓ [FAQ](./FAQ.md) - Common questions

---

[← Back to Documentation](./README.md)
