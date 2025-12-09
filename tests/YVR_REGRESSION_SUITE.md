# YVR Airport Digital Twin - Regression Test Suite

This comprehensive test suite ensures the YVR_AIRPORT_DIGITAL_TWIN template remains functional and serves as the canonical base template for all industry templates.

## Quick Start

```bash
# Run all YVR unit + integration tests
npm run test tests/unit/yvr-* tests/integration/yvr-*

# Run YVR E2E tests
npm run test:e2e tests/e2e/yvr-*

# Run complete regression suite
npx tsx tests/run-yvr-regression.ts
```

## Test Coverage

### 1️⃣ Backend Integrity (`yvr-template-integrity.test.ts`)

**Purpose**: Ensure YVR template exists and is structurally complete in `agent_templates` table.

**Tests**:
- ✅ Template exists with correct ID and slug
- ✅ Core metadata (name, category, icon, description)
- ✅ Certification, rating, downloads, ROI data
- ✅ Default configuration completeness
- ✅ Preview sections structure
- ✅ KPI block with at least 4 KPIs
- ✅ ROI block with benefits and estimates
- ✅ Workflows array with at least 3 workflows
- ✅ Blueprint JSON (agents, data sources, integrations)
- ✅ Cloud metadata for AWS, Azure, GCP
- ✅ Sample prompts (at least 6)
- ✅ Recommended models
- ✅ Schema validation passes
- ✅ No duplicate templates with same ID/slug

**Run**: `npm run test tests/unit/yvr-template-integrity.test.ts`

---

### 2️⃣ Builder Wiring (`yvr-builder-wiring.test.ts`)

**Purpose**: Ensure YVR template correctly pre-fills Builder Steps 1-5.

**Tests**:
- ✅ Template converts to blueprint
- ✅ Step 1: Summary with name, description, industries, departments, goals, ROI
- ✅ Step 2: Intelligence settings (model, temperature, knowledge, behavior, system prompt)
- ✅ Step 3: Tools & integrations (recommended integrations populated)
- ✅ Step 4: Workflow (triggers, actions, integrations) - **CRITICAL: Actions not empty**
- ✅ Step 5: Metadata (tags, certified, rating, downloads)
- ✅ Workflow auto-repair prevents empty actions
- ✅ No null critical fields

**Run**: `npm run test tests/integration/yvr-builder-wiring.test.ts`

---

### 3️⃣ Intake Flows (`yvr-intake-flows.test.ts`)

**Purpose**: Ensure YVR is recommended from all intake methods (URL, File, Questionnaire).

**Tests**:
- ✅ URL Scanner: Recommends YVR for airport/aviation URLs
- ✅ URL Scanner: Detects aviation keywords (flight, baggage, passenger, security, gate, etc.)
- ✅ URL Scanner: Recommends YVR for transportation hubs
- ✅ URL Scanner: Does NOT recommend YVR for unrelated content
- ✅ Document Upload: Recommends YVR for airport operation docs
- ✅ Document Upload: Recommends YVR for aviation safety docs
- ✅ Document Upload: Recommends YVR for ground operations docs
- ✅ Questionnaire: Recommends YVR for aviation industry
- ✅ Questionnaire: Recommends YVR for airport/transportation industries
- ✅ Questionnaire: Recommends YVR for passenger/baggage use cases
- ✅ Recommendation quality: Provides reasons and confidence scores

**Run**: `npm run test tests/integration/yvr-intake-flows.test.ts`

---

### 4️⃣ Analytics Events (`yvr-analytics-events.test.ts`)

**Purpose**: Ensure YVR interactions emit correct analytics events.

**Tests**:
- ✅ `template_previewed` event fires with YVR metadata
- ✅ `template_used` event fires when "Use This Template" clicked
- ✅ `builder_opened` event fires with step number
- ✅ `builder_step_completed` events fire for steps 1-5
- ✅ `builder_completed` event fires at step 5
- ✅ `agent_deployed` event fires on successful deployment
- ✅ `scenario_run` event fires when scenario is executed
- ✅ `url_intake_recommended`, `document_intake_recommended`, `questionnaire_intake_recommended` events
- ✅ All events include timestamp and templateId

**Run**: `npm run test tests/unit/yvr-analytics-events.test.ts`

---

### 5️⃣ Marketplace Flow E2E (`yvr-marketplace-flow.spec.ts`)

**Purpose**: End-to-end test of marketplace → preview → builder flow.

**Tests**:
- ✅ YVR appears in marketplace
- ✅ YVR card shows correct metadata
- ✅ Can open YVR preview from marketplace
- ✅ Preview shows all tabs (Overview, Blueprint, Preview, Day in the Life, Scenarios, Simulation, Deploy)
- ✅ Overview tab shows complete content
- ✅ Blueprint tab shows agents and data sources
- ✅ Preview tab shows capabilities
- ✅ Day in the Life tab shows roles
- ✅ Scenarios tab shows at least 3 scenarios
- ✅ Deploy tab shows cloud options
- ✅ "Use This Template" button is visible
- ✅ Can search for YVR in marketplace
- ✅ Can filter by Aviation category
- ✅ YVR appears in dashboard "Start With Template"

**Run**: `npm run test:e2e tests/e2e/yvr-marketplace-flow.spec.ts`

---

### 6️⃣ Builder Deploy Flow E2E (`yvr-builder-deploy.spec.ts`)

**Purpose**: End-to-end test of builder → deployment flow.

**Tests**:
- ✅ Can load builder with YVR via `?templateId=YVR_AIRPORT_DIGITAL_TWIN`
- ✅ Step 1 shows YVR summary data
- ✅ Step 2 shows intelligence settings
- ✅ Step 3 shows integrations
- ✅ Step 4 shows workflow (NO "Workflow actions are required" error)
- ✅ Step 5 shows simulation and ROI
- ✅ Can navigate through all steps
- ✅ Deploy button is visible on step 5
- ✅ Deploy button triggers deployment flow
- ✅ Deployment validation catches missing fields
- ✅ Successful deployment redirects to dashboard (aspirational)
- ✅ Deployed YVR appears in agents list (aspirational)
- ✅ Can open manage view for deployed YVR (aspirational)

**Run**: `npm run test:e2e tests/e2e/yvr-builder-deploy.spec.ts`

---

## Test Utilities

### `tests/utils/yvr-test-helpers.ts`

Provides:
- `validateYVRTemplateStructure(template)` - Comprehensive template validation
- `validateYVRBlueprint(blueprint)` - Blueprint validation
- `validateYVRPreviewContent(template)` - Preview content validation
- `createMockYVRTemplate()` - Mock template for testing
- `createMockYVRBlueprint()` - Mock blueprint for testing
- `assertYVRMinimumRequirements(template)` - Assert minimum requirements
- `assertYVRBlueprintDeploymentReady(blueprint)` - Assert deployment readiness

**Usage**:
```typescript
import { 
  validateYVRTemplateStructure, 
  assertYVRBlueprintDeploymentReady 
} from '@/tests/utils/yvr-test-helpers';

const validation = validateYVRTemplateStructure(template);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Throws error if blueprint not deployment-ready
assertYVRBlueprintDeploymentReady(blueprint);
```

---

## Running Tests

### Unit Tests Only
```bash
npm run test tests/unit/yvr-template-integrity.test.ts
npm run test tests/unit/yvr-analytics-events.test.ts
```

### Integration Tests Only
```bash
npm run test tests/integration/yvr-builder-wiring.test.ts
npm run test tests/integration/yvr-intake-flows.test.ts
```

### E2E Tests Only
```bash
npm run test:e2e tests/e2e/yvr-marketplace-flow.spec.ts
npm run test:e2e tests/e2e/yvr-builder-deploy.spec.ts
```

### All YVR Tests
```bash
# Run all unit + integration tests
npm run test tests/unit/yvr-* tests/integration/yvr-*

# Run all E2E tests
npm run test:e2e tests/e2e/yvr-*

# Run complete suite with report
npx tsx tests/run-yvr-regression.ts
```

---

## CI/CD Integration

The YVR regression suite runs automatically on:
- ✅ Every push to `main` or `develop`
- ✅ Every pull request
- ✅ Changes to template/builder/intake code

### Workflow: `.github/workflows/yvr-regression.yml`

**Jobs**:
1. `yvr-unit-tests` - Runs unit tests
2. `yvr-integration-tests` - Runs integration tests (depends on unit tests)
3. `yvr-e2e-tests` - Runs E2E tests (depends on integration tests)
4. `yvr-regression-summary` - Generates summary report
5. `block-on-failure` - Blocks PR merge if tests fail

### PR Blocking

If YVR tests fail:
- ❌ PR cannot be merged
- ❌ GitHub Actions workflow fails
- ❌ Bot comments on PR with failure details

---

## Debugging Failed Tests

### Check Backend Data
```bash
# Query YVR template from Supabase
supabase db query "SELECT * FROM agent_templates WHERE id = 'YVR_AIRPORT_DIGITAL_TWIN'"
```

### Check Template Loading
```typescript
import { loadTemplateById } from '@/lib/templates/unifiedTemplateService';

const template = await loadTemplateById('YVR_AIRPORT_DIGITAL_TWIN');
console.log('YVR Template:', template);
```

### Check Blueprint Conversion
```typescript
import { templateToBlueprint } from '@/lib/builder/templateToBlueprint';

const template = await loadTemplateById('YVR_AIRPORT_DIGITAL_TWIN');
const blueprint = templateToBlueprint(template, 'marketplace');
console.log('YVR Blueprint:', blueprint);
console.log('Workflow actions:', blueprint.workflow.actions);
```

### Check Intake Recommendations
```typescript
import { recommendTemplatesFromContent } from '@/lib/intake/templateRecommendations';

const recs = recommendTemplatesFromContent({
  text: 'airport operations flight baggage',
});
console.log('Recommendations:', recs);
```

---

## Critical Regression Checks

### 🚨 Workflow Actions Must Not Be Empty

**Why**: Empty workflow actions cause deployment to fail with error:
```
"Workflow actions are required"
```

**How to verify**:
```typescript
const blueprint = templateToBlueprint(yvrTemplate, 'marketplace');
assert(blueprint.workflow.actions.length > 0, 'Actions cannot be empty');
```

**Auto-repair**: The `autoRepairWorkflow` function should populate actions if missing.

---

### 🚨 All Preview Tabs Must Render

**Why**: Missing preview sections break the UI and user experience.

**How to verify**:
- Overview tab: Hero panel, description, KPIs, ROI
- Blueprint tab: Agents, data sources, integrations
- Preview tab: Capabilities, chat interface
- Day in the Life tab: At least 3 roles with narratives
- Scenarios tab: At least 3 scenarios
- Simulation tab: Placeholder or simulation interface
- Deploy tab: AWS, Azure, GCP cards

---

### 🚨 Intake Flows Must Route to YVR

**Why**: Users with aviation/airport needs should automatically be directed to YVR.

**How to verify**:
```typescript
const recs = recommendTemplatesFromContent({ text: 'airport operations' });
assert(recs[0].templateId === 'YVR_AIRPORT_DIGITAL_TWIN');
```

---

## Maintenance

### Adding New Tests

1. Create test file in appropriate directory:
   - `tests/unit/yvr-*.test.ts` for unit tests
   - `tests/integration/yvr-*.test.ts` for integration tests
   - `tests/e2e/yvr-*.spec.ts` for E2E tests

2. Import test helpers:
   ```typescript
   import { validateYVRTemplateStructure } from '@/tests/utils/yvr-test-helpers';
   ```

3. Follow naming convention: `yvr-[feature].test.ts` or `yvr-[feature].spec.ts`

### Updating Tests After Schema Changes

If you update the YVR template schema:
1. Update `validateYVRTemplateStructure` in `tests/utils/yvr-test-helpers.ts`
2. Update relevant test assertions
3. Run full regression suite to verify no breakage
4. Update this README with new requirements

---

## Success Criteria

✅ All unit tests pass
✅ All integration tests pass
✅ All E2E tests pass
✅ CI workflow is green
✅ No workflow action errors during deployment
✅ YVR appears in all expected locations (marketplace, dashboard, search results)
✅ All preview tabs render correctly
✅ Builder pre-fills all 5 steps
✅ Analytics events fire correctly

---

## Why YVR is the Base Template

YVR Airport Operations Digital Twin serves as:
- ✅ **Reference implementation** for complex multi-system templates
- ✅ **Validation case** for template generator
- ✅ **Schema completeness benchmark** (has all possible fields)
- ✅ **Regression canary** (breaking YVR means other templates may break)
- ✅ **Best practices example** (workflow structure, preview content, cloud deployment)

**If YVR tests fail, the entire template system may be compromised.**

---

## Contact & Support

If YVR tests are failing and you need help:
1. Check the CI workflow logs for specific failures
2. Review the debugging section above
3. Check for recent changes to template schema or builder logic
4. Verify Supabase `agent_templates` table structure hasn't changed

---

**Last Updated**: 2025-12-01
**Template Version**: 2.1
**Test Suite Version**: 1.0
