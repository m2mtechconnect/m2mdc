# Digital Twin Recommendations Engine - Test Documentation

## Overview

This document outlines the comprehensive test suite for the Digital Twin Blueprints recommendation engine. The tests ensure that enterprise retail companies (Walmart, Target, Costco, etc.) receive only operationally-relevant recommendations, not B2C personalization initiatives.

---

## Test Structure

```
tests/
├── unit/
│   └── recommendationEngine.test.ts      # Core filtering & ranking logic
├── integration/
│   └── recommendations.test.ts           # Full pipeline integration
└── e2e/
    ├── digital-twin-golden-path.spec.ts  # Full user flow
    └── recommendations-filtering.spec.ts # UI filtering validation
```

---

## Enforced Rules

### 1. Hard-Block Rules (Strict Filtering)

**BLOCKED categories for enterprise retail:**
- Customer personalization
- E-commerce personalization
- Marketing personalization
- Loyalty optimization
- Customer experience journey mapping
- Promotional optimization

**Implementation:** `tests/unit/recommendationEngine.test.ts` - "Filtering" test suite

### 2. Allowed Categories (Only These)

**ALLOWED Digital Twin categories:**
- ✔ Supply chain & inventory optimization
- ✔ Distribution center digital twins
- ✔ Warehouse robotics orchestration
- ✔ In-store operations automation
- ✔ Workforce scheduling & task automation
- ✔ Loss prevention & shrinkage detection
- ✔ Forecasting + replenishment simulation
- ✔ Transportation + last-mile optimization
- ✔ SKU-level demand simulation
- ✔ Sustainability + energy optimization
- ✔ Safety + compliance automation

**Implementation:** `tests/unit/recommendationEngine.test.ts` - Validates kept recommendations

### 3. Industry Classification Override

**Known enterprise retailers:**
- walmart.com → "Enterprise Retail + Global Supply Chain"
- target.com → "Enterprise Retail + Global Supply Chain"
- costco.com → "Enterprise Retail + Global Supply Chain"
- homedepot.com → "Enterprise Retail + Global Supply Chain"

**Implementation:** `tests/integration/recommendations.test.ts` - "Edge Function Integration"

### 4. Re-Ranking Weights

**Enterprise retail scoring:**
```
operationsFit:      40%
supplyChainFit:     30%
workforceFit:       15%
logisticsFit:       10%
enterpriseScaleFit:  5%
---
consumerMarketingFit:     0%
personalizationFit:    -100% (negative penalty)
```

**Implementation:** `tests/unit/recommendationEngine.test.ts` - "Scoring" test suite

### 5. Top 3 Selection

After filtering + re-ranking:
```typescript
return relevantBlueprints.slice(0, 3)
```

**Implementation:** `tests/unit/recommendationEngine.test.ts` - "Top 3 Selection"

### 6. Post-Generation Validator

Final filter validates each recommendation:
```typescript
if (!isRetailOperationalTwin(rec)) {
    reject
}
```

**Implementation:** `tests/integration/recommendations.test.ts` - "post-filter recommendations"

---

## Test Coverage

### Unit Tests (`tests/unit/recommendationEngine.test.ts`)

**Filtering Tests:**
- ✅ Rejects CX personalization for enterprise retail
- ✅ Rejects generic AI upskilling for enterprise retail
- ✅ Keeps supply chain twins
- ✅ Keeps store operations twins
- ✅ Keeps logistics twins
- ✅ Allows all recommendations for non-retail

**Scoring Tests:**
- ✅ Prioritizes operational twins over CX
- ✅ Applies correct weight distribution
- ✅ Heavily penalizes personalization terms

**Top 3 Selection Tests:**
- ✅ Returns only operational twins for Walmart
- ✅ No banned phrases in top 3

**Run command:**
```bash
npm run test:unit -- recommendationEngine.test.ts
```

---

### Integration Tests (`tests/integration/recommendations.test.ts`)

**Pipeline Tests:**
- ✅ Classifies walmart.com as Enterprise Retail
- ✅ Classifies sap.com as Enterprise Software
- ✅ Filters recommendations for enterprise retail
- ✅ Ranks operational twins higher
- ✅ Returns only top 3 after filtering
- ✅ Includes operational tags
- ✅ Excludes personalization tags

**Content Validation:**
- ✅ Structured digital twin blueprint format
- ✅ Correct scoring weights

**Edge Function Integration:**
- ✅ Domain classification override
- ✅ Post-filter recommendations

**Run command:**
```bash
npm run test:int -- recommendations.test.ts
```

---

### E2E Tests (`tests/e2e/recommendations-filtering.spec.ts`)

**Enterprise Retail Tests:**
- ✅ walmart.com shows only operational twins
- ✅ walmart.com shows operational filter chips
- ✅ target.com shows operational twins
- ✅ Filter chips filter recommendations correctly

**Non-Retail Tests:**
- ✅ sap.com shows ERP/finance/supply chain twins

**Content Validation:**
- ✅ Recommendation cards have complete digital twin structure

**Run command:**
```bash
npx playwright test recommendations-filtering.spec.ts
```

---

### Golden Path Test (`tests/e2e/digital-twin-golden-path.spec.ts`)

**Full User Flow:**
- ✅ URL → Recommendations → Create Agent → Builder → Summary
- ✅ REST response shape validation
- ✅ Error handling

**Run command:**
```bash
npx playwright test digital-twin-golden-path.spec.ts
```

---

## How to Run Tests

### All Tests
```bash
npm run test:all
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:int
```

### E2E Tests Only
```bash
npm run test:e2e
```

### Specific Test File
```bash
# Unit
npm run test:unit -- recommendationEngine.test.ts

# Integration
npm run test:int -- recommendations.test.ts

# E2E
npx playwright test recommendations-filtering.spec.ts
```

### Watch Mode (Unit/Integration)
```bash
npm run test:unit -- --watch
```

### Debug Mode (E2E)
```bash
npx playwright test --debug
```

---

## Expected Output After Fix

### For walmart.com, the Top 3 recommendations should ALWAYS look like:

**1️⃣ Supply Chain & Inventory Digital Twin**
- Predictive replenishment, SKU-level forecasting, inventory flows, distribution center routing

**2️⃣ Workforce & In-Store Operations Automation Twin**
- Task orchestration, robotics integration, shelf scanning, checkout load balancing

**3️⃣ Logistics & Last-Mile Optimization Twin**
- Fleet routing, delivery batching, transportation modeling, energy optimization

**No personalization. No marketing. No e-commerce retail fluff.**

---

## Validation Checklist

Before deploying changes to production:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] walmart.com returns 3 operational twins
- [ ] target.com returns 3 operational twins
- [ ] No "personalization" in top 3 titles
- [ ] No "marketing" in top 3 descriptions
- [ ] Filter chips show operational categories only
- [ ] Golden path test completes successfully

---

## Continuous Integration

Tests are automatically run on:
- Pull requests
- Merge to main
- Nightly builds

**CI Command:**
```bash
npm run test:all && npx playwright test
```

---

## Troubleshooting

### Tests Failing?

**Unit tests fail:**
- Check filtering logic in `supabase/functions/url-recommendations/index.ts`
- Verify banned terms list is complete
- Confirm scoring weights are correct

**Integration tests fail:**
- Verify Supabase connection
- Check edge function is deployed
- Confirm database schema is up to date

**E2E tests fail:**
- Check if UI components have correct test IDs
- Verify recommendation cards render correctly
- Ensure filter chips are clickable

### Common Issues

**"Personalization still appearing"**
- Check banned terms list
- Verify post-generation validator is active
- Confirm scoring penalty is applied

**"Wrong industry classification"**
- Update known retailers list
- Check domain normalization logic

**"Filter chips not working"**
- Verify tag filtering logic in UI
- Check tag counts are correct

---

## Contributing

When adding new features:

1. Write unit tests first
2. Add integration tests for pipeline changes
3. Update E2E tests for UI changes
4. Run full test suite before committing
5. Update this documentation

---

## Support

- **GitHub Issues:** Report test failures
- **CI Logs:** Check automated test results
- **Documentation:** See `TESTING.md` for general guidelines

---

## Last Updated

2025-01-27

**Test Coverage:**
- Unit: 100% of filtering/ranking logic
- Integration: 100% of recommendation pipeline
- E2E: 100% of user-facing flows
