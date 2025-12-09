# Manual Template Loading Test Checklist

This checklist verifies that template loading works correctly across all entry points and scenarios.

## Test Prerequisites

- [ ] Dev server is running (`npm run dev`)
- [ ] No console errors on page load
- [ ] User is logged in

## Test 1: URL Parameter Loading (Direct Navigation)

### Steps:
1. Navigate directly to: `/builder?templateId=retail_inventory_optimization&step=1`
2. Wait for page to load

### Expected Results:
- [ ] Page loads without errors
- [ ] Console shows: `🔍 [STORE] templateId detected in URL - loading template: retail_inventory_optimization`
- [ ] Console shows: `✅ [STORE] Template loaded - converting to blueprint`
- [ ] Console shows: `🎯 [STORE] Blueprint detected - hydrating from blueprint`
- [ ] Step 1 displays template name (NOT "Untitled Agent")
- [ ] "Started from template" badge is visible
- [ ] Industry and department fields are populated
- [ ] ROI, Time Saved, and Efficiency Gain cards show values (not generic defaults)

### Test Different Templates:
- [ ] `retail_inventory_optimization` - Should load Retail template
- [ ] `building_permit_processing` - Should load Building Permit template
- [ ] `emergency_department_patient_flow` - Should load Healthcare template

## Test 2: Dashboard Template Selection

### Steps:
1. Navigate to `/dashboard`
2. Click "Start with a template" button
3. Select any template card
4. Click "Use Template" button

### Expected Results:
- [ ] Navigates to `/builder?step=1` (may not have templateId in URL)
- [ ] Console shows blueprint conversion logs
- [ ] Step 1 displays correct template data
- [ ] "Started from template" badge shows template name
- [ ] All template-specific data is loaded (goals, tools, workflow)

## Test 3: Marketplace Template Selection

### Steps:
1. Navigate to `/marketplace`
2. Browse templates
3. Click "Use Template" on any card

### Expected Results:
- [ ] Navigates to `/builder?step=1`
- [ ] Template data loads correctly
- [ ] Same verification as Test 2

## Test 4: Builder Step 2 Template Selection

### Steps:
1. Navigate to `/builder?step=2`
2. Click "Browse Templates" or template picker
3. Select a template
4. Click "Use Template"

### Expected Results:
- [ ] Returns to `/builder?step=1`
- [ ] Template data loads correctly
- [ ] Previous blank/partial data is replaced

## Test 5: Error Handling

### Steps:
1. Navigate to `/builder?templateId=non_existent_template&step=1`

### Expected Results:
- [ ] Console shows: `⚠️ [STORE] Template not found: non_existent_template`
- [ ] Error message appears in UI
- [ ] Builder still loads (creates blank draft as fallback)
- [ ] No crashes or blank screens

## Test 6: Template Data Integrity

### For ANY loaded template, verify:

**Step 1 - Summary**
- [ ] Name matches template
- [ ] Description is template-specific (not generic)
- [ ] Industry badge matches template
- [ ] Department badge matches template
- [ ] Goals/KPIs are template-specific
- [ ] ROI percentage is shown (if template has it)
- [ ] Time Saved shows hours (if template has it)
- [ ] Efficiency Gain shows percentage (if template has it)
- [ ] Core Capabilities list is populated
- [ ] Recommended Tools are template-specific
- [ ] Recommended Workflows are template-specific

**Step 2 - Intelligence**
- [ ] Model is pre-selected
- [ ] System prompt is populated (if template has one)
- [ ] Temperature and other settings are loaded

**Step 3 - Tools**
- [ ] Recommended integrations are pre-selected
- [ ] Tools match template requirements

**Step 4 - Workflow**
- [ ] Triggers are populated
- [ ] Actions are populated
- [ ] Workflow diagram shows template-specific nodes

**Step 5 - Simulation**
- [ ] Template info is retained
- [ ] Ready to deploy with template configuration

## Test 7: Cross-Entry Point Consistency

### Steps:
1. Load template via URL: `/builder?templateId=retail_inventory_optimization&step=1`
2. Note the exact values (name, goals, tools, etc.)
3. Go back to dashboard
4. Use "Start with a template" to select the SAME template
5. Compare values

### Expected Results:
- [ ] ALL values match exactly (name, goals, ROI, tools, workflow)
- [ ] No differences between URL loading and button loading

## Test 8: Multiple Template Selection

### Steps:
1. Navigate to `/builder?templateId=retail_inventory_optimization&step=1`
2. Note template name
3. Navigate to `/builder?templateId=building_permit_processing&step=1`
4. Note new template name

### Expected Results:
- [ ] Second template completely replaces first
- [ ] No stale data from first template
- [ ] Console shows new template being loaded

## Test 9: Browser Navigation

### Steps:
1. Load template: `/builder?templateId=retail_inventory_optimization&step=1`
2. Click browser back button
3. Click browser forward button

### Expected Results:
- [ ] Template data persists through navigation
- [ ] No data loss
- [ ] No re-fetching (uses cached blueprint)

## Test 10: Performance

### Metrics:
- [ ] Template loads in < 2 seconds
- [ ] No console warnings or errors
- [ ] No visual flashing or layout shifts
- [ ] Smooth transition to builder

## Automated Test Execution

Run the test suites:

```bash
# Unit tests
npm run test -- template-url-loading
npm run test -- open-builder-with-template

# E2E tests
npx playwright test intake-template-unified

# All template-related tests
npm run test -- template
npx playwright test template
```

## Test Results Summary

**Date**: _______________
**Tested By**: _______________
**Browser**: _______________
**Version**: _______________

### Overall Results:
- [ ] All tests passed
- [ ] Some tests failed (document below)
- [ ] Critical issues found (document below)

### Issues Found:
```
[Document any issues here]
```

### Sign-off:
- [ ] Ready for production
- [ ] Needs additional fixes
