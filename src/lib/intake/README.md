# Unified Intake System

**Phase 1 Implementation Complete** ✅

## Overview

The Unified Intake System provides a **single entry point** for all intake flows in the M2M Agentic Studio. All paths to the Builder (URL, file upload, questionnaire, templates) now flow through one consistent service.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     INTAKE SOURCES                          │
├─────────────────────────────────────────────────────────────┤
│  Dashboard URL  │  File Upload  │  Questionnaire  │ Template│
└────────┬────────┴──────┬────────┴────────┬────────┴────┬────┘
         │               │                  │             │
         └───────────────┴──────────────────┴─────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  startBuilderFromIntake()     │
              │  (Unified Intake Service)     │
              └───────────────┬───────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
   Convert to          Create/Update        Track Analytics
   AgentBlueprint      Builder Session      & Navigate
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Builder (5-step) │
                    └─────────────────┘
```

## Core Components

### 1. `unifiedIntakeService.ts`
**Main entry point** - All intake flows call `startBuilderFromIntake()`

```typescript
import { startBuilderFromIntake } from '@/lib/intake';

const result = await startBuilderFromIntake({
  source: 'template',
  userId: user.id,
  templateId: 'building-permit-twin',
});

navigate(result.builderUrl);
```

### 2. `sessionManager.ts`
Manages builder sessions in the database (`agent_drafts` table)

- `createBuilderSession()` - Create new builder session
- `updateBuilderSession()` - Update existing session (e.g., file upload in Step 2)
- `getBuilderSession()` - Retrieve session by ID
- `deleteBuilderSession()` - Delete session

### 3. `types.ts`
Shared TypeScript types for all intake flows

- `UnifiedIntakePayload` - Input to unified service
- `IntakeResult` - Output from unified service
- `BuilderSession` - Session structure

## Usage Examples

### Template Selection (Dashboard or Marketplace)

```typescript
import { startBuilderFromTemplate } from '@/lib/intake';

const handleTemplateSelect = async (template: any) => {
  const result = await startBuilderFromTemplate(
    template.id,
    user.id,
    'marketplace'
  );
  
  if (result.success) {
    navigate(result.builderUrl);
  } else {
    toast.error(result.error);
  }
};
```

### File Upload (Dashboard)

```typescript
import { startBuilderFromFile } from '@/lib/intake';

const handleFileAnalysisComplete = async (jobId: string) => {
  const result = await startBuilderFromFile(
    jobId,
    user.id
  );
  
  if (result.success) {
    navigate(result.builderUrl);
  }
};
```

### File Upload in Builder (Step 2)

```typescript
import { startBuilderFromFile } from '@/lib/intake';

const handleFileUploadInBuilder = async (jobId: string) => {
  // Pass existingSessionId to UPDATE instead of CREATE
  const result = await startBuilderFromFile(
    jobId,
    user.id,
    currentSessionId  // ← Updates existing session
  );
  
  // Session updated, refresh UI
  toast.success('Document added to knowledge base');
};
```

### Questionnaire

```typescript
import { startBuilderFromQuestionnaire } from '@/lib/intake';

const handleQuestionnaireSubmit = async (answers: QuestionnaireAnswers) => {
  const result = await startBuilderFromQuestionnaire(
    answers,
    user.id
  );
  
  if (result.success) {
    navigate(result.builderUrl);
  }
};
```

### URL Input

```typescript
import { startBuilderFromUrl } from '@/lib/intake';

const handleUrlSubmit = async (url: string) => {
  const result = await startBuilderFromUrl(
    url,
    user.id
  );
  
  if (result.success) {
    navigate(result.builderUrl);
  }
};
```

## Data Flow

### 1. Intake → Blueprint Conversion

Each intake source has a dedicated converter:

- **Template**: `templateToBlueprint()` - Loads from JSON/DB
- **File**: `documentAnalysisToBlueprint()` - Uses Gemini analysis
- **Questionnaire**: `questionnaireToBlueprint()` - Maps form answers
- **URL**: Built-in minimal blueprint (future: URL analysis service)

### 2. Session Management

Sessions are stored in `agent_drafts` table:

```sql
{
  id: uuid,
  owner_id: uuid,
  goal: {
    name: string,
    description: string,
    industry: string,
    department: string,
    type: 'agent' | 'process_twin' | '3d_twin'
  },
  config: {
    blueprint: AgentBlueprint,  -- Full blueprint data
    source: IntakeSource,
    model: ModelConfig,
    workflow: WorkflowConfig,
    ...
  },
  meta: {
    templateId?: string,
    templateName?: string,
    ...
  },
  step_completed: number,
  status: 'DRAFT'
}
```

### 3. State Management

- **Builder Session** (database): Persistent session data
- **Blueprint Store** (Zustand): In-memory blueprint for UI hydration
- **Wizard Builder Store** (Zustand): 5-step wizard UI state

All three are kept in sync by the unified service.

## Benefits

### ✅ **Consistency**
- All intake flows behave identically
- Single source of truth for data transformation
- Predictable error handling

### ✅ **Maintainability**
- One place to update logic
- Easy to add new intake sources
- Clear separation of concerns

### ✅ **Session Management**
- Proper create vs update logic
- No duplicate sessions
- No state cross-contamination

### ✅ **Analytics**
- Consistent tracking across all flows
- Single point for analytics events
- Complete intake funnel visibility

## Next Steps (Future Phases)

### Phase 2: Refactor Entry Points
Update all UI components to use the unified service:
- `HeroSearchBar.tsx` (Dashboard)
- `ModernFileUploadWizard.tsx` (Dashboard & Builder)
- `QuestionnaireWizard.tsx` (Dashboard)
- `TemplateLibraryModal.tsx` (Dashboard & Marketplace)

### Phase 3: Fix File Upload Pipeline
- Robust error handling
- Performance optimization (chunking, size limits)
- Clear user feedback

### Phase 4: Session Persistence
- Auto-save during editing
- Session recovery after page reload
- History/version tracking

### Phase 5: Comprehensive Testing
- Unit tests for converters
- Integration tests for full flows
- E2E regression tests

## Migration Guide

### Before (Old Pattern)

```typescript
// Each intake flow had custom logic
const handleTemplateSelect = async (template) => {
  const blueprint = templateToBlueprint(template);
  useBlueprintStore.getState().setBlueprint(blueprint);
  trackEvent('template.selected', { id: template.id });
  navigate('/builder?template=' + template.id);
};
```

### After (Unified Pattern)

```typescript
// All flows use the same service
const handleTemplateSelect = async (template) => {
  const result = await startBuilderFromTemplate(
    template.id,
    user.id,
    'marketplace'
  );
  
  if (result.success) {
    navigate(result.builderUrl);
  }
};
```

## Testing

```typescript
import { startBuilderFromIntake } from '@/lib/intake';

describe('Unified Intake Service', () => {
  it('creates session from template', async () => {
    const result = await startBuilderFromIntake({
      source: 'template',
      userId: 'test-user',
      templateId: 'test-template',
    });
    
    expect(result.success).toBe(true);
    expect(result.sessionId).toBeDefined();
    expect(result.blueprint.source).toBe('template');
  });
});
```

## FAQs

**Q: What if I need to update an existing session?**  
A: Pass `existingSessionId` in the payload. The service will merge new data with existing.

**Q: Can I force a new session even if one exists?**  
A: Yes, set `forceNew: true` in the payload.

**Q: What happens if conversion fails?**  
A: The service returns `{ success: false, error: string }`. Always check `result.success`.

**Q: How do I track custom analytics?**  
A: Add `metadata` to the payload. It's passed to analytics handlers.

**Q: Can I use this for programmatic agent creation?**  
A: Yes! The service works for both UI and programmatic flows.

---

**Status**: Phase 1 Complete ✅  
**Next**: Phase 2 - Refactor all entry points to use unified service  
**Docs Updated**: 2025-11-29
