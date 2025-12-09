# Integrations Hub - Acceptance Tests

## Prerequisites
- User must be logged in
- User must have `executive` role assigned
- Database migrations completed successfully

## Test Suite 1: Authentication & RBAC

### TC-001: Executive Access
**Steps:**
1. Log in as user with `executive` role
2. Navigate to /integrations
3. Verify page loads without errors

**Expected:**
- Integrations page displays
- All 25+ integration cards visible
- No access denied errors

**Pass Criteria:** User sees full integrations hub

---

### TC-002: Non-Executive Access Denied
**Steps:**
1. Log in as user without `executive` role
2. Navigate to /integrations
3. Observe access control

**Expected:**
- Alert shown: "Access Restricted"
- Message: "You need executive permissions to manage integrations"
- No integration cards displayed

**Pass Criteria:** Proper RBAC enforcement

---

## Test Suite 2: Filters & Search

### TC-003: Category Filter
**Steps:**
1. Load /integrations
2. Click "AI/LLM" category pill
3. Verify filtered results

**Expected:**
- URL updates to `?cat=AI/LLM`
- Only AI/LLM integrations shown (Gemini, Vertex, OpenAI, etc.)
- Other categories hidden

**Pass Criteria:** Filtering works, URL persists

---

### TC-004: Status Filter
**Steps:**
1. Load /integrations
2. Click "Connected" status button
3. Verify filtered results

**Expected:**
- URL updates to `?status=connected`
- Only connected integrations shown
- Count updates correctly

**Pass Criteria:** Status filtering functional

---

### TC-005: Search Functionality
**Steps:**
1. Type "salesforce" in search bar
2. Verify results update

**Expected:**
- URL updates to `?q=salesforce`
- Only Salesforce card shown
- Empty state if no matches

**Pass Criteria:** Search filters properly

---

### TC-006: Combined Filters
**Steps:**
1. Set category="AI/LLM"
2. Set status="connected"
3. Type query="gemini"

**Expected:**
- URL: `?q=gemini&cat=AI/LLM&status=connected`
- Only connected Gemini integrations shown
- Filters combine correctly

**Pass Criteria:** All filters work together

---

## Test Suite 3: Integration Actions

### TC-007: Test LLM Connection (Gemini)
**Steps:**
1. Find "Google Gemini" card (should be connected)
2. Click three-dot menu
3. Click "Test Connection"

**Expected:**
- Toast: "Running test..."
- Edge function `integrations-test` invoked
- Toast: "Test successful" with latency
- Database updated with test result

**Pass Criteria:** Test completes successfully

---

### TC-008: Connect New Integration (API Key)
**Steps:**
1. Find "OpenAI" card (not connected)
2. Click "Connect" or "Configure"
3. Enter API key in drawer
4. Save

**Expected:**
- Edge function `integrations-connect` invoked
- Record created in `integrations` table
- Card state updates to "Connected"
- Toast: "Connected successfully"

**Pass Criteria:** Integration connects and persists

---

### TC-009: Disconnect Integration
**Steps:**
1. Find connected integration
2. Click three-dot menu → "Remove"
3. Confirm deletion

**Expected:**
- Confirmation dialog appears
- Edge function `integrations-disconnect` invoked
- Record removed from database
- Card resets to "Not Connected"
- Toast: "Disconnected"

**Pass Criteria:** Integration disconnects cleanly

---

## Test Suite 4: Zapier Integration

### TC-010: Zapier Connect Flow
**Steps:**
1. Click "Connect Zapier App" button
2. Modal opens with app search
3. Select an app (e.g., "Salesforce")
4. Choose template
5. Complete OAuth flow

**Expected:**
- `ZapierConnectModal` displays
- App catalog searchable
- Templates shown for selected app
- OAuth redirect initiated

**Pass Criteria:** Zapier flow initiates correctly

---

### TC-011: Zapier Card Actions
**Steps:**
1. Find Zapier-connected integration (e.g., Salesforce)
2. Click "Connect via Zapier"
3. Verify redirect

**Expected:**
- URL opens: `https://zapier.com/app/connections?app=salesforce`
- Integration state persists

**Pass Criteria:** Deep linking works

---

## Test Suite 5: UI & Styling

### TC-012: Provider Logos Display
**Steps:**
1. Load /integrations
2. Inspect integration cards

**Expected:**
- All cards show proper logos (not emojis)
- Logos crisp in both light/dark mode
- Dark mode: logos inverted properly
- Fallback to initials if logo fails

**Pass Criteria:** Visual polish maintained

---

### TC-013: M2M Branding
**Steps:**
1. Inspect Zapier card styling
2. Check button glow effects
3. Verify color scheme

**Expected:**
- Gold (#FFD700) and Blue (#3AB6FF) accents
- Zapier card has gold border
- Buttons use `glow-yellow` class
- Carbon/Graphite backgrounds

**Pass Criteria:** Brand consistency

---

### TC-014: Region Badges
**Steps:**
1. Find Google Gemini or Vertex AI cards
2. Verify region badge

**Expected:**
- Badge shows 🇨🇦 flag
- Tooltip: "northamerica-northeast1"

**Pass Criteria:** Region displayed correctly

---

## Test Suite 6: Error Handling

### TC-015: Network Error Handling
**Steps:**
1. Disconnect network
2. Click "Test Connection"
3. Observe error handling

**Expected:**
- Toast: "Test failed" with error message
- No crash or white screen
- Error logged to console

**Pass Criteria:** Graceful degradation

---

### TC-016: Missing API Key
**Steps:**
1. Connect OpenAI without API key
2. Attempt test

**Expected:**
- Error: "API key required"
- Card state: "error"
- Error message stored in database

**Pass Criteria:** Validation prevents bad state

---

## Test Suite 7: Database Persistence

### TC-017: State Persistence
**Steps:**
1. Connect an integration
2. Refresh page
3. Verify state retained

**Expected:**
- Integration still shows "Connected"
- Last run time preserved
- Configuration intact

**Pass Criteria:** Database persistence works

---

### TC-018: Audit Logging
**Steps:**
1. Perform any integration action
2. Query `integration_logs` table

**Expected:**
```sql
SELECT * FROM integration_logs ORDER BY created_at DESC LIMIT 5;
```
- Action logged with timestamp
- User ID recorded
- Duration captured
- Status accurate

**Pass Criteria:** All actions logged

---

## Test Suite 8: Performance

### TC-019: Load Time
**Steps:**
1. Navigate to /integrations (cold load)
2. Measure time to interactive

**Expected:**
- Page renders < 1s
- Integration cards appear < 2s
- No layout shift

**Pass Criteria:** Fast initial load

---

### TC-020: Filter Performance
**Steps:**
1. Apply all filters rapidly
2. Type search query quickly

**Expected:**
- Filters apply instantly (<100ms)
- URL updates without lag
- No flickering

**Pass Criteria:** Responsive UX

---

## Automated Test Script

```typescript
describe('Integrations Hub E2E', () => {
  beforeEach(() => {
    cy.login('executive@example.com');
    cy.visit('/integrations');
  });

  it('should enforce RBAC', () => {
    cy.logout();
    cy.login('user@example.com');
    cy.visit('/integrations');
    cy.contains('Access Restricted').should('be.visible');
  });

  it('should filter by category', () => {
    cy.contains('AI/LLM').click();
    cy.url().should('include', 'cat=AI/LLM');
    cy.get('[data-testid="integration-card"]').each($card => {
      cy.wrap($card).contains('AI/LLM');
    });
  });

  it('should test LLM connection', () => {
    cy.contains('Google Gemini').parents('[data-testid="integration-card"]')
      .find('[aria-label="More options"]').click();
    cy.contains('Test Connection').click();
    cy.contains('Test successful').should('be.visible');
  });

  it('should persist filters in URL', () => {
    cy.get('input[placeholder*="Search"]').type('gemini');
    cy.contains('AI/LLM').click();
    cy.contains('Connected').click();
    cy.url().should('include', 'q=gemini');
    cy.url().should('include', 'cat=AI/LLM');
    cy.url().should('include', 'status=connected');
    cy.reload();
    cy.get('input[placeholder*="Search"]').should('have.value', 'gemini');
  });
});
```

## Sign-Off Checklist

- [ ] All 20 test cases pass
- [ ] RBAC enforced at DB and API levels
- [ ] Logos display correctly in both themes
- [ ] Filters persist via URL params
- [ ] Test functionality works for LLMs
- [ ] Connect/Disconnect flows complete
- [ ] Zapier integration functional
- [ ] Error handling graceful
- [ ] Telemetry logging active
- [ ] Performance benchmarks met
- [ ] Accessibility (WCAG AA)
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Database queries optimized

**Status:** ⏳ Ready for QA
**Blocker:** None
**Notes:** Full implementation delivered with 4 edge functions, 2 DB tables, RBAC, and 25+ integrations
