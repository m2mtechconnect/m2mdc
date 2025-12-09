# Full Industry + Department Digital Twin Recommender Audit

## Overview

This document provides instructions for running the comprehensive end-to-end audit of the Industry + Department Digital Twin Recommender system.

## What Gets Tested

The audit covers:

### ✅ 1. Industry Classification (20 Industries)
- Tests that domains are correctly classified into one of 20 industries
- Validates classification for 20+ representative companies
- Ensures no fallback to "generic" or "unknown"
- Tests edge cases and variations

### ✅ 2. Department Classification (12 Departments)  
- Tests content-based classification into 12 enterprise departments
- Validates keyword weighting and scoring
- Ensures exactly one department is returned
- Tests multi-department scenarios

### ✅ 3. Digital Twin Template Validation
- Verifies generated blueprints follow digital twin structure
- Checks for required elements: process, data, events, KPIs
- Tests industry-specific filtering rules
- Validates scoring components

### ✅ 4. Full Pipeline Integration
- Tests end-to-end flow from classification to recommendations
- Validates filtering and ranking logic
- Ensures Top 3 selection follows rules
- Tests cross-industry coverage

### ✅ 5. UI End-to-End Tests
- Validates user experience for different company scans
- Checks filter chips and card content
- Ensures no generic AI initiatives appear
- Tests regression prevention

## Running the Audit

### Option 1: Full Audit Script (Recommended)

Run the comprehensive audit script that executes all test suites and generates a detailed report:

\`\`\`bash
npm run audit:full
\`\`\`

This will:
1. Run all unit tests
2. Run all integration tests
3. Run all E2E tests
4. Generate a detailed PASS/FAIL report in `AUDIT_REPORT.md`
5. Exit with status code 0 if passing, 1 if failing

### Option 2: Individual Test Suites

Run specific test suites individually:

\`\`\`bash
# Industry Classification Tests
npm run test:unit -- industryClassifier

# Department Classification Tests
npm run test:unit -- departmentClassifier

# Digital Twin Validation Tests
npm run test:unit -- twinTemplateValidation

# Full Pipeline Integration Tests
npm run test:integration -- industryDepartmentPipeline

# UI End-to-End Tests
npm run test:e2e -- industry-department-ui
\`\`\`

### Option 3: Run All Tests

Run all tests across all suites:

\`\`\`bash
npm run test:all
\`\`\`

## Understanding the Results

### Audit Report Structure

The generated `AUDIT_REPORT.md` contains:

1. **Summary**: Overall pass/fail statistics and pass rate
2. **Test Results by Suite**: Detailed breakdown of each test suite
3. **Missing Implementations**: Any required files that are missing
4. **Critical Issues**: High-priority problems that need immediate attention
5. **Recommendations**: Specific actions to fix identified issues
6. **Next Steps**: Prioritized action items

### Pass Criteria

The system is considered PASSING if:
- ✅ Overall pass rate ≥ 80%
- ✅ No critical issues in core classifiers
- ✅ All required files are present
- ✅ No generic AI initiatives leak through

### Failure Scenarios

The audit will FAIL if:
- ❌ Industry classification accuracy < 80%
- ❌ Department classification accuracy < 80%
- ❌ Digital Twin validation rejects valid blueprints
- ❌ Generic AI initiatives appear in recommendations
- ❌ UI displays incorrect content

## What Gets Tested Per Industry

The audit validates recommendations for:

| Domain | Expected Industry | Expected Department |
|--------|------------------|-------------------|
| walmart.com | Enterprise Retail | Supply Chain |
| pfizer.com | Pharmaceuticals | Compliance |
| sap.com | Enterprise SaaS | Procurement |
| verizon.com | Telecommunications | Operations |
| td.com | Financial Services | Finance |
| ford.com | Manufacturing – Automotive | Manufacturing |
| ge.com | Manufacturing – Industrial | Operations |
| fedex.com | Logistics / 3PL | Logistics |
| nike.com | Fashion / Apparel | Operations |
| coursera.org | Education / EdTech | Operations |

## Interpreting Failures

### Industry Classification Failures
**Symptom**: Tests fail in `industryClassifier.test.ts`
**Likely Cause**: Domain patterns or keyword matching needs adjustment
**Fix**: Update `src/lib/digitalTwin/industryClassifier.ts`

### Department Classification Failures
**Symptom**: Tests fail in `departmentClassifier.test.ts`
**Likely Cause**: Keyword weighting or scoring logic issues
**Fix**: Update `src/lib/digitalTwin/departmentClassifier.ts`

### Validation Failures
**Symptom**: Tests fail in `twinTemplateValidation.test.ts`
**Likely Cause**: Scoring thresholds too strict or validation logic too loose
**Fix**: Update `src/lib/digitalTwin/enhancedValidators.ts`

### Pipeline Failures
**Symptom**: Tests fail in `industryDepartmentPipeline.test.ts`
**Likely Cause**: Integration between components broken
**Fix**: Check edge function and validator integration

### UI Failures
**Symptom**: Tests fail in `industry-department-ui.spec.ts`
**Likely Cause**: UI not wired to correct edge function or validators
**Fix**: Update `src/components/search/RecommendationsPanel.tsx`

## Debugging Failed Tests

To debug a specific failing test:

\`\`\`bash
# Run with verbose output
npm run test:unit -- industryClassifier --verbose

# Run a specific test
npm run test:unit -- industryClassifier -t "should classify walmart.com"

# Run with coverage
npm run test:unit -- --coverage
\`\`\`

## Continuous Monitoring

After passing the audit:

1. **Add to CI/CD**: Run audit on every PR
2. **Monitor Production**: Set up alerting for classification drift
3. **Update Tests**: Add new test cases for edge cases discovered in production
4. **Regular Audits**: Run full audit weekly to catch regressions early

## Troubleshooting

### Tests Not Running
- Ensure all dependencies are installed: `npm install`
- Check that test files exist in correct locations
- Verify test runner configuration

### Playwright Issues
- Install Playwright browsers: `npx playwright install`
- Check browser compatibility
- Ensure dev server is running for E2E tests

### Timeout Errors
- Increase timeout in test configuration
- Check network connectivity for edge function calls
- Verify edge functions are deployed

## Support

If you encounter issues not covered in this guide:
1. Check the detailed audit report in `AUDIT_REPORT.md`
2. Review individual test output for specific errors
3. Consult the implementation files for logic details
4. Check the Digital Twin documentation for requirements

---

**Last Updated**: 2025-11-27  
**Version**: 1.0
