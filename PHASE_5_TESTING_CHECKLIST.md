# Phase 5: End-to-End Testing Checklist

## ✅ Phase 1-4 Status
- ✅ Phase 1: Core Unified Service - COMPLETE
- ✅ Phase 2: Refactor All Entry Points - COMPLETE  
- ✅ Phase 3: Fix File Upload Pipeline - COMPLETE
- ✅ Phase 4: Session Management - COMPLETE (using agent_drafts table)

## 🧪 Phase 5: Comprehensive Testing

### Test Matrix

#### 1. Dashboard URL Intake ✅ ENHANCED
**Path**: Dashboard → Smart search bar → Paste URL → Submit

**Expected Flow**:
1. User pastes URL (e.g., `https://example.com`)
2. System calls `startBuilderFromUrl(url, userId)`
3. Calls `url-turbo-capture` edge function to analyze website
4. Extracts site title, description, content, and industry
5. Creates blueprint with rich website context
6. Creates session in `agent_drafts` table
7. Navigates to `/builder?session={sessionId}`
8. Builder loads with Step 1 & 2 pre-filled from analysis

**Test Cases**:
- ✅ Valid HTTPS URL → Full analysis
- ✅ HTTP URL (auto-upgraded to HTTPS) → Full analysis
- ✅ URL without protocol (adds https://) → Full analysis
- ⚠️ Invalid URL format → Error before analysis
- ⚠️ Unreachable URL → Fallback to basic blueprint
- ⚠️ URL with special characters → Should handle gracefully
- ⚠️ Analysis timeout → Fallback to basic blueprint

**Success Criteria**:
- Session created in database
- Blueprint stored with `source: 'url'`
- Website title used as agent name
- Site description populated
- Industry auto-detected
- Knowledge base includes URL
- No duplicate sessions
- User redirected to builder
- Step 1 shows website-based data

---

#### 2. Dashboard File Upload ⚠️ NEEDS TESTING
**Path**: Dashboard → Upload a file → Select file → Analyze → Build in Studio

**Expected Flow**:
1. User uploads file (PDF, DOCX, etc.)
2. System creates job in `document_analysis_jobs`
3. Returns `jobId` immediately
4. Status polling starts (every 1.5s)
5. When complete, calls `startBuilderFromFile(jobId, userId)`
6. Creates blueprint from analysis result
7. Creates session in `agent_drafts`
8. Navigates to builder

**Test Cases**:
- ✅ Small PDF (< 5 pages)
- ✅ Medium PDF (5-20 pages)
- ✅ Large PDF (20-50 pages)
- ⚠️ Very large PDF (> 25MB)
- ✅ DOCX document
- ✅ XLSX spreadsheet
- ✅ PPTX presentation
- ⚠️ Unsupported format
- ⚠️ Corrupted file
- ⚠️ Password-protected file

**Error Scenarios**:
- ❌ No jobId returned (CRITICAL BUG - must fix)
- ❌ jobId undefined in status polling
- ⚠️ Analysis timeout
- ⚠️ Gemini API error

**Success Criteria**:
- Job tracked correctly
- No "jobId undefined" errors
- RAG sources created
- Step 1 & 2 pre-filled
- Blueprint contains `builderPrefill` data

---

#### 3. Builder Step 2 File Upload ⚠️ NEEDS TESTING
**Path**: Builder → Step 2 Intelligence → Upload Knowledge → Analyze

**Expected Flow**:
1. User already in builder (existing session)
2. Uploads document in Step 2
3. Follows same analysis flow as dashboard upload
4. **CRITICAL**: Must update existing session, not create new one
5. Augments current blueprint with RAG data
6. User stays on Step 2

**Test Cases**:
- ✅ Upload while in template-based session
- ✅ Upload while in questionnaire-based session
- ✅ Upload while in URL-based session
- ⚠️ Multiple uploads in same session

**Success Criteria**:
- Session ID stays the same
- Blueprint updated, not replaced
- RAG sources added to existing blueprint
- Step 2 shows new knowledge sources
- No navigation away from builder

---

#### 4. Dashboard Questionnaire ⚠️ NEEDS TESTING
**Path**: Dashboard → Answer a questionnaire → Fill form → Submit

**Expected Flow**:
1. User opens questionnaire wizard
2. Fills out form (industry, department, use case, etc.)
3. Calls `startBuilderFromQuestionnaire(answers, userId)`
4. Creates blueprint from questionnaire mapping
5. Creates session
6. Navigates to builder

**Test Cases**:
- ✅ Complete questionnaire
- ⚠️ Partial questionnaire
- ✅ Different industries
- ✅ Different agent types (twin vs assistant)

**Success Criteria**:
- Answers mapped to blueprint fields
- Step 1 shows questionnaire data
- Step 3 shows recommended integrations
- Step 4 shows suggested workflows

---

#### 5. Dashboard Template Selection ⚠️ NEEDS TESTING
**Path**: Dashboard → Start with a template → Select template

**Expected Flow**:
1. User opens template library
2. Selects template (e.g., "Building Permit Application Processing Twin")
3. Calls `startBuilderFromTemplate(templateId, userId, 'dashboard')`
4. Fetches template from database
5. Maps all template fields to blueprint
6. Creates session
7. Navigates to builder

**Test Cases**:
- ✅ Building Permit Application Processing Twin
- ✅ At least 3 other templates from different industries
- ⚠️ Template with missing fields
- ⚠️ Template not found

**Success Criteria**:
- Builder Step 1-4 populated from template
- NO "Process Twin" default text
- Template name, description, ROI correct
- Recommended tools from template shown
- Workflow nodes from template loaded

---

#### 6. Template Marketplace ⚠️ NEEDS TESTING
**Path**: Marketplace → Industry Agents Tab → Use Template

**Expected Flow**:
1. User browses marketplace
2. Clicks "Use Template" on any card
3. Same flow as dashboard template selection
4. Must use same `startBuilderFromTemplate` function

**Test Cases**:
- ✅ Use Template from card
- ✅ Use Template from detail drawer
- ✅ Preview then Use Template

**Success Criteria**:
- Same results as dashboard template selection
- No duplicate logic
- Proper source tracking (`source: 'marketplace'`)

---

#### 7. Template Marketplace (M2M Templates) ⚠️ NEEDS TESTING
**Path**: Marketplace → M2M Templates Tab → Use Template

**Expected Flow**:
- Same as Industry Agents tab
- Different template table (`m2m_templates` vs `industry_templates`)

**Test Cases**:
- ✅ Use M2M template
- ✅ Verify different template structure handled

---

### State Management Tests

#### 8. No Cross-Contamination ⚠️ CRITICAL
**Scenarios**:
1. Open Template A → Builder opens
2. Navigate back to dashboard → Open Template B
3. **Expected**: Builder shows Template B, not Template A
4. **Bug**: Blueprint not replaced, old data mixed in

**Test**:
- Select multiple templates in sequence
- Upload file while in template session
- Switch between intake methods
- Verify `useBlueprintStore` clears correctly

---

#### 9. Session Persistence ⚠️ NEEDS TESTING
**Scenarios**:
1. Start from template → Close browser
2. Reopen → Navigate to `/builder?session={id}`
3. **Expected**: Session loads from database
4. **Bug**: Session not found or stale

**Test**:
- Create session → Close tab → Reopen URL
- Verify all steps restored
- Check wizard state persisted

---

#### 10. Back/Forward Navigation ⚠️ NEEDS TESTING
**Scenarios**:
1. Dashboard → Builder (from template)
2. Browser back button
3. **Expected**: Return to dashboard, no orphaned session
4. Forward button → Returns to builder with same session

**Test**:
- Browser back/forward
- Manual URL entry
- Check for duplicate sessions

---

### Error Handling Tests

#### 11. File Upload Errors ⚠️ CRITICAL
**Scenarios**:
- File too large (> 25MB)
- Unsupported format
- Corrupted file
- Network failure during upload
- Gemini API timeout
- Analysis failed

**Expected**:
- Clear error message in UI
- No hanging spinner
- No orphaned jobs in database
- User can retry or choose different file

---

#### 12. Template Fetch Errors ⚠️ NEEDS TESTING
**Scenarios**:
- Template not found
- Database query fails
- Network timeout

**Expected**:
- Error toast shown
- User not navigated to broken builder
- Can retry or select different template

---

#### 13. Session Creation Errors ⚠️ NEEDS TESTING
**Scenarios**:
- Database write fails
- RLS policy blocks insert
- User not authenticated

**Expected**:
- Error caught and displayed
- No partial sessions
- User prompted to sign in if needed

---

## 🐛 Known Issues to Fix

### CRITICAL
1. ❌ **jobId undefined in file upload status polling**
   - Location: `useDocumentAnalysis.ts`, `document-analysis-status`
   - Impact: Users see "Analyzing with Gemini AI" indefinitely
   - Fix: Validate jobId before polling, better error handling

2. ❌ **Template → Builder not mapping correctly**
   - Location: `unifiedIntakeService.ts` `convertToBlueprint`
   - Impact: Builder shows "Process Twin" instead of actual template
   - Fix: Ensure all template fields mapped to blueprint

3. ❌ **Session cross-contamination**
   - Location: `useBlueprintStore`
   - Impact: Old blueprint data bleeds into new sessions
   - Fix: Clear store when starting new intake

### HIGH PRIORITY
4. ✅ **URL analysis implementation - COMPLETE**
   - Location: `convertToBlueprint` case 'url'
   - Status: Now calls `url-turbo-capture` for real website analysis
   - Impact: URL intake creates rich blueprints with site context
   - Note: Has fallback for failed analysis

5. ⚠️ **File upload in Builder Step 2 creates new session**
   - Location: `ModernFileUploadWizard`, `Step2Intelligence`
   - Impact: User loses current session, starts fresh
   - Fix: Pass `existingSessionId` to `startBuilderFromFile`

### MEDIUM PRIORITY
6. ⚠️ **No performance optimization for large files**
   - Location: `document-analysis-start` edge function
   - Impact: Large PDFs cause timeouts or slow analysis
   - Fix: Chunking, summarization before Gemini

7. ⚠️ **Error messages not user-friendly**
   - Location: All intake flows
   - Impact: Users see technical errors
   - Fix: Map errors to friendly messages

---

## 📋 Testing Protocol

### Manual Testing Steps
1. **Dashboard URL** → Test 3 different URLs
2. **Dashboard File Upload** → Test 3 file types
3. **Dashboard Questionnaire** → Fill completely
4. **Dashboard Template** → Try 5 different templates
5. **Marketplace Templates** → Try 3 industry, 2 M2M
6. **Builder Step 2 Upload** → Upload in existing session
7. **State Management** → Switch between intakes
8. **Error Scenarios** → Trigger each error type

### Automated Testing
- Run `tests/integration/unified-intake-service.test.ts`
- Check console for errors
- Monitor network tab for failed requests
- Verify database records created correctly

---

## ✅ Acceptance Criteria

### Phase 5 Complete When:
- [ ] All 13 test scenarios pass
- [ ] No jobId errors in console
- [ ] All templates map correctly to builder
- [ ] No session cross-contamination
- [ ] Error handling graceful everywhere
- [ ] No data loss or duplication
- [ ] Performance acceptable (< 5s for file analysis)
- [ ] All regression tests pass

---

## 🚀 Next Steps After Phase 5
1. **Performance Optimization** (if needed)
2. **URL analysis enhancement** (Phase 3 improvement)
3. **Advanced error recovery**
4. **User-facing documentation**
5. **Monitoring & logging improvements**
