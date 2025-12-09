# Intake Flow Testing Documentation

## Overview

This document describes the automated testing strategy for the unified AgentBlueprint intake flows in M2M Agentic Studio.

For detailed information about the **Template Marketplace → Builder integration**, see [TEMPLATE_MARKETPLACE_INTEGRATION.md](./TEMPLATE_MARKETPLACE_INTEGRATION.md).

## Unified Flow Architecture

All three intake methods produce an `AgentBlueprint` object that hydrates the Builder:

```
Upload File → Gemini Analysis → AgentBlueprint → Builder (Steps 1-5)
Questionnaire → QuestionnaireAnswers → AgentBlueprint → Builder (Steps 1-5)
Template → Template JSON → AgentBlueprint → Builder (Steps 1-5)
```

## Test Coverage

### E2E Tests (Playwright)

Located in `tests/e2e/`:

1. **intake-file-upload.spec.ts** - File upload → Gemini analysis → Builder
   - Happy path: upload, analyze, select type, open builder
   - Error handling: unsupported files, size limits, analysis failures
   - Cancellation flow
   - Analytics tracking

2. **intake-questionnaire.spec.ts** - Questionnaire → Builder
   - Complete 4-step wizard
   - Field validation
   - Navigation (back/forward)
   - Different agent types
   - Analytics tracking

3. **intake-template.spec.ts** - Template selection → Builder
   - Template marketplace browsing
   - Filtering by industry
   - Template preview
   - Certified templates
   - Analytics tracking

4. **intake-cross-flow-consistency.spec.ts** - Cross-flow validation
   - Blueprint data persistence across steps
   - Consistent UI components
   - Source field verification
   - Page reload handling

### Unit Tests (Vitest)

Located in `tests/unit/`:

1. **blueprint-converters.test.ts** - Blueprint conversion logic
   - `questionnaireToBlueprint()` - all answer types
   - `documentAnalysisToBlueprint()` - all document types
   - `templateToBlueprint()` - all template types
   - Field mapping validation
   - ROI/efficiency extraction

2. **blueprint-helpers.test.ts** - Helper utilities
   - `blueprintToBuilderState()` conversion
   - `builderStateToBlueprint()` conversion
   - Round-trip conversion integrity

### Integration Tests (Vitest)

Located in `tests/integration/`:

1. **intake-blueprint-flow.test.ts** - Store integration
   - Blueprint storage and retrieval
   - Update and dirty state tracking
   - localStorage persistence
   - Deep merge behavior

## Test Fixtures

Located in `tests/fixtures/`:

- **questionnaire-answers.ts** - Sample questionnaire responses
  - Customer support agent
  - Inventory optimization twin
  - Minimal configuration

- **document-analysis.ts** - Mock Gemini analysis results
  - Healthcare (small doc)
  - Manufacturing (large doc)
  - IT helpdesk (minimal)

- **templates.ts** - Marketplace template samples
  - Inventory optimization twin
  - Customer support agent
  - Basic agent

## Running Tests

### All E2E Tests
```bash
npm run test:e2e
```

### Specific E2E Test Suite
```bash
npx playwright test intake-file-upload
npx playwright test intake-questionnaire
npx playwright test intake-template
npx playwright test intake-cross-flow-consistency
```

### All Unit Tests
```bash
npm run test:unit
```

### Specific Unit Test
```bash
npm run test:unit blueprint-converters
```

### All Integration Tests
```bash
npm run test:int
```

### Watch Mode
```bash
npm run test:unit -- --watch
```

## Performance Expectations

With mocked backends:
- File upload flow: ≤5 seconds (analysis to builder)
- Questionnaire flow: ≤3 seconds (completion to builder)
- Template flow: ≤2 seconds (selection to builder)

E2E tests use mocked Gemini responses for speed and reliability.

## Analytics Validation

All flows track these events:
- `agent_intake.started` - When intake begins
- `agent_intake.step_progress` - Step transitions (questionnaire)
- `agent_intake.completed` - Blueprint created
- `agent_intake.builder_opened` - Builder opens with blueprint

Each event includes:
- `source`: 'file' | 'questionnaire' | 'template'
- `timestamp`: ISO 8601 string
- Context-specific metadata

## Debugging Failed Tests

### E2E Test Failures

1. **Check screenshots**: `playwright-report/` folder
2. **View trace**: `npx playwright show-trace trace.zip`
3. **Run in debug mode**: `npx playwright test --debug`
4. **Check network logs**: Tests capture console events

### Unit Test Failures

1. **Run with verbose output**: `npm run test:unit -- --reporter=verbose`
2. **Check fixture data**: Verify test fixtures match expected format
3. **Review conversion logic**: Blueprint converters may need updates

## CI Integration

Tests run automatically in CI on:
- Pull requests
- Main branch commits

CI Configuration:
- Retries: 2 (E2E only)
- Timeout: 30 seconds per test
- Parallel: No (for consistency)

## Extending Tests

### Adding New Intake Flow

1. Create fixture in `tests/fixtures/`
2. Add converter unit tests in `tests/unit/`
3. Add E2E test in `tests/e2e/`
4. Update this documentation

### Adding New Blueprint Field

1. Update converter functions
2. Add unit tests for field mapping
3. Verify E2E tests still pass
4. Add specific E2E assertions if needed

## Known Limitations

- E2E tests cannot test auth-protected pages
- Gemini responses are mocked (no real LLM calls)
- File upload tests use small mock files
- Template marketplace requires seeded data

## Support

For test failures or questions:
1. Check test output and logs
2. Review this documentation
3. Check Playwright/Vitest docs
4. Open GitHub issue with reproduction steps
