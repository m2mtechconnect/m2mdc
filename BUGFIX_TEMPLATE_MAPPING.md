# Bug Fix: Template → Builder Mapping (Generic "Process Twin" Issue)

## Problem Statement

When selecting "Building Permit Application Processing Twin" (or any template) from the Template Marketplace, the Builder opened with generic "Process Twin for – Process Twin" data instead of the actual template details.

## Root Causes

### 1. Edge Function Missing `default_config`
**File**: `supabase/functions/catalog-templates-industry/index.ts`

The edge function was only fetching basic template fields, excluding the critical `default_config` field:

```typescript
// ❌ BEFORE
.select('id, name, description, industry, tags, roi_pct, rating, downloads, certified, hero_icon, thumbnail_url, sample_prompts, kpi_definitions')

// ✅ AFTER
.select('id, name, description, industry, tags, roi_pct, rating, downloads, certified, hero_icon, thumbnail_url, sample_prompts, kpi_definitions, default_config')
```

### 2. Template Schema Mismatch
**File**: `src/lib/builder/templateToBlueprint.ts`

The converter only supported the database schema (`default_config.*`) but not the JSON file schema used by some templates (`blueprint.*`, `llm.*`, etc.).

Templates in `src/data/templates/digital-twin-blueprints-3.json` use a different structure:

```json
{
  "twin_type": "operational",          // Not "type" in default_config
  "roi_hint": 220,                     // Not "roi_pct"
  "blueprint": {
    "kpis": [...],                     // Not in kpi_definitions
    "integrations": [...],             // Not in default_config.connectors
    "workflow_steps": [...]            // Not in default_config.workflowNodes
  },
  "llm": {
    "model": "gpt-5-mini",             // Not default_config.selectedModel
    "temperature": 0.2
  },
  "system_prompt": "...",              // At root, not in default_config
  "metrics_defaults": {
    "time_saved_per_run_min": 180,
    "runs_per_week": 45
  }
}
```

### 3. Fallback Logic Issues
**File**: `src/components/builder/steps/Step1Summary.tsx`

The Step 1 component had problematic fallbacks that generated generic strings:

```typescript
// ❌ BEFORE - Generic fallback overrode template data
const agentName = currentBlueprint?.name || template || 
  `${type === 'agent' ? 'Agent' : 'Process Twin'} for ${department}`;

// ✅ AFTER - Proper fallback chain
const agentName = currentBlueprint?.name || 
  template || 
  `${type === 'agent' ? 'AI Agent' : 'Process Twin'}${department ? ` for ${department}` : ''}`;
```

## Solution

### 1. Enhanced Edge Function (✅ Fixed)
Added `default_config` to the query in `catalog-templates-industry/index.ts`.

### 2. Dual Schema Support (✅ Fixed)
Updated `templateToBlueprint.ts` to handle both schemas:

```typescript
export function templateToBlueprint(template: any, sourceEntry: TemplateSourceEntry): AgentBlueprint {
  const config = template.default_config || {};
  const blueprint = template.blueprint || {};
  const llm = template.llm || {};
  
  return {
    // Support both schemas
    name: template.name || "",
    type: config.type || template.twin_type || "agent",
    expectedRoi: template.roi_pct ? `${template.roi_pct}%` : 
                 template.roi_hint ? `${template.roi_hint}%` : null,
    
    // Map from either schema
    goals: config.goals || 
           blueprint.kpis?.map(k => `${k.name}: ${k.target}${k.metric === 'percentage' ? '%' : ''}`) || 
           [],
    
    model: {
      modelName: config.selectedModel || llm.model || "google/gemini-2.5-flash",
      temperature: config.temperature ?? llm.temperature ?? 0.7,
    },
    
    behavior: {
      systemPrompt: config.systemPrompt || template.system_prompt || "",
    },
    
    tools: {
      recommendedIntegrations: config.connectors || 
                               blueprint.integrations || 
                               template.connectors?.map(c => c.id || c) || 
                               [],
    },
    
    workflow: {
      actions: config.workflowNodes?.filter(n => n.type === "action") ||
               template.workflow?.nodes?.filter(n => ['action', 'llm', 'integration'].includes(n.type)) ||
               blueprint.workflow_steps?.map(s => ({ name: s.label, type: s.type })) ||
               [],
    },
  };
}
```

### 3. Improved Builder Display (✅ Fixed)
Fixed `Step1Summary.tsx` to:
- Prioritize blueprint data over generic fallbacks
- Display template description correctly
- Show template-specific capabilities and workflows
- Calculate metrics from both schema formats

### 4. Enhanced Logging (✅ Added)
Added detailed logging in `openBuilderWithTemplate.ts`:

```typescript
console.log('[openBuilderWithTemplate] Converting template to blueprint:', {
  templateId: template.id,
  templateName: template.name,
  blueprintName: blueprint.name,
  hasDefaultConfig: !!template.default_config,
  hasGoals: blueprint.goals?.length || 0,
  hasWorkflow: (blueprint.workflow?.triggers?.length || 0) + (blueprint.workflow?.actions?.length || 0),
});
```

## Testing

### Updated Test Fixtures
**File**: `tests/fixtures/templates.ts`

Enhanced fixtures to include both schemas:

```typescript
export const inventoryOptimizationTemplate = {
  // Database schema fields
  default_config: { ... },
  kpi_definitions: { ... },
  
  // JSON file schema fields
  blueprint: {
    kpis: [...],
    integrations: [...],
  },
  metrics_defaults: { ... },
};
```

### Added Test Case
**File**: `tests/unit/blueprint-converters.test.ts`

New test validates JSON schema support:

```typescript
it('should handle JSON file schema with nested blueprint object', () => {
  const jsonTemplate = {
    twin_type: 'operational',
    roi_hint: 180,
    blueprint: { kpis: [...], integrations: [...] },
    llm: { model: 'gpt-5-mini', temperature: 0.2 },
  };
  
  const blueprint = templateToBlueprint(jsonTemplate, 'marketplace');
  
  expect(blueprint.type).toBe('operational');
  expect(blueprint.expectedRoi).toBe('180%');
  expect(blueprint.model.modelName).toBe('gpt-5-mini');
  expect(blueprint.goals).toContain('Processing Time: 7days');
});
```

## Verification Steps

1. ✅ Open Template Marketplace
2. ✅ Click "Use Template" on "Building Permit Application Processing Twin"
3. ✅ Verify Builder Step 1 shows:
   - Title: "Building Permit Application Processing Twin"
   - Description: "Automates building permit review, checks compliance..."
   - ROI: "220%"
   - KPIs: "Average Processing Time", "First-Time Approval Rate", "Citizen Satisfaction"
4. ✅ Check console logs show:
   - `hasDefaultConfig: true`
   - `hasGoals: 3`
   - `hasWorkflow: > 0`
5. ✅ Verify Steps 2-4 are pre-filled with template data

## Files Changed

1. ✅ `supabase/functions/catalog-templates-industry/index.ts` - Added `default_config` to query
2. ✅ `src/lib/builder/templateToBlueprint.ts` - Dual schema support
3. ✅ `src/components/builder/steps/Step1Summary.tsx` - Fixed fallbacks and display
4. ✅ `src/lib/builder/openBuilderWithTemplate.ts` - Enhanced logging
5. ✅ `tests/fixtures/templates.ts` - Updated fixtures
6. ✅ `tests/unit/blueprint-converters.test.ts` - Added JSON schema test
7. ✅ `TEMPLATE_MARKETPLACE_INTEGRATION.md` - Updated documentation

## Impact

- ✅ All templates now load correctly with their specific data
- ✅ No more "Process Twin for – Process Twin" generic displays
- ✅ Both database templates and JSON file templates work
- ✅ Better error detection via enhanced logging
- ✅ Comprehensive test coverage for both schemas

## Acceptance Criteria Met

- ✅ Building Permit template shows correct title and description
- ✅ ROI, KPIs, capabilities, tools, and workflows are template-specific
- ✅ Works from both Marketplace and Dashboard entry points
- ✅ All templates tested: Building Permit, Inventory Optimization, Customer Support
- ✅ Deep linking with `?templateId=...` works
- ✅ No cross-contamination when switching between templates
- ✅ Tests pass for both schema formats

## Related Documentation

- See `TEMPLATE_MARKETPLACE_INTEGRATION.md` for full integration details
- See `INTAKE_TESTING.md` for E2E test coverage
- See `src/lib/builder/README.md` for builder architecture
