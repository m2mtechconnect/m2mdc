# Next Steps for REST Refactor Stabilization

## Current Status: ✅ Ready for Testing

18 critical components have been updated with REST envelope handling. Network validation confirms proper envelope format is being returned.

## Immediate Action Required

### 1. Run Automated Tests (HIGHEST PRIORITY)

```bash
# Install Playwright browsers if needed
npx playwright install

# Run the golden path test
npx playwright test digital-twin-golden-path

# Or run all E2E tests
npx playwright test

# Run in UI mode for debugging
npx playwright test --ui
```

**Expected Outcome:**
- ✅ All tests pass
- ✅ REST envelope validation test confirms correct response format
- ✅ Golden path test validates URL → Recommendations → Agent → Builder → Summary

**If Tests Fail:**
- Review test output and error messages
- Check edge function logs for any issues
- Verify REST envelope format in failing endpoints
- Fix issues and re-run tests

### 2. Manual Smoke Test

Once automated tests pass, perform this manual verification:

1. **Load the app** at `/`
2. **Enter URL**: `lovable.dev` or `sap.com` and click Scan
3. **Wait for recommendations** (up to 60s)
4. **Click "Create Agent"** on first recommendation
5. **Verify builder loads** on Step 1 with prefilled data
6. **Navigate to Step 6** (Measure & Deploy)
7. **Verify AI summary** is present and non-empty
8. **Check browser console** for errors
9. **Check Network tab** for 500/400 errors

### 3. Verify Edge Function Logs

Check logs for these critical endpoints:
- `url-turbo-capture` - URL ingestion
- `url-recommendations` - Recommendation generation
- `agent-draft-from-reco` - Agent creation
- `builder-generate-summary` - Step 6 summary

Each should log:
- correlationId
- Function name
- Duration in ms
- Clear error messages

### 4. Remaining Work (Optional)

Approximately 30+ additional components still use direct `supabase.functions.invoke()` calls. These can be updated gradually:

**Lower Priority Components:**
- AgentChat components
- RAG upload/indexing components
- Additional integration components
- Template and catalog components

**How to Update:**
1. Import `invokeEdgeFunction` from `@/hooks/useEdgeFunction`
2. Replace `supabase.functions.invoke()` calls
3. Remove manual error checking (handled automatically)
4. Test the component

## Success Criteria

- ✅ All Playwright tests pass
- ✅ Golden path test validates end-to-end flow
- ✅ Manual smoke test completes without errors
- ✅ Edge function logs show proper diagnostics
- ✅ No console errors in browser
- ✅ No 500/400 network errors

## Done!

When all success criteria are met:
1. Document any issues found and resolved
2. Update team on completion
3. Monitor production for any edge cases
4. Update remaining components as time permits
