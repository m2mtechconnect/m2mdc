# Intake Flows Unification - Comprehensive Audit & Plan

**Date**: 2025-11-29  
**Status**: ✅ **Phase 1 Complete - Core Unified Service Implemented**  
**Updated**: 2025-11-29

---

## Current State Analysis

### ✅ What's Already Working

1. **Blueprint Type System**
   - ✅ `AgentBlueprint` type exists (`src/types/agentBlueprint.ts`)
   - ✅ Unified structure for all intake types
   - ✅ Source tracking: `"template" | "url" | "file" | "questionnaire"`

2. **Converter Functions** (Individual intake → Blueprint)
   - ✅ `templateToBlueprint()` - Templates → Blueprint
   - ✅ `documentAnalysisToBlueprint()` - File analysis → Blueprint
   - ✅ `questionnaireToBlueprint()` - Questionnaire → Blueprint

3. **Blueprint Store**
   - ✅ `useBlueprintStore()` - Global blueprint state
   - ✅ Hydrates Builder from blueprint

4. **Entry Points**
   - ✅ `ModernFileUploadWizard` - File upload wizard
   - ✅ `QuestionnaireWizard` - Questionnaire wizard
   - ✅ `TemplateLibraryModal` - Template selection
   - ✅ `openBuilderWithTemplate()` - Unified template entry

5. **Analytics Tracking**
   - ✅ `trackIntakeStart()`, `trackIntakeComplete()`, `trackBuilderOpened()`
   - ✅ Tracks all intake sources

### ❌ What's Missing / Broken

1. **NO Single Unified Service**
   - ❌ Each intake flow has its own navigation logic
   - ❌ No `startBuilderFromIntake(payload)` unified function
   - ❌ Duplicate code across entry points

2. **URL Intake Not Unified**
   - ❌ Dashboard URL input uses separate flow
   - ⚠️  May not create blueprint consistently
   - ⚠️  URL recommendations flow is separate

3. **Builder Session Management Unclear**
   - ⚠️  Multiple stores: `wizardBuilderStore` + `blueprintStore`
   - ⚠️  Session ID handling inconsistent
   - ⚠️  No clear "update existing session" vs "create new"

4. **File Upload Issues**
   - ⚠️  `jobId` can be `undefined` causing errors
   - ⚠️  Status polling not robust
   - ⚠️  Performance issues with large files
   - ⚠️  Upload in Builder Step 2 may create new session instead of updating

5. **Template Issues (Partially Fixed)**
   - ✅ Fixed: UUID validation for `template_id`
   - ✅ Fixed: React rendering errors with workflow objects
   - ⚠️  Still: Some templates may show generic "Process Twin"
   - ⚠️  Inconsistent handling of template slugs vs UUIDs

6. **Questionnaire Issues**
   - ⚠️  May not properly derive industry/department
   - ⚠️  ROI/time saved mapping unclear
   - ⚠️  No validation of answer completeness

7. **State Cross-Contamination**
   - ❌ Opening Template A then B may merge data
   - ❌ Uploading doc in template-based builder creates confusion
   - ❌ No clear session reset/replace logic

---

## Proposed Unified Architecture

### Phase 1: Core Unification Service

**File**: `src/lib/intake/unifiedIntakeService.ts`

```typescript
export type IntakeSource = "url" | "file" | "questionnaire" | "template";

export interface UnifiedIntakePayload {
  source: IntakeSource;
  
  // Source-specific data
  templateId?: string;
  urlInput?: string;
  fileJobId?: string;
  questionnaireAnswers?: Record<string, any>;
  
  // Session management
  existingSessionId?: string;  // Update existing session
  forceNew?: boolean;          // Force new session even if one exists
  
  // Metadata
  userId: string;
  metadata?: Record<string, any>;
}

export interface IntakeResult {
  sessionId: string;
  blueprint: AgentBlueprint;
  builderUrl: string;  // URL to navigate to
}

/**
 * SINGLE entry point for all intake flows
 * Converts any intake type → Blueprint → Builder session
 */
export async function startBuilderFromIntake(
  payload: UnifiedIntakePayload
): Promise<IntakeResult> {
  // 1. Convert to blueprint (already have converters)
  const blueprint = await convertToBlueprint(payload);
  
  // 2. Create or update Builder session
  const session = payload.existingSessionId && !payload.forceNew
    ? await updateBuilderSession(payload.existingSessionId, blueprint)
    : await createBuilderSession(blueprint, payload.userId);
  
  // 3. Store in blueprintStore
  useBlueprintStore.getState().setBlueprint(blueprint);
  
  // 4. Track analytics
  trackIntakeComplete(blueprint);
  trackBuilderOpened(blueprint, 1);
  
  // 5. Return result
  return {
    sessionId: session.id,
    blueprint,
    builderUrl: `/builder?session=${session.id}&step=1`
  };
}
```

### Phase 2: Refactor All Entry Points

**Dashboard** (`src/components/HeroSearchBar.tsx`)
```typescript
// URL input
const handleUrlSubmit = async (url: string) => {
  const result = await startBuilderFromIntake({
    source: 'url',
    urlInput: url,
    userId: user.id
  });
  navigate(result.builderUrl);
};

// File upload
<ModernFileUploadWizard 
  onComplete={(jobId) => {
    startBuilderFromIntake({
      source: 'file',
      fileJobId: jobId,
      userId: user.id
    });
  }}
/>

// Questionnaire
<QuestionnaireWizard 
  onComplete={(answers) => {
    startBuilderFromIntake({
      source: 'questionnaire',
      questionnaireAnswers: answers,
      userId: user.id
    });
  }}
/>

// Template
<TemplateLibraryModal 
  onSelect={(template) => {
    startBuilderFromIntake({
      source: 'template',
      templateId: template.id,
      userId: user.id
    });
  }}
/>
```

**Builder Step 2 Upload** (`src/components/builder/steps/Step2Intelligence.tsx`)
```typescript
// When uploading in builder, update existing session
<ModernFileUploadWizard 
  onComplete={(jobId) => {
    startBuilderFromIntake({
      source: 'file',
      fileJobId: jobId,
      userId: user.id,
      existingSessionId: currentSessionId,  // ← Update, don't create new
    });
  }}
/>
```

### Phase 3: Fix File Upload Pipeline

**Issues to Fix**:

1. **`jobId` validation** - Already being worked on
2. **Status polling robustness** - Add exponential backoff, max retries
3. **Performance** - Implement chunking for large files
4. **Error handling** - Clear user-facing messages

**Files to Update**:
- `supabase/functions/document-analysis-start/index.ts`
- `supabase/functions/document-analysis-status/index.ts`
- `src/hooks/useDocumentAnalysis.ts`
- `src/components/dashboard/ModernFileUploadWizard.tsx`

### Phase 4: Fix Session Management

**Current Issues**:
- Two stores: `wizardBuilderStore` (5-step state) + `blueprintStore` (intake data)
- No clear session ID concept
- No "replace vs merge" logic

**Solution**:

1. **Builder Session Table** (database)
   ```sql
   CREATE TABLE builder_sessions (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES auth.users,
     blueprint JSONB,  -- Full AgentBlueprint
     wizard_state JSONB,  -- 5-step wizard state
     source TEXT,  -- intake source
     created_at TIMESTAMP,
     updated_at TIMESTAMP
   );
   ```

2. **Unified Session Service**
   ```typescript
   export async function createBuilderSession(
     blueprint: AgentBlueprint, 
     userId: string
   ): Promise<BuilderSession> {
     const { data } = await supabase
       .from('builder_sessions')
       .insert({ 
         user_id: userId, 
         blueprint, 
         source: blueprint.source 
       })
       .select()
       .single();
     return data;
   }
   
   export async function updateBuilderSession(
     sessionId: string,
     updates: Partial<{ blueprint: AgentBlueprint, wizard_state: any }>
   ): Promise<BuilderSession> {
     const { data } = await supabase
       .from('builder_sessions')
       .update(updates)
       .eq('id', sessionId)
       .select()
       .single();
     return data;
   }
   ```

### Phase 5: End-to-End Testing

**Test Matrix**:

| Entry Point | Test Scenario | Expected Outcome |
|------------|---------------|------------------|
| **Dashboard URL** | Paste company URL | Blueprint created, Builder opens at Step 1 |
| **Dashboard File** | Upload 5MB PDF | Doc analyzed, RAG sources added, Blueprint created |
| **Dashboard Questionnaire** | Complete all questions | Answers → Blueprint with industry/dept/goals |
| **Dashboard Template** | Select "Building Permit" | Template data loads, no "Process Twin" |
| **Marketplace Template** | Select "Inventory Twin" | Same as dashboard, consistent behavior |
| **Builder Step 2 Upload** | Upload doc in existing session | Session updated, no new session created |
| **Template → File** | Start with template, then upload | Template data + file analysis merged |
| **Template A → Template B** | Select A, then B | B replaces A completely |
| **Error: Large file** | Upload 100MB PDF | Clear error, graceful fallback |
| **Error: Failed analysis** | Simulate job failure | User-friendly error, can retry |

---

## Implementation Phases & Priority

### ✅ **Phase 1: Core Service** (COMPLETE)
**Why**: Single source of truth for all intakes  
**Effort**: 2-3 hours  
**Status**: ✅ **COMPLETE**  
**Files Created**:
- ✅ `src/lib/intake/unifiedIntakeService.ts` - Main entry point
- ✅ `src/lib/intake/sessionManager.ts` - Session management
- ✅ `src/lib/intake/types.ts` - Shared types
- ✅ `src/lib/intake/index.ts` - Exports
- ✅ `src/lib/intake/README.md` - Documentation
- ✅ `tests/integration/unified-intake-service.test.ts` - Integration tests

**What Was Built**:
- Single `startBuilderFromIntake()` function that all flows use
- Session management with create/update/get/delete operations
- Unified type system for all intake sources
- Helper functions for each intake type
- Comprehensive documentation and tests

### 🟠 **Phase 2: Entry Points** (High Priority)
**Why**: Ensure all flows use unified service  
**Effort**: 3-4 hours  
**Files**:
- Refactor `src/components/HeroSearchBar.tsx`
- Refactor `src/components/dashboard/ModernFileUploadWizard.tsx`
- Refactor `src/components/dashboard/QuestionnaireWizard.tsx`
- Refactor template selection components

### 🟡 **Phase 3: File Upload** (Medium Priority)
**Why**: Fix existing bugs, improve performance  
**Effort**: 2-3 hours  
**Files**:
- `supabase/functions/document-analysis-start/index.ts`
- `supabase/functions/document-analysis-status/index.ts`
- `src/hooks/useDocumentAnalysis.ts`

### 🟢 **Phase 4: Session Management** (Medium Priority)
**Why**: Prevents state cross-contamination  
**Effort**: 3-4 hours  
**Files**:
- Create `builder_sessions` table migration
- Update `wizardBuilderStore.ts` to use sessions
- Sync `blueprintStore` with sessions

### 🔵 **Phase 5: Testing** (Ongoing)
**Why**: Prevent regressions  
**Effort**: Ongoing  
**Files**:
- Create comprehensive E2E tests
- Manual testing checklist

---

## Quick Wins (Can Start Immediately)

1. ✅ **Fix UUID validation** - Already done
2. ✅ **Fix React rendering errors** - Already done
3. ⚠️  **Add `jobId` validation** - Partially done, needs edge function update
4. 🔲 **Improve error messages** - Can do quickly
5. 🔲 **Add file size warnings** - Can do quickly

---

## Questions for User

Before starting the full refactor, please confirm:

1. **Which phase should we start with?**
   - Option A: Phase 1 (Core Service) - Most impactful but requires refactoring many files
   - Option B: Phase 3 (File Upload Fixes) - Quick wins, fewer changes
   - Option C: Do them all in sequence (4-5 days of work)

2. **Session Management Approach?**
   - Option A: Create `builder_sessions` table (more robust, database-backed)
   - Option B: Use existing `agent_drafts` table (simpler, already exists)
   - Option C: Keep in-memory only with `blueprintStore` (fastest, less persistent)

3. **Breaking Changes OK?**
   - Some refactors may require changes to existing flows
   - Users mid-session may need to start over
   - Can we accept this or need backward compatibility?

4. **Testing Priority?**
   - Manual testing only?
   - Automated E2E tests?
   - Both?

---

## Recommended Approach

**Start with Quick Wins + Phase 1 Core Service**:

1. Week 1: Quick wins + Core unified service
2. Week 2: Refactor entry points (Phase 2)
3. Week 3: Fix file upload + session management (Phase 3 & 4)
4. Week 4: Comprehensive testing (Phase 5)

**Alternatively, for faster iteration**:

1. Fix file upload bugs NOW (Phase 3 - 1 day)
2. Create unified service (Phase 1 - 1 day)
3. Refactor one entry point at a time (Phase 2 - 3 days)
4. Add session management later (Phase 4 - 2 days)

---

## Next Steps

**Please choose**:
- [ ] Implement Phase 1 (Core Service) first
- [ ] Implement Phase 3 (File Upload Fixes) first
- [ ] Implement Quick Wins only
- [ ] Create detailed technical spec for chosen phase
- [ ] Start with manual testing of current state

Once you confirm the priority, I'll create the detailed implementation plan and start building!
