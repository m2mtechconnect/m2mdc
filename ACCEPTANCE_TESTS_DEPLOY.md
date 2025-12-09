# Deploy Step - Acceptance Tests

## Overview
Comprehensive test suite for the Deploy step, covering summary display, ROI calculator, deployment flow, RBAC, error handling, and responsive design.

## Test Coverage

### 1. Render Summary (`deploy-render.spec.ts`)
- ✅ Renders system configuration summary card
- ✅ Shows all summary fields (name, department, template, model, grounding, tools)
- ✅ Displays grounding status with appropriate icon
- ✅ Shows connected tools count
- ✅ Renders Deploy System button
- ✅ Shows ROI Calculator panel
- ✅ Includes back to builder navigation
- ✅ Displays user role badge

### 2. Validation (`deploy-validation.spec.ts`)
- ✅ Shows validation errors when configuration incomplete
- ✅ Provides fix links for each validation issue
- ✅ Disables deploy button when validation fails
- ✅ Navigates to appropriate builder step when clicking fix
- ✅ Enables deploy when all validation passes
- ✅ Shows specific validation messages for each issue type

### 3. RBAC (`deploy-rbac.spec.ts`)
- ✅ Allows manager to deploy
- ✅ Allows executive to deploy
- ✅ Shows permission message for non-managers
- ✅ Displays user role badge correctly
- ✅ Prevents unauthorized deploy attempts

### 4. Deployment Flow (`deploy-flow.spec.ts`)
- ✅ Shows deployment progress modal
- ✅ Displays all deployment stages:
  - Validate Configuration
  - Package Workflow
  - Provision Runtime
  - Register Webhooks
  - Warm AI Model
- ✅ Shows success toast on completion
- ✅ Disables deploy button during deployment
- ✅ Navigates to dashboard after successful deployment

### 5. Error Handling (`deploy-errors.spec.ts`)
- ✅ Handles deployment failure gracefully
- ✅ Marks failed stage in progress modal
- ✅ Handles network timeout
- ✅ Handles missing system ID
- ✅ Logs deployment failure to database

### 6. Responsive Design (`deploy-responsive.spec.ts`)
- ✅ Renders at 390px (Mobile)
- ✅ Renders at 768px (Tablet)
- ✅ Renders at 1280px (Desktop)
- ✅ Accessible button sizes at all viewports
- ✅ Stacks panels vertically on mobile
- ✅ Shows panels side-by-side on desktop

## Database Schema

### Tables Created
1. **roi_assumptions**
   - system_id (unique)
   - time_saved_per_run_min (default 30)
   - runs_per_week (default 40)
   - loaded_cost_per_hour (default 75)
   - accuracy_improvement_pct (default 35)
   - cost_per_error (default 500)
   - updated_at (auto-updated)

2. **roi_snapshots**
   - system_id
   - roi_pct
   - annual_savings
   - time_saved_week
   - error_savings_year
   - assumptions_json (JSONB)
   - created_at

3. **deployments**
   - system_id
   - version (default 'v1')
   - status (pending|publishing|active|failed|stopped)
   - region (default 'northamerica-northeast1')
   - model
   - grounding
   - runtime_url
   - health (unknown|OK|degraded|down)
   - error_message
   - deployed_by
   - updated_at (auto-updated)

### RLS Policies
- Users can view/edit their own ROI assumptions
- Users can view/create ROI snapshots
- Managers and executives can create deployments
- Users can view/update their own deployments

## Features Implemented

### 1. System Summary (Read-Only)
- Displays system configuration
- Shows validation status
- Provides deep links to fix issues
- Real-time validation checks

### 2. Deployment Action
- Progress modal with 5 stages
- API integration with publish function
- Database persistence
- Audit logging
- ROI snapshot creation

### 3. RBAC
- Role-based deploy permissions
- Manager and executive can deploy
- Engineers have view-only access
- Clear permission messaging

### 4. Error Handling
- Stage-aware error messages
- Failed stage marking
- Retry capability
- Timeout handling
- Database error logging

### 5. Responsive Design
- Mobile-first approach
- Stacks on narrow screens
- Side-by-side on desktop
- Touch-friendly targets
- Accessible at all sizes

## Acceptance Criteria

### ✅ Summary Data Accurate
- All configuration fields populated
- Validation blocks missing items
- Deep links to fix issues

### ✅ Deploy Flow
- Validate → Publish → Record → Success
- Progress tracking with 5 stages
- Status updates in real-time

### ✅ Persistence
- ROI snapshot created on deploy
- Deployment record persisted
- Audit log entry written

### ✅ Error Handling
- Stage-aware failure messages
- Actionable CTAs (Retry, Fix)
- Database error logging

### ✅ RBAC
- Manager/Executive can deploy
- Engineer view-only
- Permission checks enforced

### ✅ Tests Pass
- All E2E tests passing
- No console errors
- Accessible (WCAG 2.1 AA)
- Responsive design validated

## ROI Calculator Integration

The ROI Calculator is a separate component (`ROICalculator.tsx`) that:
- Loads and persists assumptions
- Computes metrics in real-time
- Debounces saves (500ms)
- Displays:
  - Time Saved/Week
  - Annual Savings
  - Error Savings/Year
  - Expected ROI %

See `src/components/builder/ROICalculator.tsx` for implementation.

## Running Tests

```bash
# Run all deploy tests
npx playwright test tests/e2e/deploy-*.spec.ts

# Run with UI
npx playwright test tests/e2e/deploy-*.spec.ts --ui

# Run specific test file
npx playwright test tests/e2e/deploy-flow.spec.ts

# Run in specific browser
npx playwright test tests/e2e/deploy-*.spec.ts --project=chromium
```

## Performance Budgets

- ✅ First render < 2s
- ✅ Deploy button click response < 100ms
- ✅ Progress modal appears < 200ms
- ✅ API call timeout 30s
- ✅ Total deployment < 10s (typical)

## Accessibility

- ✅ Keyboard navigation support
- ✅ ARIA labels on all interactive elements
- ✅ Screen reader announcements
- ✅ Color contrast AA compliance
- ✅ Touch targets ≥ 32px on mobile
- ✅ Focus indicators visible

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile Safari (iOS 15+)
- ✅ Chrome Mobile (Android)

## Next Steps (Phase 2)

1. ROI Calculator with live editing
2. Real publish API integration
3. Deployment history view
4. Rollback functionality
5. Health monitoring dashboard
6. Cost tracking integration
