# Builder Backend Integration - Complete Implementation

## Overview

The 6-step builder has been fully connected to the backend with complete persistence, validation, and deployment capabilities. The builder is now database-first with proper error handling and state management.

## Backend Architecture

### Database Schema
All builder data is stored in the `agents` table with `status='draft'` for drafts and `status='active'` for deployed agents. The `config` JSON field stores the complete builder state:

```json
{
  "source": "homepage | dashboard | imported",
  "goal": "string",
  "industry": "string",
  "department": "string",
  "type": "agent | process_twin | 3d_twin",
  "template_id": "string",
  "workflow": {
    "triggers": [],
    "actions": [],
    "integrations": [],
    "hitl": []
  },
  "model_config": {
    "provider": "openai | google | azure",
    "model": "string",
    "rag": {},
    "policies": {},
    "mcp_servers": []
  },
  "step_completed": 0,
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

### Edge Functions Created

#### 1. `builders-create` (POST /v1/builders-create)
- **Purpose**: Create new builder draft
- **Auth**: Required (user JWT)
- **Input**: 
  - source (optional)
  - goal, industry, department, type, template_id (all optional)
- **Output**: Builder ID and complete builder object
- **Behavior**: Creates draft agent with prefilled values

#### 2. `builders-get` (GET /v1/builders-get)
- **Purpose**: Fetch existing builder by ID
- **Auth**: Required (user JWT)
- **Input**: builderId (UUID)
- **Output**: Complete builder object
- **Behavior**: Retrieves draft for user, validates ownership

#### 3. `builders-update` (PATCH /v1/builders-update)
- **Purpose**: Update specific builder fields
- **Auth**: Required (user JWT)
- **Input**: 
  - builderId (UUID)
  - updates (partial config object)
- **Output**: Updated builder object
- **Behavior**: Merges updates into existing config, updates timestamp

#### 4. `builders-deploy` (POST /v1/builders-deploy)
- **Purpose**: Deploy builder as live agent/twin
- **Auth**: Required (user JWT)
- **Input**: builderId (UUID)
- **Output**: 
  - deployment_id
  - status ("success" | "error")
  - agent_url (if success)
  - message (if error)
- **Behavior**: 
  - Validates all required fields
  - Changes status from 'draft' to 'active'
  - Creates deployment record
  - Returns agent URL for navigation

### Validation Rules

The deployment function validates:
- ✅ Goal is defined
- ✅ Industry is selected
- ✅ Department is selected
- ✅ Type is selected (agent/process_twin/3d_twin)
- ✅ Template is loaded
- ✅ At least one workflow action exists
- ✅ Model configuration is present

## Frontend Architecture

### Service Layer

**File**: `src/services/builderService.ts`

Provides typed API client for all builder operations:
- `builderService.create()` - Create new draft
- `builderService.get()` - Load existing draft
- `builderService.update()` - Update draft fields
- `builderService.deploy()` - Deploy as live agent

### State Management

**File**: `src/stores/wizardBuilderStore.ts`

Completely refactored to be backend-first:

**Key Changes**:
- Removed Zustand persist middleware (no local storage)
- Added `builderId` to track current draft
- Added `isLoading`, `error`, `lastSaved` for UI state
- All setter methods are now async and call backend
- Auto-save happens on every field change
- `initializeBuilder()` replaces `initializeFromParams()`
- `loadBuilder()` fetches existing draft
- `deployBuilder()` triggers deployment

**State Flow**:
```
Mount → initializeBuilder() → 
  If builderId exists → loadBuilder() → Load from DB
  Else → create() → Create new draft in DB → Prefill from URL params
  
User changes field → 
  Local state update (optimistic) → 
  Backend API call → 
  Update lastSaved timestamp
  
Step 6 Deploy → 
  deployBuilder() → 
  Validate all fields → 
  Call builders-deploy → 
  Navigate to agent URL
```

### UI Components

#### Builder.tsx
- Added initialization logic
- Shows loading state while fetching/creating
- Displays error toasts
- Passes `lastSaved` to layout

#### BuilderLayout.tsx
- Added `lastSaved` prop
- Displays "Saved [time]" indicator in sidebar
- Shows auto-save status to user

#### Step6Review.tsx
- Completely rewritten
- Shows validation status for all fields
- Displays deployment result
- Handles success (navigate to agent) and failure (retry) flows
- Live deployment with proper error handling

#### Step5Workflow.tsx
- Updated to match new workflow schema
- Removed `outputSchema` (deprecated)
- Changed `hitlApprovals` (boolean) → `hitl` (array of approval steps)

## Navigation & URL Patterns

### Creating New Builder
```
/builder?source=homepage&goal=...&industry=...&department=...&template=...
→ Creates new draft with prefilled values
→ URL updates to: /builder?draft=[builderId]&step=1
```

### Resuming Existing Draft
```
/builder?draft=[builderId]
→ Loads existing draft from database
→ Navigates to last completed step + 1
```

### Post-Deployment
```
Successful deploy → Navigate to /agents/[agentId]
Failed deploy → Stay on Step 6, show error, allow retry
```

## Error Handling

### Backend Errors
- **404**: Builder not found or user doesn't own it
- **400**: Validation failed (missing required fields)
- **500**: Database error

### Frontend Handling
- All errors shown via toast notifications
- Non-blocking errors for auto-save failures
- Blocking errors for deployment failures
- Retry logic for deployment

### Validation
- Step-by-step validation in UI (Next button disabled)
- Final validation before deployment (server-side)
- Clear error messages for each validation failure

## Auto-Save Behavior

- ✅ Triggers on every field change
- ✅ Debounced to prevent excessive API calls
- ✅ Shows timestamp of last save
- ✅ Non-blocking (doesn't prevent navigation)
- ✅ Optimistic updates (UI updates immediately)
- ✅ Error recovery (retries on failure)

## Configuration

**File**: `supabase/config.toml`

Added function configurations:
```toml
[functions.builders-create]
verify_jwt = true

[functions.builders-get]
verify_jwt = true

[functions.builders-update]
verify_jwt = true

[functions.builders-deploy]
verify_jwt = true

[functions.agents-deploy]
verify_jwt = true
```

## Files Created

### Backend (Edge Functions)
- `supabase/functions/builders-create/index.ts`
- `supabase/functions/builders-get/index.ts`
- `supabase/functions/builders-update/index.ts`
- `supabase/functions/builders-deploy/index.ts`

### Frontend
- `src/services/builderService.ts` (new)

## Files Modified

### Frontend
- `src/stores/wizardBuilderStore.ts` (complete refactor)
- `src/pages/Builder.tsx` (added initialization logic)
- `src/components/builder/BuilderLayout.tsx` (added lastSaved prop)
- `src/components/builder/steps/Step5Workflow.tsx` (updated schema)
- `src/components/builder/steps/Step6Review.tsx` (complete rewrite)

### Configuration
- `supabase/config.toml` (added new functions)

## Testing Checklist

### Create New Builder
- [ ] Navigate from homepage with recommendations
- [ ] Fields are prefilled correctly
- [ ] New draft is created in database
- [ ] URL updates with draft ID

### Resume Draft
- [ ] Load existing draft by ID
- [ ] All fields are restored correctly
- [ ] Navigation works between steps
- [ ] Auto-save updates draft

### Auto-Save
- [ ] Changes are saved automatically
- [ ] Last saved timestamp updates
- [ ] No errors in console
- [ ] Draft persists after page reload

### Deployment
- [ ] Cannot deploy with incomplete fields
- [ ] Validation errors are clear
- [ ] Successful deployment navigates to agent
- [ ] Failed deployment shows error and allows retry
- [ ] Deployment record is created

### Error Handling
- [ ] Network errors show toast
- [ ] Validation errors are inline
- [ ] Loading states work correctly
- [ ] Error recovery works

## Next Steps

1. **Add drag-and-drop workflow builder** (Step 5)
2. **Add template loader with preview** (Step 4)
3. **Add industry/department selector** (Step 2)
4. **Add type selection cards** (Step 3)
5. **Add model configuration UI** (Step 5)
6. **Add deployment progress indicators** (Step 6)
7. **Add draft management** (list, delete, duplicate)

## API Examples

### Create Builder
```typescript
const { id, builder } = await builderService.create({
  source: 'homepage',
  goal: 'Automate customer support',
  industry: 'Technology',
  department: 'Customer Success'
});
```

### Update Builder
```typescript
await builderService.update(builderId, {
  workflow: {
    actions: ['Classify', 'Route', 'Respond']
  }
});
```

### Deploy Builder
```typescript
const result = await builderService.deploy(builderId);
if (result.status === 'success') {
  navigate(result.agent_url);
}
```

## Summary

The 6-step builder is now fully backend-wired with:
- ✅ Complete persistence layer
- ✅ Auto-save on every change
- ✅ Draft resume capability
- ✅ Validation at UI and API levels
- ✅ Real deployment to agents table
- ✅ Proper error handling
- ✅ Loading states
- ✅ Navigation flow
- ✅ URL state management

All builder state lives in the database. The frontend is purely a view layer that reads from and writes to the backend. No builder state is stored in localStorage or React state alone.
