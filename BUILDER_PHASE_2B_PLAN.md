# Phase 2B: Merge Integrations - Execution Plan

**Status**: Ready for Implementation  
**Estimated Effort**: 15-20 file changes, 2-3 hours  
**Dependencies**: Phase 2A (State Management) ✅ Complete

---

## Executive Summary

**Problem**: Duplicate integration UIs across 3 locations (Integrations page, Connect page redirect, Builder Step 3 placeholder). No connection between them.

**Solution**: Delete Connect page, consolidate integration catalog into Builder Step 3, add proper Zapier/OAuth flows.

**Impact**: Single source of truth for integrations, seamless builder experience, proper state persistence.

---

## Pre-Flight Checklist

Before starting:
- ✅ Phase 2A complete (Zustand store, autosave, database persistence)
- ✅ `system_builder_state` table exists
- ✅ Builder state management working
- ⚠️ User should be aware this is a large refactor (backup recommended)

---

## File Operations

### DELETE (3 files)
```
❌ src/pages/Connect.tsx (13 lines)
   - Reason: Only redirects to /integrations, no unique functionality

❌ src/components/connect/FieldMapper.tsx (130 lines)
   - Reason: Duplicate of integrations/FieldMapper.tsx
   - Note: integrations/ version is more complete

❌ Route in src/App.tsx
   - Remove: <Route path="/connect" element={<Connect />} />
```

### KEEP (No changes needed)
```
✅ src/pages/Integrations.tsx (828 lines)
   - Will be reused/embedded in Builder Step 3

✅ src/components/integrations/IntegrationCard.tsx (209 lines)
   - Reusable component with state management

✅ src/components/integrations/ZapierConnectModal.tsx (314 lines)
   - 3-step Zapier wizard (template → auth → schedule)

✅ src/components/integrations/FieldMapper.tsx
   - Canonical field mapping component

✅ src/components/integrations/IntegrationDrawer.tsx
   - Configuration drawer for native integrations

✅ src/components/connect/DataHealthKPI.tsx
✅ src/components/connect/JobDetailsDrawer.tsx
✅ src/components/connect/JobMonitor.tsx
✅ src/components/connect/SyncTable.tsx
✅ src/components/connect/ZapRunLog.tsx
✅ src/components/connect/ZapTemplateList.tsx
   - All used by ConnectHealth/ConnectMonitor pages (monitoring)
```

### CREATE (3 new files)
```
📝 src/components/builder/ConnectStep.tsx (350-400 lines)
   - New Step 3 component with tabs: AI/LLM, Business Tools, Knowledge Sources
   - Embeds IntegrationCard grid for Business Tools
   - UploadZone + URL Capture for Knowledge
   - Connected to Zustand store

📝 src/components/builder/KnowledgeSourcesList.tsx (150-200 lines)
   - Display indexed knowledge sources with status
   - Progress indicators (Queued → Ingesting → Indexed)
   - Delete/refresh actions

📝 supabase/migrations/[timestamp]_add_system_integrations.sql
   - Junction table linking systems to integrations
   - RLS policies for user access
```

### REFACTOR (2 files)
```
🔄 src/pages/Builder.tsx
   - Replace Step 3 (lines 515-598) with <ConnectStep />
   - Remove hardcoded tool buttons
   - Import ConnectStep component

🔄 src/App.tsx
   - Remove /connect route
   - Remove Connect import
```

---

## Database Changes

### Migration: system_integrations Junction Table

**Purpose**: Link systems (agents) to integrations with role metadata

**Schema**:
```sql
CREATE TABLE public.system_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'source' | 'destination' | 'notification'
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(system_id, integration_id)
);
```

**Indexes**:
- `idx_system_integrations_system_id`
- `idx_system_integrations_integration_id`

**RLS Policies**:
- Users can view/manage integrations for systems they own
- System ownership derived from agents.owner_id

---

## ConnectStep Component Design

### Tab Structure
```
┌─────────────────────────────────────────────┐
│ [AI & Models] [Business Tools] [Knowledge]  │
├─────────────────────────────────────────────┤
│                                             │
│  Tab 1: AI & Models (Preview Only)         │
│  ├─ Model Marketplace (read-only)          │
│  └─ Note: "Configure in Step 4"            │
│                                             │
│  Tab 2: Business Tools                     │
│  ├─ IntegrationCard Grid                   │
│  │  ├─ Salesforce (Zapier)                 │
│  │  ├─ SAP (Zapier)                        │
│  │  ├─ Jira (Zapier)                       │
│  │  ├─ Teams (Zapier)                      │
│  │  ├─ Slack (Zapier)                      │
│  │  └─ ServiceNow (Zapier)                 │
│  └─ On click → ZapierConnectModal          │
│                                             │
│  Tab 3: Knowledge Sources                  │
│  ├─ UploadZone (files → Supabase Storage) │
│  ├─ URL Capture Form                       │
│  └─ KnowledgeSourcesList (status)          │
│     ├─ file.pdf (Indexed) ✓                │
│     ├─ https://... (Ingesting) ⏳          │
│     └─ doc.docx (Failed) ✗                 │
│                                             │
└─────────────────────────────────────────────┘
```

### Props Interface
```typescript
interface ConnectStepProps {
  systemId: string | null;
}

// Component reads from Zustand:
const state = useBuilderStore((state) => state.state);
const setState = useBuilderStore((state) => state.setState);

// Updates trigger autosave (500ms debounce)
```

### Integration Catalog Filter
```typescript
// Show only relevant integrations for Step 3
const businessToolsIntegrations = integrations.filter(
  i => ['CRM', 'ERP', 'Project Management', 'Communication', 'ITSM'].includes(i.category)
);
```

---

## User Flow Examples

### Flow 1: Connect Salesforce (Zapier)
```
1. User navigates to Builder Step 3
2. Clicks "Business Tools" tab
3. Clicks Salesforce card → "Connect via Zapier"
4. ZapierConnectModal opens (3 steps):
   Step 1: Pick template ("New Record → Index")
   Step 2: Auth + Field Mapping
   Step 3: Schedule (Real-time / 5min / Hourly)
5. User clicks "Create & Activate Zap"
6. Backend flow:
   - Create record in integrations table
   - Create record in system_integrations
   - Update Zustand: setState({ connectors: [..., newConnector] })
   - Autosave triggers → saves to system_builder_state
7. UI updates: Salesforce card shows "Connected" badge
8. Toast: "Salesforce connected successfully"
```

### Flow 2: Upload Knowledge Source
```
1. User navigates to Builder Step 3
2. Clicks "Knowledge" tab
3. Drags PDF into UploadZone
4. File uploads to Supabase Storage
5. Call ingest-file edge function
6. Create record in knowledge_sources table
7. Update Zustand: setState({ knowledgeSources: [..., { id, type: 'file', status: 'ingesting' }] })
8. Autosave triggers
9. Poll status every 2s until status='indexed'
10. UI updates: Progress bar → "Indexed ✓"
11. Toast: "file.pdf indexed successfully"
```

### Flow 3: URL Capture
```
1. User pastes URL: https://docs.example.com/guide
2. Clicks "Capture"
3. Call url-capture edge function
4. Function renders page, extracts content
5. Store in captured_pages table
6. Trigger knowledge-index function
7. Create knowledge_source record
8. Update Zustand state
9. Autosave triggers
10. Show in KnowledgeSourcesList with status
```

---

## Validation Rules

### Step 3 Validation (Conditional)
```typescript
const validateStep3 = (state: BuilderState, template: Template) => {
  const errors: string[] = [];

  // If template requires grounding, check knowledge sources
  if (template.requiresGrounding) {
    const indexedSources = state.knowledgeSources.filter(
      s => s.status === 'indexed'
    );
    
    if (indexedSources.length === 0) {
      errors.push("At least 1 indexed knowledge source required for this template");
    }
  }

  // If template requires business system, check connectors
  if (template.requiredIntegrations?.length > 0) {
    const connected = state.connectors.filter(c => c.status === 'connected');
    const requiredIds = template.requiredIntegrations.map(r => r.id);
    const hasRequired = requiredIds.every(id => 
      connected.some(c => c.provider === id)
    );
    
    if (!hasRequired) {
      errors.push(`Template requires: ${template.requiredIntegrations.map(r => r.name).join(', ')}`);
    }
  }

  return errors;
};
```

**Validation Triggers**:
- On "Continue" button click
- Real-time as integrations connect
- Visual indicators: ✅ Complete | ⚠️ Incomplete | ⭕ Not Started

---

## Error Handling

### Connection Errors
```typescript
try {
  const { data, error } = await supabase.functions.invoke('integrations-connect', {
    body: { provider: 'salesforce', config: zapConfig }
  });
  
  if (error) throw error;
  
  // Success flow...
} catch (error) {
  console.error('Connection failed:', error);
  
  toast({
    title: "Connection failed",
    description: error instanceof Error ? error.message : "Unknown error",
    variant: "destructive",
    action: (
      <Button size="sm" onClick={retryConnection}>
        Retry
      </Button>
    ),
  });
  
  // Update state to show error
  setState({
    connectors: state.connectors.map(c => 
      c.provider === 'salesforce' 
        ? { ...c, status: 'error', errorMessage: error.message }
        : c
    )
  });
}
```

### Knowledge Indexing Errors
```typescript
// Poll status with max retries
const pollIndexStatus = async (sourceId: string, maxRetries = 60) => {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data, error } = await supabase
      .from('knowledge_sources')
      .select('status, error_message')
      .eq('id', sourceId)
      .single();
    
    if (error) throw error;
    
    if (data.status === 'indexed') return 'success';
    if (data.status === 'failed') {
      throw new Error(data.error_message || 'Indexing failed');
    }
  }
  
  throw new Error('Indexing timeout (exceeded 2 minutes)');
};
```

---

## Testing Checklist

### Unit Tests
- [ ] ConnectStep renders 3 tabs
- [ ] IntegrationCard grid filters by category
- [ ] ZapierConnectModal wizard completes
- [ ] Knowledge source upload triggers API
- [ ] URL capture validates URL format
- [ ] Validation detects missing required sources

### Integration Tests
- [ ] Zapier OAuth flow (mocked)
- [ ] File upload → indexing → status update
- [ ] URL capture → parsing → indexing
- [ ] system_integrations table creation
- [ ] RLS policies enforce ownership

### E2E Tests (Playwright)
```typescript
// tests/e2e/builder-connect-step.spec.ts
test('Connect Salesforce via Zapier', async ({ page }) => {
  await page.goto('/builder?step=3');
  await page.click('[data-tab="business"]');
  await page.click('[data-integration="salesforce"]');
  // ... complete Zapier flow
  await expect(page.locator('[data-badge="connected"]')).toBeVisible();
});

test('Upload PDF knowledge source', async ({ page }) => {
  await page.goto('/builder?step=3');
  await page.click('[data-tab="knowledge"]');
  await page.setInputFiles('#file-upload', 'test.pdf');
  await page.waitForSelector('[data-status="indexed"]', { timeout: 30000 });
});

test('Validation blocks step if grounding required', async ({ page }) => {
  // Select template requiring grounding
  await page.goto('/builder?step=2');
  await page.click('[data-template="compliance"]');
  await page.click('text=Continue');
  
  // Step 3: Try to continue without knowledge sources
  await page.click('text=Continue');
  await expect(page.locator('text=At least 1 indexed knowledge source required')).toBeVisible();
});
```

---

## Rollback Plan

**If something breaks:**

1. Revert Builder.tsx Step 3 changes
2. Keep Connect.tsx redirect (don't delete yet)
3. Use feature flag to toggle new ConnectStep:
   ```typescript
   const useNewConnectStep = false; // Toggle this
   
   case 3:
     return useNewConnectStep ? (
       <ConnectStep systemId={systemId} />
     ) : (
       // Old placeholder UI
     );
   ```

4. Database migrations are additive (safe to rollback)
5. No data loss - old localStorage backup preserved

---

## Success Criteria

### Functional
- ✅ Connect page deleted, redirect removed
- ✅ Builder Step 3 shows integration catalog
- ✅ Zapier OAuth flow completes successfully
- ✅ Knowledge sources upload and index
- ✅ State persists to Supabase
- ✅ Validation enforces template requirements
- ✅ Error handling shows actionable messages

### Technical
- ✅ No console errors
- ✅ Autosave triggers within 500ms
- ✅ Database queries use proper RLS
- ✅ All E2E tests pass
- ✅ No duplicate components remain

### User Experience
- ✅ Single integration hub (no confusion)
- ✅ Real-time status updates
- ✅ Clear progress indicators
- ✅ WCAG 2.1 AA compliant
- ✅ Responsive at 390/768/1280px

---

## Next Steps After Completion

Once Phase 2B is complete:

**Immediate:**
- Update BUILDER_AUDIT.md checklist
- Mark Phase 2B as ✅ Complete
- Run full E2E test suite

**Phase 2C: Validation Framework**
- Step-by-step validation functions
- Fix links for errors
- Visual completion indicators

**Phase 2D: Template Prefill**
- Auto-populate Steps 3-5 from template
- Show "Prefilled by Template" badges

---

## Questions for User

Before proceeding with implementation:

1. **Backup**: Should we create a git branch first?
2. **Feature Flag**: Use feature flag for gradual rollout?
3. **Testing**: Run tests before or after each major change?
4. **Monitoring**: Any specific monitoring/analytics to add?

---

**Ready to proceed? Confirm and I'll start with the deletions, then create ConnectStep component.**
