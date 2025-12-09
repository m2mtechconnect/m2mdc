# Unified Intake System - Visual Architecture

## Before (Scattered Logic)

```
Dashboard URL Input ──────┐
                          │
Dashboard File Upload ────┼──> Custom logic in each component
                          │    - Different navigation
Dashboard Questionnaire ──┼──> - Different session creation
                          │    - Different analytics
Template (Dashboard) ─────┼──> - Different error handling
                          │    - Inconsistent state management
Template (Marketplace) ───┼──>
                          │
Builder Step 2 Upload ────┘
```

**Problems**:
- ❌ 7+ different code paths to builder
- ❌ Each component handles conversion differently
- ❌ Duplicate session creation logic
- ❌ Inconsistent analytics tracking
- ❌ State cross-contamination (Template A → Template B)
- ❌ Hard to maintain and debug

---

## After (Unified Service)

```
┌─────────────────────────────────────────────────────────────┐
│                     INTAKE SOURCES                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📱 Dashboard    📄 File        ❓ Questionnaire  📋 Template │
│     URL Input       Upload          Wizard          Select  │
│                                                             │
└────────┬──────────────┬──────────────┬──────────────┬──────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │                               │
              │  startBuilderFromIntake()     │
              │  (SINGLE ENTRY POINT)         │
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
         ┌────────────────────┴────────────────────┐
         │                                         │
    ┌────▼────┐          ┌────────▼────────┐    ┌─▼──────┐
    │ Convert │          │ Create/Update   │    │ Track  │
    │   to    │ ────────▶│     Session     │───▶│ & Store│
    │Blueprint│          │  (agent_drafts) │    │        │
    └─────────┘          └─────────────────┘    └────┬───┘
                                                      │
                                                      ▼
                                           ┌──────────────────┐
                                           │   Navigate to    │
                                           │  Builder (Step 1)│
                                           └──────────────────┘
```

**Benefits**:
- ✅ 1 unified code path
- ✅ Consistent blueprint conversion
- ✅ Smart session management (create vs update)
- ✅ Standardized analytics
- ✅ No state cross-contamination
- ✅ Easy to test and maintain

---

## Data Flow Detail

### 1. Intake Payload → Blueprint

```
Template
  ├─ Load from JSON/DB
  ├─ Extract: name, description, industry, department
  ├─ Map: model config, workflow, integrations
  └─ Return: AgentBlueprint

File Upload (Gemini Analysis)
  ├─ Fetch: document_analysis_jobs result
  ├─ Extract: detected industry, department, KPIs
  ├─ Generate: system prompt, workflow suggestions
  └─ Return: AgentBlueprint

Questionnaire
  ├─ Parse: form answers (industry, department, goals)
  ├─ Derive: agent type, risk level, integrations
  ├─ Generate: intelligent defaults
  └─ Return: AgentBlueprint

URL Input
  ├─ Parse: URL domain
  ├─ Create: minimal blueprint
  ├─ Add: URL to knowledge sources
  └─ Return: AgentBlueprint
```

### 2. Blueprint → Session

```
Create New Session
  ├─ INSERT into agent_drafts
  ├─ Store: blueprint, metadata, step_completed
  └─ Return: session.id

Update Existing Session (e.g., file upload in Step 2)
  ├─ GET existing session
  ├─ MERGE: new blueprint + existing data
  │   ├─ Preserve: source, templateId
  │   ├─ Merge: knowledge sources (documents, URLs)
  │   └─ Update: system prompt if better
  ├─ UPDATE agent_drafts
  └─ Return: updated session
```

### 3. Session → Builder

```
Session Data
  ├─ Store in: useBlueprintStore (Zustand)
  ├─ Track: analytics events
  ├─ Generate: /builder?session={id}&step=1
  └─ Navigate: to Builder
```

---

## Session Management Logic

### Scenario A: New Template Selection

```
User: Clicks "Use Template" on Building Permit Twin
  ↓
startBuilderFromTemplate('building-permit', user.id, 'marketplace')
  ↓
Creates NEW session
  ↓
Navigates to: /builder?session=abc123&step=1
```

### Scenario B: File Upload in Dashboard

```
User: Uploads PDF → Gemini analyzes → Returns jobId
  ↓
startBuilderFromFile(jobId, user.id)
  ↓
Creates NEW session with analysis data
  ↓
Navigates to: /builder?session=def456&step=1
```

### Scenario C: File Upload in Builder Step 2

```
User: Already in builder (session xyz789)
      Uploads additional document
  ↓
startBuilderFromFile(jobId, user.id, 'xyz789')  ← Passes existing session
  ↓
UPDATES existing session xyz789
  ├─ Merges document into knowledge.documents[]
  ├─ Updates system prompt if analysis provides better one
  └─ Keeps original templateId and source
  ↓
Stays on: /builder?session=xyz789&step=2
```

### Scenario D: Template A → Template B

```
User: In builder with Template A (session aaa111)
      Clicks "Change Template" → Selects Template B
  ↓
startBuilderFromTemplate('template-b', user.id)
  ├─ forceNew: true  ← Forces new session
  └─ Creates NEW session bbb222
  ↓
Navigates to: /builder?session=bbb222&step=1
  └─ Template A session (aaa111) remains in database
      (can be accessed from drafts list)
```

---

## Error Handling Flow

```
startBuilderFromIntake(payload)
  │
  ├─ Validate payload
  │   └─ Missing required fields? → Return { success: false, error }
  │
  ├─ Convert to blueprint
  │   └─ Conversion failed? → Return { success: false, error }
  │
  ├─ Create/Update session
  │   └─ Database error? → Return { success: false, error }
  │
  └─ Success → Return { 
      success: true, 
      sessionId, 
      blueprint, 
      builderUrl 
    }
```

**UI Handling**:
```typescript
const result = await startBuilderFromTemplate(templateId, userId);

if (result.success) {
  navigate(result.builderUrl);  // ✅ Success
  toast.success('Builder loaded');
} else {
  toast.error(result.error);     // ❌ Error with clear message
}
```

---

## State Synchronization

Three layers of state, all kept in sync:

```
1. Database (agent_drafts)
   └─ Persistent session data
       └─ Survives page reload
       └─ Accessible from drafts list
       └─ Can be shared/exported

2. Blueprint Store (Zustand + localStorage)
   └─ Current blueprint for UI hydration
       └─ Fast access for components
       └─ Persisted across page reloads
       └─ Cleared when session ends

3. Wizard Builder Store (Zustand)
   └─ 5-step wizard UI state
       └─ Current step, completed steps
       └─ Form field values
       └─ Loading/error states
```

**Synchronization Points**:
- Session Create → Update all 3 stores
- Session Update → Update all 3 stores
- Step Complete → Update step_completed in database
- Blueprint Change → Mark as dirty, auto-save

---

## Analytics Events

Tracked automatically by unified service:

```
startBuilderFromIntake()
  ├─ trackIntakeComplete(blueprint)
  │   └─ Events: intake.complete
  │   └─ Properties: source, industry, department, hasWorkflow
  │
  └─ trackBuilderOpened(blueprint, step)
      └─ Events: builder.opened
      └─ Properties: source, startStep, blueprintCompleteness
```

**Full Funnel**:
```
1. intake.started      (when user initiates intake)
2. intake.progress     (during multi-step flows like questionnaire)
3. intake.complete     (when blueprint created) ← Tracked by unified service
4. builder.opened      (when navigated to builder) ← Tracked by unified service
5. builder.step_complete  (as user progresses)
6. builder.deployed    (when agent is deployed)
```

---

## Extension Points

Adding a new intake source is simple:

```typescript
// 1. Add to IntakeSource type
export type IntakeSource = 
  | 'url' 
  | 'file' 
  | 'questionnaire' 
  | 'template'
  | 'email'  // ← New source

// 2. Add converter
function emailToBlueprint(email: Email): AgentBlueprint {
  return {
    source: 'email',
    name: `Agent for ${email.subject}`,
    description: email.body,
    // ... map email data to blueprint
  };
}

// 3. Add case to convertToBlueprint()
case 'email': {
  return emailToBlueprint(payload.emailData);
}

// 4. Add helper function
export function startBuilderFromEmail(
  emailId: string,
  userId: string
): Promise<IntakeResult> {
  return startBuilderFromIntake({
    source: 'email',
    userId,
    emailId,
  });
}

// Done! ✅
```

---

**Status**: Phase 1 Complete ✅  
**Visual Architecture**: Unified & Simplified  
**Next**: Phase 2 - Refactor UI components
