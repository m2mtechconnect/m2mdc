# Quick Start - Testing Digital Twin Recommendations

**⚡ Fast track to verify the fix works**

---

## 1. Install & Setup (if needed)

```bash
# Install dependencies
npm install

# Playwright browsers (if not already installed)
npx playwright install
```

---

## 2. Run Tests in Order

### Step 1: Validator Unit Tests (Fastest)
```bash
npm run test:unit -- digitalTwinValidators.test.ts
```

**Expected:**
- ✅ 24 tests pass
- ⏱️ ~100ms

**What it tests:**
- Digital Twin structure validation
- Industry-specific filtering
- Walmart operational twins vs CX personalization

---

### Step 2: Recommendation Engine Tests
```bash
npm run test:unit -- recommendationEngine.test.ts
```

**Expected:**
- ✅ 11 tests pass
- ⏱️ ~50ms

**What it tests:**
- Filtering logic (banned terms)
- Scoring logic (operational weights)
- Top 3 selection

---

### Step 3: Integration Tests
```bash
npm run test:int -- recommendations.test.ts
```

**Expected:**
- ✅ 11 tests pass
- ⏱️ ~200ms

**What it tests:**
- Domain classification (walmart.com → Enterprise Retail)
- Full pipeline integration
- Edge function behavior

---

### Step 4: E2E Tests (Requires Dev Server)

**Terminal 1 - Start dev server:**
```bash
npm run dev
```

**Terminal 2 - Run E2E tests:**
```bash
# Recommendation filtering tests
npx playwright test recommendations-filtering.spec.ts

# Golden path test with regenerate check
npx playwright test digital-twin-golden-path.spec.ts
```

**Expected:**
- ✅ 7 tests pass (filtering)
- ✅ 4 tests pass (golden path)
- ⏱️ ~2-3 minutes

**What it tests:**
- UI displays only operational twins for walmart.com
- Filter chips work correctly
- Regenerate button maintains Digital Twin mode
- Full user flow works end-to-end

---

## 3. Manual Verification

### Test walmart.com scan:

1. Open http://localhost:5173
2. Enter "walmart.com" in scanner
3. Click "Scan"
4. **Verify:**
   - ✅ Top 3 are operational twins (supply chain, store ops, logistics)
   - ❌ No "customer personalization" or "merchandising"
   - ✅ Filter chips show: "Supply Chain & Inventory", "Store Operations", etc.
   - ❌ No chips like "Personalization" or "Marketing"

### Test regeneration (CRITICAL):

5. Click "Regenerate" or refresh button (if visible)
6. Wait for new recommendations
7. **Verify:**
   - ✅ Still shows Digital Twin Blueprints
   - ❌ Does NOT revert to "AI Innovation Program" or generic titles

---

## 4. Expected Test Results

### All Unit Tests
```
✓ tests/unit/digitalTwinValidators.test.ts (24)
✓ tests/unit/recommendationEngine.test.ts (11)

Total: 35 tests passed
Duration: ~150ms
```

### All Integration Tests
```
✓ tests/integration/recommendations.test.ts (11)

Total: 11 tests passed
Duration: ~200ms
```

### All E2E Tests
```
✓ tests/e2e/recommendations-filtering.spec.ts (7)
✓ tests/e2e/digital-twin-golden-path.spec.ts (4)

Total: 11 tests passed
Duration: ~3 minutes
```

### Grand Total
**57 tests protecting Digital Twin recommendations** ✅

---

## 5. What If Tests Fail?

### Validator tests fail?
- Check `src/lib/digitalTwin/validators.ts`
- Verify scoring thresholds
- Confirm banned terms list

### Engine tests fail?
- Check `supabase/functions/url-recommendations/index.ts`
- Verify filtering logic (lines 1059-1175)
- Confirm scoring weights (lines 1395-1410)

### E2E tests fail?
- Check `src/components/search/RecommendationsPanel.tsx`
- Verify function call is `url-recommendations` (line 206)
- Confirm validation is applied (lines 227-241)

### Still seeing generic AI?
- Check console logs for validation rejections
- Verify `filterValidDigitalTwins()` is being called
- Confirm `url-recommendations` is being used, NOT `generate-ai-recommendations`

---

## 6. Quick Checklist

Before considering this fixed:

- [ ] Run `npm run test:unit` - All pass
- [ ] Run `npm run test:int` - All pass
- [ ] Run E2E tests - All pass
- [ ] Manual test walmart.com - Shows operational twins
- [ ] Manual test regenerate - Maintains Digital Twin mode
- [ ] No "customer personalization" in results
- [ ] No "generic AI" titles in results

---

## Success Criteria

✅ **You're good to go if:**
- All 57 tests pass
- walmart.com returns 3 operational twins
- Regenerate maintains Digital Twin mode
- No B2C personalization appears

❌ **Something's wrong if:**
- Any tests fail
- "Customer Personalization Engine" appears
- "Generic AI Program" appears
- Regenerate changes to generic AI

---

**Quick Status Check:**
```bash
npm run test:all && echo "✅ ALL TESTS PASSED"
```

If you see "✅ ALL TESTS PASSED", the fix is working!
