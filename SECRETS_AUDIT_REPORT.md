# Secrets Audit Report

**Date:** 2024-12-09  
**Project:** Data Centre Digital Twin Studio  
**Scope:** Validate secrets model implementation, wiring, and obsolete references  

---

## Executive Summary

| Section | Status |
|---------|--------|
| Secrets Usage Map | ✅ PASSED |
| Obsolete Secrets | ⚠️ PARTIAL |
| Secrets UI | ❌ FAILED |
| Copilot Wiring | ✅ PASSED |
| Deploy Wiring | ⚠️ PARTIAL |
| Scanner / Firecrawl | ✅ PASSED |
| Analytics / Arcade | ✅ PASSED |

---

## 1️⃣ Current Secrets Inventory

### Configured Secrets (14 total)

| Secret | Status | Required By |
|--------|--------|-------------|
| `LOVABLE_API_KEY` | ✅ Auto-managed | Copilot, Recommendation Engine, All AI Features |
| `GOOGLE_PROJECT_ID` | ✅ Valid | External Google (optional) |
| `GOOGLE_LOCATION` | ✅ Valid | External Google (optional) |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | ✅ Valid | External Google (optional) |
| `GEMINI_MODEL` | ✅ Valid | External Google model selection |
| `VERTEX_DATA_STORE_ID` | ✅ Valid | RAG/Vertex Search (optional) |
| `GOOGLE_OAUTH_CLIENT_ID` | ✅ Valid | Google Drive integration in RAG |
| `GOOGLE_OAUTH_CLIENT_SECRET` | ✅ Valid | Google Drive integration in RAG |
| `AWS_ACCESS_KEY_ID` | ✅ Valid | S3 RAG connector |
| `AWS_SECRET_ACCESS_KEY` | ✅ Valid | S3 RAG connector |
| `MSFT_CLIENT_ID` | ✅ Valid | Microsoft OAuth (OneDrive/SharePoint) |
| `MSFT_CLIENT_SECRET` | ✅ Valid | Microsoft OAuth (OneDrive/SharePoint) |
| `FIRECRAWL_API_KEY` | ✅ Valid | URL Scanner fallback (optional) |
| `ARCADE_API_KEY` | ✅ Valid | MCP Server Marketplace (optional) |

---

## 2️⃣ Secrets Usage Map

### ✅ Google / Gemini (LLM + RAG) - PASSED

| Secret | Files | Usage |
|--------|-------|-------|
| `GOOGLE_PROJECT_ID` | `supabase/functions/_shared/ai-client.ts:30`, `ai-config/index.ts:22,40`, `health/index.ts:51`, `health-ai/index.ts:23`, `copilot-health/index.ts:21`, `template-validate/index.ts:54` | External Google Cloud project ID |
| `GOOGLE_LOCATION` | `supabase/functions/_shared/ai-client.ts:31`, `ai-config/index.ts:41`, `health/index.ts:42`, `health-ai/index.ts:24`, `copilot-health/index.ts:22` | Region for Vertex AI calls |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | `supabase/functions/_shared/ai-client.ts:29`, `ai-config/index.ts:21`, `health/index.ts:50`, `health-ai/index.ts:22`, `copilot-health/index.ts:20` | Service account JSON for external Google |
| `GEMINI_MODEL` | `supabase/functions/_shared/ai-client.ts:45`, `ai-config/index.ts:42`, `copilot-health/index.ts:23`, `template-validate/index.ts:56` | Model selection for external Google |
| `VERTEX_DATA_STORE_ID` | `supabase/functions/_shared/ai-client.ts:32`, `ai-config/index.ts:43`, `health/index.ts:78`, `health-ai/index.ts:25`, `copilot-health/index.ts:24`, `templates-seed/index.ts:34,67,100,133,166` | Vertex Search data store |

**Confirmation:** ✅ All Google/Gemini secrets are used ONLY by Copilot, Recommendation Engine, and Twin Intelligence features via edge functions.

### ✅ Google OAuth (RAG Integration) - PASSED

| Secret | Files | Usage |
|--------|-------|-------|
| `GOOGLE_OAUTH_CLIENT_ID` | `supabase/functions/rag-oauth-google/index.ts:18`, `src/components/rag/RAGUploadTabs.tsx:26` | Google Drive OAuth |
| `GOOGLE_OAUTH_CLIENT_SECRET` | `supabase/functions/rag-oauth-google/index.ts:19`, `src/components/rag/RAGUploadTabs.tsx:26` | Google Drive OAuth |

**Confirmation:** ✅ Used only in RAG cloud document upload feature.

### ✅ AWS Credentials - PASSED

| Secret | Files | Usage |
|--------|-------|-------|
| `AWS_ACCESS_KEY_ID` | `supabase/functions/rag-s3-connect/index.ts:16`, `src/components/rag/RAGUploadTabs.tsx:28` | S3 bucket connection |
| `AWS_SECRET_ACCESS_KEY` | `supabase/functions/rag-s3-connect/index.ts:17`, `src/components/rag/RAGUploadTabs.tsx:28` | S3 bucket connection |

**Confirmation:** ✅ AWS secrets are used ONLY in RAG S3 connector, NOT for deploy functionality.

### ✅ Azure / Microsoft OAuth - PASSED

| Secret | Files | Usage |
|--------|-------|-------|
| `MSFT_CLIENT_ID` | `supabase/functions/rag-oauth-microsoft/index.ts:19,38,65`, `src/components/rag/RAGUploadTabs.tsx:27` | Microsoft OAuth |
| `MSFT_CLIENT_SECRET` | `supabase/functions/rag-oauth-microsoft/index.ts:20,66`, `src/components/rag/RAGUploadTabs.tsx:27` | Microsoft OAuth |

**Confirmation:** ✅ Used only in RAG Microsoft/OneDrive/SharePoint integration.

### ✅ Firecrawl - PASSED

| Secret | Files | Usage |
|--------|-------|-------|
| `FIRECRAWL_API_KEY` | `supabase/functions/url-turbo-capture/index.ts:510,518` | URL Scanner Strategy 6 fallback |

**Confirmation:** ✅ Used ONLY by URL Scanner as final fallback strategy. Optional - app works without it.

### ✅ Arcade - PASSED

| Secret | Files | Usage |
|--------|-------|-------|
| `ARCADE_API_KEY` | `supabase/functions/arcade-servers/index.ts:10,13,1010,1020`, `supabase/functions/mcp-sync/index.ts:24,27,112` | MCP Server Marketplace |

**Confirmation:** ✅ Used ONLY by MCP Server Marketplace components. Gracefully degrades to mock data when not configured.

---

## 3️⃣ Obsolete Secrets Check

### ⚠️ PARTIAL - Requires Cleanup

| Secret | Location | Issue | Action |
|--------|----------|-------|--------|
| `OPENAI_API_KEY` | `BUILDER_AUDIT.md:966`, `SECURITY.md:30` | Documentation reference only | ❌ REMOVE from docs - not used anywhere |
| `ANTHROPIC_API_KEY` | `BUILDER_AUDIT.md:967` | Documentation reference only | ❌ REMOVE from docs - not used anywhere |
| `ZAPIER_API_KEY` | `BUILDER_AUDIT.md:965` | Documentation reference - NOT in secrets list | ❌ REMOVE from docs |
| `ZAPIER_CLIENT_ID` | 6 edge functions | Used by Zapier OAuth but NOT in secrets list | ⚠️ ADD to secrets if Zapier is active |
| `ZAPIER_CLIENT_SECRET` | 4 edge functions | Used by Zapier OAuth but NOT in secrets list | ⚠️ ADD to secrets if Zapier is active |
| `ZAPIER_REDIRECT_URI` | 3 edge functions | Used by Zapier OAuth but NOT in secrets list | ⚠️ ADD to secrets if Zapier is active |
| `USE_EXTERNAL_GOOGLE` | 8 files | Toggle for external Google - NOT in secrets list | ⚠️ Should be documented or added |
| `SUPABASE_SERVICE_ROLE_KEY` | 30+ edge functions | Auto-provided by Supabase - NOT user secret | ✅ OK - auto-managed |
| `SUPABASE_URL` | 40+ edge functions | Auto-provided by Supabase - NOT user secret | ✅ OK - auto-managed |
| `SUPABASE_ANON_KEY` | 40+ edge functions | Auto-provided by Supabase - NOT user secret | ✅ OK - auto-managed |

---

## 4️⃣ Secrets UI Audit

### ❌ FAILED - No Dedicated Secrets Management UI Found

**Issue:** There is NO dedicated Secrets Settings UI component in the codebase.

**Search Results:**
- `src/components/settings` - Directory does not exist
- `UpdateSecret`, `SecretsForm`, `SecretInput`, `secretsConfig` - No matches found
- Secrets are referenced only in `RAGUploadTabs.tsx` which shows missing secrets alerts but doesn't provide update UI

**Required Fixes:**

1. **Create Secrets Management UI** at `src/components/settings/SecretsManager.tsx`:
   - Group secrets by provider (Google, AWS, Azure, Other)
   - Show current configuration status
   - Add help text indicating feature dependencies
   - Allow updating secrets via Lovable's `add_secret` / `update_secret` tools

2. **Expected Secret Groups:**
   ```
   ┌─ Google / AI ─────────────────────────────────────────────────┐
   │ GOOGLE_PROJECT_ID          │ Used by: External Google AI     │
   │ GOOGLE_LOCATION            │ Used by: Vertex AI region       │
   │ GOOGLE_APPLICATION_CREDS   │ Used by: External Google AI     │
   │ GEMINI_MODEL               │ Used by: Model selection        │
   │ VERTEX_DATA_STORE_ID       │ Used by: RAG/Vertex Search      │
   │ GOOGLE_OAUTH_CLIENT_ID     │ Used by: Google Drive RAG       │
   │ GOOGLE_OAUTH_CLIENT_SECRET │ Used by: Google Drive RAG       │
   └───────────────────────────────────────────────────────────────┘
   
   ┌─ AWS ─────────────────────────────────────────────────────────┐
   │ AWS_ACCESS_KEY_ID          │ Used by: S3 RAG connector       │
   │ AWS_SECRET_ACCESS_KEY      │ Used by: S3 RAG connector       │
   └───────────────────────────────────────────────────────────────┘
   
   ┌─ Azure / Microsoft ───────────────────────────────────────────┐
   │ MSFT_CLIENT_ID             │ Used by: OneDrive/SharePoint    │
   │ MSFT_CLIENT_SECRET         │ Used by: OneDrive/SharePoint    │
   └───────────────────────────────────────────────────────────────┘
   
   ┌─ Optional Integrations ───────────────────────────────────────┐
   │ FIRECRAWL_API_KEY          │ Used by: URL Scanner fallback   │
   │ ARCADE_API_KEY             │ Used by: MCP Marketplace        │
   └───────────────────────────────────────────────────────────────┘
   ```

---

## 5️⃣ Feature Wiring Tests

### ✅ Copilot Wiring - PASSED

**Files Checked:**
- `supabase/functions/copilot-chat/index.ts` - Lines 59-61: Checks for `LOVABLE_API_KEY`
- `supabase/functions/copilot-health/index.ts` - Lines 25-99: Tests both Lovable managed and external Google
- `supabase/functions/copilot-router/index.ts` - Lines 89-91: Checks for `LOVABLE_API_KEY`
- `supabase/functions/copilot-search/index.ts` - Lines 31-35: Returns clear error if not configured

**Behavior:**
- ✅ Primary: Uses `LOVABLE_API_KEY` (Lovable managed Gemini) - always available
- ✅ Optional: Can switch to external Google via `USE_EXTERNAL_GOOGLE=true`
- ✅ Error handling: Returns clear `AI service not configured` error if no key present
- ✅ Graceful fallback: External Google → Lovable managed if external fails

### ⚠️ Deploy Wiring - PARTIAL

**Issue:** Deploy functionality does NOT gate on AWS/Azure secrets because:

1. `DeploymentOverview.tsx` mentions AWS/Azure/GCP deployment but has no secret checking logic
2. `ReadinessChecklist.tsx` checks builder state but NOT secret availability
3. No edge function validates cloud provider secrets before deployment

**Current Behavior:**
- Deploy button is always visible regardless of secret configuration
- No AWS/Azure secret validation before deploy action

**Recommendation:**
- Add secret validation check to deployment readiness
- Disable/hide cloud-specific deploy options if corresponding secrets missing

### ✅ Scanner / Firecrawl - PASSED

**File:** `supabase/functions/url-turbo-capture/index.ts`

**Lines 508-519:**
```typescript
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
if (FIRECRAWL_API_KEY) {
  // Strategy 6: Firecrawl as ultimate fallback
  ...
}
```

**Behavior:**
- ✅ Checks for `FIRECRAWL_API_KEY` before making any Firecrawl call
- ✅ Used as Strategy 6 (last resort fallback)
- ✅ App works without Firecrawl - other strategies handle most cases

### ✅ Analytics / Arcade - PASSED

**Files:** 
- `supabase/functions/arcade-servers/index.ts` - Lines 10-15
- `supabase/functions/mcp-sync/index.ts` - Lines 24-29

**Behavior:**
```typescript
const ARCADE_API_KEY = Deno.env.get('ARCADE_API_KEY');
if (!ARCADE_API_KEY) {
  console.warn('[arcade-servers] ARCADE_API_KEY not configured - using mock data only');
}
```

- ✅ Checks for `ARCADE_API_KEY` before Arcade API calls
- ✅ Falls back to mock data when not configured
- ✅ Components still functional with mock data
- ✅ Only MCP Marketplace uses Arcade

---

## 6️⃣ Recommendations Summary

### High Priority (Must Fix)

| Item | Action | Files |
|------|--------|-------|
| **Secrets UI Missing** | Create `src/components/settings/SecretsManager.tsx` with grouped secrets and help text | New file |
| **Zapier Secrets Missing** | Either add `ZAPIER_CLIENT_ID`, `ZAPIER_CLIENT_SECRET`, `ZAPIER_REDIRECT_URI` to secrets list OR remove Zapier OAuth functionality | Secrets config |

### Medium Priority (Should Fix)

| Item | Action | Files |
|------|--------|-------|
| **Deploy Wiring** | Add secret validation to deployment readiness checks | `ReadinessChecklist.tsx` |
| **USE_EXTERNAL_GOOGLE** | Document this toggle or add to secrets UI | Documentation |
| **Obsolete Doc References** | Remove `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` references | `BUILDER_AUDIT.md`, `SECURITY.md` |

### Low Priority (Nice to Have)

| Item | Action | Files |
|------|--------|-------|
| **RAGUploadTabs** | The `checkSecrets` function always returns `false` (placeholder) - wire to actual secret checking | `RAGUploadTabs.tsx:34` |

---

## 7️⃣ Conclusion

The secrets model is **mostly correctly implemented** with proper separation and usage patterns:

- ✅ AI secrets (LOVABLE_API_KEY + Google) are correctly isolated to AI/Copilot functions
- ✅ Optional integrations (Firecrawl, Arcade) gracefully degrade when not configured
- ✅ OAuth secrets (Google, Microsoft) are correctly used only in RAG connectors
- ⚠️ **Missing:** Dedicated Secrets Management UI component
- ⚠️ **Missing:** Zapier secrets not in configured list but used in code
- ⚠️ **Missing:** Deploy secret validation for cloud providers

**Overall Status: 5/7 Passed, 2/7 Partial/Failed**
