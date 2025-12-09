# AURA Co-Pilot Upgrade Documentation

## Overview

The AURA Co-Pilot has been completely redesigned as a **docked, context-aware assistant** that integrates deeply with every section of the platform. This upgrade transforms Co-Pilot from a simple chat modal into an intelligent orchestration system with streaming responses, multi-agent reasoning, and structured outputs.

## Architecture

### 1. Model Configuration (`src/lib/copilot/copilotConfig.ts`)

**Single Source of Truth for Model Selection**

- Primary Model: `google/gemini-3-pro-preview`
- Fallback Model: `google/gemini-3.0-pro`
- Streaming: Enabled by default
- Temperature: 0.7
- Max Tokens: 2048

**Key Functions:**
- `resolveCurrentModel()` - Get current model string
- `getModelDisplayName()` - Get UI display name
- `getModelVersion()` - Get version string

**To update model globally:**
```typescript
// Edit COPILOT_MODEL_CONFIG in copilotConfig.ts
export const COPILOT_MODEL_CONFIG: CoPilotModelConfig = {
  primary: 'google/gemini-4-pro-preview', // Update here
  fallback: 'google/gemini-3.0-pro',
  // ...
};
```

### 2. Context System (`src/lib/copilot/contextBuilder.ts`)

**Rich Context Injection**

Every Co-Pilot interaction includes a `CoPilotContext` object with:

```typescript
interface CoPilotContext {
  activePage: string;          // Current page/section
  agentId?: string;            // Selected agent
  agentName?: string;
  agentType?: 'digital_twin' | 'agent';
  industry?: string;
  department?: string;
  environment?: 'dev' | 'test' | 'staging' | 'prod';
  workflowsCount?: number;
  integrationsCount?: number;
  totalRuns?: number;
  lastRunAt?: string;
  sourceType?: 'url_scan' | 'template' | 'manual';
  builderStep?: number;
  activeTab?: string;          // For agent detail pages
}
```

**Building Context:**
```typescript
import { buildCoPilotContext } from '@/lib/copilot/contextBuilder';

const context = await buildCoPilotContext('agent_detail', agentId, {
  activeTab: 'workflow',
  environment: 'dev'
});
```

### 3. Streaming Client (`src/lib/copilot/streaming.ts`)

**Token-by-Token Streaming**

```typescript
import { streamCoPilotResponse } from '@/lib/copilot/streaming';

await streamCoPilotResponse({
  query: userQuery,
  context: currentContext,
  sessionId: sessionId,
  signal: abortController.signal,
  onToken: (token) => {
    // Append each token to UI
  },
  onStructured: (data) => {
    // Receive structured response (actions, insights, etc.)
  },
  onComplete: () => {
    // Stream finished
  },
  onError: (error) => {
    // Handle errors
  }
});
```

### 4. Docked Panel UI (`src/components/copilot/CoPilotDockedPanel.tsx`)

**Right-Side Docked Panel**

- Fixed right-side panel (480px width)
- Slides in/out with smooth animation
- Does not block core UI
- Keyboard shortcut: `Cmd/Ctrl + /`

**Features:**
- Context chips at top (dynamically updated)
- Token-by-token streaming with "Thinking..." animation
- Structured 4-section responses
- Command shortcuts (`/help`, `/list`, etc.)
- Persistent session history

### 5. Structured Response Layout (`src/components/copilot/CoPilotStructuredResponse.tsx`)

**4-Section Layout:**

```typescript
interface StructuredResponse {
  actions: Array<{          // (A) Immediate Actions
    label: string;          // Button text
    handler: string;        // Route or action
    icon?: string;          // Icon name
  }>;
  insights: string[];       // (B) Insights (bullet list)
  nextSteps: string[];      // (C) Next Steps (ordered list)
  followUps: string[];      // (D) Follow-up questions (chips)
}
```

### 6. Analytics (`src/lib/copilot/analytics.ts`)

**Event Logging**

Every Co-Pilot interaction is logged to `copilot_events` table:

```typescript
await logCoPilotEvent({
  sessionId: 'uuid',
  context: currentContext,
  prompt: userQuery,
  responseSummary: response.slice(0, 200),
  actionClicked: 'Create Workflow',  // Optional
  latencyMs: 1234
});
```

**Usage Statistics:**
```typescript
const stats = await getCoPilotStats('week');
// Returns: totalQueries, avgLatencyMs, actionsClicked, uniqueSessions
```

### 7. Backend Orchestration (`supabase/functions/copilot-stream/index.ts`)

**Multi-Agent Internal Orchestration**

The backend implements a hidden multi-agent system:

1. **Supervisor Agent** - Routes queries and composes final response
2. **Domain Agent** - Applies industry/context-specific logic
3. **Action Agent** - Generates immediate actions and next steps

**Key Features:**
- Context-aware system prompts
- Structured response generation
- Token-by-token SSE streaming
- Auto-fallback on errors

## Wiring Co-Pilot Across Platform

### Global Context Provider

All pages are wrapped with `CoPilotProvider` in `App.tsx`:

```tsx
import { CoPilotProvider } from '@/contexts/CoPilotContext';

<CoPilotProvider>
  {/* All routes */}
</CoPilotProvider>
```

### Page-Level Integration

On any page, access Co-Pilot context and trigger:

```typescript
import { useCoPilotContext } from '@/contexts/CoPilotContext';

const { context, askCoPilot, isOpen, setIsOpen } = useCoPilotContext();

// Update context
updateContext({ activeTab: 'workflow' });

// Trigger Co-Pilot with message
askCoPilot('How do I add a workflow?');

// Open panel
setIsOpen(true);
```

### Context Chips

Context chips are auto-generated from `CoPilotContext`:

```tsx
<CoPilotContextChips context={context} />
```

Example output:
```
[Industry: Banking] [Agent: Compliance Twin] [Env: Dev] [Workflows: 0]
```

## Command Shortcuts

Users can type slash commands in Co-Pilot input:

- `/help` - Show available commands
- `/list` - List available agents
- `/new workflow` - Create new workflow
- `/simulate` - Run simulation
- `/fix errors` - Troubleshoot errors

**Adding new commands:**

Edit `CoPilotDockedPanel.tsx`:

```typescript
if (input.startsWith('/mycommand')) {
  // Handle command
}
```

## Performance Targets

- **First Token Latency:** < 1.5s
- **Total Response:** < 5s
- **Caching:** 5 minutes for repeated queries
- **Prefetch:** Enabled on agent detail/builder pages

## Extending Co-Pilot

### Adding a New Action Type

1. **Define action in structured response:**
```typescript
// In copilot-stream/index.ts generateStructuredResponse()
structured.actions.push({
  label: 'Deploy Agent',
  handler: 'deploy',
  icon: 'external'
});
```

2. **Handle action in frontend:**
```typescript
// In CoPilotDockedPanel.tsx handleActionClick()
if (action.handler === 'deploy') {
  navigate(`/deploy/${context.agentId}`);
}
```

### Adding a New Context Field

1. **Add to CoPilotContext type:**
```typescript
// In contextBuilder.ts
export interface CoPilotContext {
  // ... existing fields
  customField?: string;
}
```

2. **Populate in buildCoPilotContext():**
```typescript
context.customField = 'value';
```

3. **Use in backend prompts:**
```typescript
// In copilot-stream/index.ts
if (context.customField) {
  prompt += `\n- Custom: ${context.customField}`;
}
```

### Adding Page-Specific Logic

1. **Update context auto-detection:**
```typescript
// In CoPilotProvider detectPageContext()
else if (path.includes('/my-new-page')) {
  pageName = 'my_new_page';
  additionalContext.customData = data;
}
```

2. **Add backend prompt logic:**
```typescript
// In copilot-stream/index.ts buildSystemPrompt()
if (context.activePage === 'my_new_page') {
  prompt += `\nYou are on My New Page. Focus on...`;
}
```

3. **Generate page-specific actions:**
```typescript
// In generateStructuredResponse()
if (context.activePage === 'my_new_page') {
  structured.actions.push({
    label: 'Page-Specific Action',
    handler: '/my-new-page/action',
    icon: 'wrench'
  });
}
```

## Database Schema

### `copilot_events` Table

```sql
CREATE TABLE public.copilot_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  agent_id UUID REFERENCES agents(id),
  session_id TEXT NOT NULL,
  context JSONB NOT NULL,
  prompt TEXT NOT NULL,
  response_summary TEXT,
  action_clicked TEXT,
  latency_ms INTEGER,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Cleanup:** Old events (>90 days) can be removed with:
```sql
SELECT cleanup_old_copilot_events();
```

## Testing

### Manual Testing Checklist

- [ ] Co-Pilot opens from header and keyboard shortcut (Cmd+/)
- [ ] Context chips update when navigating pages
- [ ] Responses stream token-by-token with "Thinking..." animation
- [ ] All 4 sections render (Actions, Insights, Next Steps, Follow-ups)
- [ ] Action buttons navigate correctly
- [ ] Follow-up questions populate input and auto-send
- [ ] Events logged to `copilot_events` table
- [ ] Model version displayed in footer

### Context Testing

Visit each page and verify context chips:

- Dashboard → `[Page: Dashboard]`
- Agent Detail → `[Agent: X] [Workflows: N] [Integrations: N]`
- Builder → `[Page: Builder] [Step: N]`
- Template Library → `[Page: Template Library]`

## Troubleshooting

### Streaming Not Working

1. Check `LOVABLE_API_KEY` is set in Supabase secrets
2. Verify edge function deployed: `supabase/functions/copilot-stream`
3. Check browser console for CORS or network errors

### Context Not Updating

1. Verify `CoPilotProvider` wraps all routes
2. Check `detectPageContext()` logic in `CoPilotContext.tsx`
3. Use React DevTools to inspect context state

### Actions Not Working

1. Check `handleActionClick()` in `CoPilotDockedPanel.tsx`
2. Verify `structured.actions` have valid `handler` values
3. Test navigation with `console.log(action.handler)`

## Future Enhancements

1. **Voice Input** - Add speech-to-text for hands-free queries
2. **File Upload** - Allow users to upload context files
3. **Memory Persistence** - Remember user preferences across sessions
4. **Multi-Model Fallback** - Auto-switch to GPT-5 if Gemini fails
5. **Custom Prompts** - Let admins customize system prompts per team
6. **Suggestion Prefetch** - Pre-generate suggestions on page load

## Migration Guide

### From Old Co-Pilot

Replace old `useCoPilot()` calls:

**Before:**
```typescript
import { useCoPilot } from '@/contexts/CoPilotContext';
const { isOpen, setIsOpen } = useCoPilot();
```

**After:**
```typescript
import { useCoPilotContext } from '@/contexts/CoPilotContext';
const { isOpen, setIsOpen, askCoPilot } = useCoPilotContext();
```

Replace old `CoPilotDrawer` with new `CoPilotDockedPanel`:

**Before:**
```tsx
<CoPilotDrawer open={isOpen} onClose={() => setIsOpen(false)} />
```

**After:**
```tsx
<CoPilotDockedPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
```

## Support

For questions or issues:
- Check this documentation first
- Review `/lib/copilot/` source code
- Test with `copilot_events` analytics
- Contact: dev@aura.platform

---

**Last Updated:** 2025-01-01  
**Version:** 2.0.0  
**Status:** ✅ Production Ready
