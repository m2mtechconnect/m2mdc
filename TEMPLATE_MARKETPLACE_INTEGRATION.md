# Template Marketplace → Builder Integration

## Overview

This document describes the unified template selection flow that ensures **all templates**, regardless of where they're selected, follow a **single canonical pathway** into the 5-step Builder.

## Architecture

### Single Entry Point

All template selections use one function: **`openBuilderWithTemplate()`**

```typescript
openBuilderWithTemplate(
  template: any,              // Template from marketplace/database
  sourceEntry: TemplateSourceEntry,  // Where it was selected from
  navigate: NavigateFunction,        // React Router navigate
  onSuccess?: () => void             // Optional callback
)
```

### Template Selection Sources

Templates can be selected from three places:

1. **Dashboard** - "Start with a template" button
2. **Marketplace Page** - Full marketplace browser
3. **Builder Step 2** - Template selection within builder

All use the same `openBuilderWithTemplate()` function with different `sourceEntry` values:
- `"dashboard"` - From dashboard entry
- `"marketplace"` - From marketplace page
- `"builder"` - From builder Step 2

## Data Flow

### Flow 1: Button/Click Selection

```
Template Object
    ↓
templateToBlueprint(template, sourceEntry)
    ↓
AgentBlueprint (unified format)
    ↓
Store in blueprintStore
    ↓
Navigate to /builder?step=1
    ↓
Builder hydrates from blueprint
    ↓
User reviews/modifies Steps 1-5
    ↓
Deploy
```

### Flow 2: Direct URL Navigation

```
URL: /builder?templateId=<id>&step=1
    ↓
wizardBuilderStore.initializeBuilder() detects templateId
    ↓
Load from JSON (loadAllTemplates) or Database (industry_templates)
    ↓
templateToBlueprint(template, 'marketplace')
    ↓
AgentBlueprint (unified format)
    ↓
Store in blueprintStore
    ↓
Builder hydrates from blueprint
    ↓
User reviews/modifies Steps 1-5
    ↓
Deploy
```

## Implementation Details

### 1. Template to Blueprint Conversion

**File**: `src/lib/builder/templateToBlueprint.ts`

Maps template JSON to `AgentBlueprint`, supporting **both database schema and JSON file schema**:

```typescript
export function templateToBlueprint(
  template: any,
  sourceEntry: TemplateSourceEntry = "marketplace"
): AgentBlueprint
```

**Database Schema Mappings** (from `industry_templates` table):
- Template `name` → Blueprint `name`
- Template `description` → Blueprint `description`
- Template `industry` → Blueprint `industry`
- Template `default_config.department` → Blueprint `department`
- Template `default_config.goals` → Blueprint `goals`
- Template `roi_pct` → Blueprint `expectedRoi`
- Template `default_config.selectedModel` → Blueprint `model.modelName`
- Template `default_config.systemPrompt` → Blueprint `behavior.systemPrompt`
- Template `default_config.connectors` → Blueprint `tools.recommendedIntegrations`
- Template `default_config.workflowNodes` → Blueprint `workflow.triggers/actions`

**JSON File Schema Mappings** (from `digital-twin-blueprints-*.json` files):
- Template `twin_type` → Blueprint `type`
- Template `roi_hint` → Blueprint `expectedRoi`
- Template `blueprint.kpis` → Blueprint `goals` (formatted as "{name}: {target}{unit}")
- Template `blueprint.integrations` → Blueprint `tools.recommendedIntegrations`
- Template `blueprint.workflow_steps` → Blueprint `workflow.actions`
- Template `llm.model` → Blueprint `model.modelName`
- Template `llm.provider` → Blueprint `model.provider`
- Template `llm.temperature` → Blueprint `model.temperature`
- Template `system_prompt` → Blueprint `behavior.systemPrompt`
- Template `metrics_defaults` → Calculated `timeSavedPerWeek`

**Special Fields**:
- `source: "template"` - Always set for templates
- `sourceEntry` - Tracks where template was selected from
- `templateId` - Original template ID
- `templateName` - Original template name
- `certified`, `rating`, `downloads` - Template metadata

### 2. Unified Entry Function

**File**: `src/lib/builder/openBuilderWithTemplate.ts`

Single entry point for all template selections:

```typescript
export function openBuilderWithTemplate(
  template: any,
  sourceEntry: TemplateSourceEntry,
  navigate: ReturnType<typeof useNavigate>,
  onSuccess?: () => void
)
```

**What it does**:
1. Converts template to `AgentBlueprint` via `templateToBlueprint()`
2. Stores blueprint in `blueprintStore` for Builder to hydrate from
3. Tracks analytics events:
   - `template.use_template` - Template selected
   - `agent_intake.completed` - Blueprint created
   - `agent_intake.builder_opened` - Builder opened
4. Navigates to `/builder?step=1`
5. Shows success toast
6. Calls optional success callback

**Hook version**:
```typescript
const openBuilderWithTemplate = useOpenBuilderWithTemplate();
openBuilderWithTemplate(template, 'marketplace');
```

### 3. Marketplace Components

Both marketplace components use the unified function:

**IndustryMarketplace.tsx** (Full marketplace page):
```typescript
const openBuilderWithTemplate = useOpenBuilderWithTemplate();

const handleUseTemplate = (template: any) => {
  openBuilderWithTemplate(template, "marketplace", () => {
    onSelectTemplate?.(template);
  });
};
```

**IndustryMarketplaceStep.tsx** (Builder Step 2):
```typescript
const openBuilderWithTemplate = useOpenBuilderWithTemplate();

const handleUseTemplate = (template: any) => {
  const sourceEntry = prefillTemplateId ? 'marketplace' : 'builder';
  openBuilderWithTemplate(template, sourceEntry, () => {
    onSelectTemplate(template);
  });
};
```

### 4. Builder Hydration

**File**: `src/components/builder/steps/Step1Summary.tsx`

Shows template source indicator:

```tsx
{currentBlueprint?.source === 'template' && (
  <Badge>
    Started from template: {currentBlueprint.templateName}
  </Badge>
)}
```

All builder steps read from `useBlueprintStore()`:
- **Step 1**: Name, description, goals, ROI metrics, industry, department
- **Step 2**: Model config, system prompt, knowledge sources
- **Step 3**: Recommended integrations (pre-selected)
- **Step 4**: Workflow triggers and actions (auto-generated)
- **Step 5**: Summary and deployment

## UI/UX Guidelines

### Template Cards

All "Use Template" buttons must:
- Use same button text: "Use Template"
- Use same icon: `<Sparkles />`
- Call `openBuilderWithTemplate()`
- Show consistent metadata:
  - Industry badge
  - Certified badge (if applicable)
  - Rating stars
  - ROI percentage
  - Download count

### No Direct Deploy

Templates MUST go through Builder:
- ❌ No "Deploy" button on template cards
- ✅ Only "Use Template" button
- ✅ User reviews/modifies in Builder before deploy

### Template Source Indicator

Builder Step 1 shows:
- Badge with template name
- "Started from template: {name}"
- Certified indicator if applicable
- Tooltip with source entry location

## Error Handling

### Template Load Failures

```typescript
try {
  openBuilderWithTemplate(template, sourceEntry, navigate);
} catch (error) {
  toast.error('Failed to load template', {
    description: 'Please try another template or contact support.',
  });
}
```

### Missing Template Fields

`templateToBlueprint()` provides defaults:
- Empty arrays for missing collections
- Default model: `google/gemini-2.5-flash`
- Default temperature: `0.7`
- Empty workflow if not provided

### Navigation Failures

If navigation fails, blueprint is still stored. User can:
- Refresh page
- Navigate manually to `/builder`
- Blueprint will be restored from localStorage

## Analytics Tracking

### Events Tracked

1. **`template.use_template`**
   - When: User clicks "Use Template"
   - Data: `templateId`, `templateName`, `sourceEntry`, `industry`, `certified`

2. **`agent_intake.completed`**
   - When: Blueprint created from template
   - Data: Blueprint completeness score, source, fields populated

3. **`agent_intake.builder_opened`**
   - When: Builder opens with template
   - Data: Source, start step, blueprint completeness

### Analytics Flow

```typescript
openBuilderWithTemplate(template, sourceEntry)
  ↓
trackEvent('template.use_template', {...})
  ↓
trackIntakeComplete(blueprint)
  ↓
trackBuilderOpened(blueprint, 1)
```

## Testing

### Unit Tests

**File**: `tests/unit/open-builder-with-template.test.ts`

Tests:
- Template to blueprint conversion
- Blueprint storage
- Navigation
- Analytics tracking
- Different source entries
- Error handling

### E2E Tests

**File**: `tests/e2e/intake-template-unified.spec.ts`

Tests:
- Marketplace → Builder flow
- Builder Step 2 → Builder flow
- Source entry tracking
- UI consistency
- Error scenarios
- Multiple template selection
- Template metadata persistence

### Running Tests

```bash
# Unit tests
npm run test:unit open-builder-with-template

# E2E tests
npx playwright test intake-template-unified

# All template tests
npm run test:unit -- blueprint-converters
npx playwright test intake-template
```

## Migration Guide

### Old Code (DON'T DO THIS)

```typescript
❌ // Direct blueprint creation
const blueprint = templateToBlueprint(template);
trackIntakeComplete(blueprint);
trackBuilderOpened(blueprint, 1);
openBuilderWithBlueprint(blueprint, 1);

❌ // Multiple entry points
handleUseTemplate(template) {
  // Custom logic here
  navigate('/builder');
}
```

### New Code (DO THIS)

```typescript
✅ // Single unified entry point
const openBuilderWithTemplate = useOpenBuilderWithTemplate();

handleUseTemplate(template) {
  openBuilderWithTemplate(template, 'marketplace');
}
```

## Troubleshooting

### Template not loading in Builder

**Check**:
1. Blueprint stored in `blueprintStore`?
2. Console logs from `openBuilderWithTemplate` or `initializeBuilder` - look for:
   - `templateId` detected in URL params
   - Template loaded from JSON or database
   - `blueprintName` matches template name
   - `hasDefaultConfig` is true
   - `hasGoals` > 0
   - `hasWorkflow` > 0
3. Navigation URL includes `?step=1`?
4. Edge function includes `default_config` in query?

**Fix**:
```typescript
// Check store
const blueprint = useBlueprintStore.getState().currentBlueprint;
console.log('Current blueprint:', blueprint);

// Check if edge function fetches default_config
// File: supabase/functions/catalog-templates-industry/index.ts
// Should include 'default_config' in select statement
```

### URL Parameter Loading (`?templateId=...`)

**New Feature**: Builder now supports loading templates directly via URL parameter.

**URL Format**: `/builder?templateId=<template-id>&step=1`

**How it works**:
1. `wizardBuilderStore.initializeBuilder()` detects `templateId` param
2. Loads template from JSON files via `loadAllTemplates()`
3. Falls back to database query if not in JSON
4. Converts to blueprint via `templateToBlueprint()`
5. Stores in `blueprintStore` for consistent access
6. Hydrates builder with template data

**Debugging**:
```typescript
// Check console for these logs:
// "🔍 [STORE] templateId detected in URL"
// "✅ [STORE] Template loaded - converting to blueprint"
// "🎯 [STORE] Blueprint detected - hydrating from blueprint"

// If template not found:
// "⚠️ [STORE] Template not found: <template-id>"
// "❌ [STORE] Error loading template"
```

### Generic "Process Twin" showing instead of template name

**Cause**: Template data missing or `default_config` not fetched

**Fix**: 
1. Ensure edge function queries include `default_config`:
   ```typescript
   .select('id, name, description, industry, tags, roi_pct, rating, downloads, certified, hero_icon, thumbnail_url, sample_prompts, kpi_definitions, default_config')
   ```
2. Check console logs for `hasDefaultConfig: true`
3. Verify `templateToBlueprint` receives full template object

### Template shows wrong capabilities/tools

**Cause**: Mapping logic doesn't handle JSON file schema

**Fix**: `templateToBlueprint` now supports both schemas:
- Database schema: Uses `default_config.*` fields
- JSON file schema: Uses `blueprint.*` and `llm.*` fields
- Falls back gracefully when fields are missing

### Analytics not tracking

**Check**:
1. Console for `[Telemetry]` logs
2. Network tab for analytics requests

**Fix**: Ensure all three tracking functions are called in `openBuilderWithTemplate()`

## Future Enhancements

### Planned Features

1. **Template versioning**: Track which version of template was used
2. **Template customization tracking**: Record which fields user modified
3. **Template effectiveness**: Track deployment success rates per template
4. **Template recommendations**: Suggest templates based on user's previous selections

### Extensibility

To add new template source:

1. Add to `TemplateSourceEntry` type:
```typescript
export type TemplateSourceEntry = "dashboard" | "marketplace" | "builder" | "new-source";
```

2. Use `openBuilderWithTemplate()`:
```typescript
openBuilderWithTemplate(template, 'new-source', navigate);
```

3. Update analytics if needed

## References

- **Blueprint Type**: `src/types/agentBlueprint.ts`
- **Template Converter**: `src/lib/builder/templateToBlueprint.ts`
- **Unified Entry**: `src/lib/builder/openBuilderWithTemplate.ts`
- **Marketplace Components**: `src/components/builder/IndustryMarketplace*.tsx`
- **Builder Steps**: `src/components/builder/steps/`
- **Tests**: `tests/unit/open-builder-with-template.test.ts`, `tests/e2e/intake-template-unified.spec.ts`
