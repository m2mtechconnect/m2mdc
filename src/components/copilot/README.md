# AURA Co-Pilot Integration System

## Overview

The Co-Pilot system provides context-aware AI assistance across the entire AURA platform. It consists of:

1. **Global Context Provider** - Tracks page, agent, and workflow context
2. **Reusable Components** - Bubble, Panel, and Input for seamless integration
3. **Backend Router** - Routes queries to appropriate AI models and data sources
4. **Mock Data Generators** - Industry-specific simulation scenarios and metrics

## Components

### CoPilotProvider (Context)

Wraps the entire app and provides global Co-Pilot context:

```tsx
import { CoPilotProvider } from '@/contexts/CoPilotContext';

<CoPilotProvider>
  <App />
</CoPilotProvider>
```

### CoPilotBubble

Floating button to open Co-Pilot:

```tsx
import { CoPilotBubble } from '@/components/copilot/CoPilotBubble';

<CoPilotBubble position="bottom-right" />
```

### CoPilotPanel

Main Co-Pilot drawer interface:

```tsx
import { CoPilotPanel } from '@/components/copilot/CoPilotPanel';

<CoPilotPanel />
```

### CoPilotInput

Inline input for asking Co-Pilot questions:

```tsx
import { CoPilotInput } from '@/components/copilot/CoPilotInput';

<CoPilotInput placeholder="Ask Co-Pilot..." />
```

## Hook: useCoPilot

Access Co-Pilot functionality from any component:

```tsx
import { useCoPilot } from '@/contexts/CoPilotContext';

const { context, updateContext, askCoPilot, isOpen, setIsOpen } = useCoPilot();

// Ask Co-Pilot programmatically
askCoPilot("How do I configure this agent?");

// Update context
updateContext({ 
  agentId: 'abc-123',
  agentName: 'Fraud Detection Agent' 
});

// Get current context
console.log(context.page); // 'builder', 'agent-operations-center', etc.
```

## Adding Co-Pilot to New Pages

### Step 1: Update Page Component

```tsx
import { useCoPilot } from '@/contexts/CoPilotContext';
import { CoPilotInput } from '@/components/copilot/CoPilotInput';
import { useEffect } from 'react';

export function MyPage() {
  const { updateContext } = useCoPilot();
  
  useEffect(() => {
    updateContext({ 
      page: 'my-page',
      industry: 'finance',
      // ... any relevant context
    });
  }, [updateContext]);
  
  return (
    <div>
      <h1>My Page</h1>
      {/* Add Co-Pilot input where needed */}
      <CoPilotInput placeholder="Ask Co-Pilot about this page..." />
    </div>
  );
}
```

### Step 2: Co-Pilot Will Automatically:

- Detect the page context
- Provide page-specific guidance
- Use industry-specific knowledge
- Generate relevant suggestions

## Backend Integration

### Edge Function: copilot-router

The backend router handles:
- Context-aware system prompts
- Routing to appropriate AI models
- Agent creation/updates
- Workflow generation
- Simulation execution

```typescript
// Automatic context detection
const response = await supabase.functions.invoke('copilot-router', {
  body: {
    query: 'How do I configure this?',
    context: {
      page: 'builder',
      agentId: 'xyz',
      builderStep: 2
    }
  }
});
```

## Mock Data Generators

Industry-specific test data for simulations:

```typescript
import { 
  getSimulationScenarios,
  generateMockRuns,
  generateMockMetrics,
  generateActivityLog
} from '@/lib/generators/mockSimulationData';

const scenarios = getSimulationScenarios({ 
  industry: 'finance',
  category: 'compliance'
});

const runs = generateMockRuns(scenarios, 10);
const metrics = generateMockMetrics(context);
const logs = generateActivityLog(context, 20);
```

## Page Context Types

The system automatically detects and adapts to:

- `dashboard` - Home page
- `builder` - Agent builder (includes step number)
- `agent-operations-center` - AOC/Agent details
- `agent-list` - Manage agents list
- `workflow-editor` - Workflow design
- `simulation` - Test scenarios
- `template-library` - Template marketplace
- `playbook` - Implementation guide
- `url-scanner` - Website analysis
- `recommendations` - AI recommendations
- `governance` - Compliance/audit
- `deployment` - Cloud deployment
- `settings` - Configuration

## Keyboard Shortcuts

- `Ctrl+/` or `Cmd+/` - Toggle Co-Pilot
- `Ctrl+Space` - Toggle Co-Pilot (alternative)

## Best Practices

1. **Always update context** when page content changes
2. **Use CoPilotInput** for inline help rather than directing users to open drawer
3. **Provide specific placeholders** that match the page context
4. **Include relevant context** in updateContext (agent IDs, workflow IDs, etc.)
5. **Test with mock data** before connecting to live services

## Future Enhancements

- Voice input/output
- Multi-turn workflow generation
- Real-time collaboration suggestions
- Automated error debugging
- Integration with version control
