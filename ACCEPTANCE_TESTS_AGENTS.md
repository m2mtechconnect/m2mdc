# Agent Templates - Acceptance Tests

## Test Suite 1: Compliance AI Template

### TC-101: Template Selection
**Steps:**
1. Navigate to /builder
2. Step 2: Choose Template
3. Select "Compliance AI Assistant"

**Expected:**
- Template card highlights
- Config prefills:
  - Model: `google/gemini-2.5-flash`
  - Temperature: 0.3
  - TopK: 10, TopN: 5
  - Hybrid search: enabled
  - System prompt populated

**Pass Criteria:** Configuration auto-applied

---

### TC-102: Agent Creation
**Steps:**
1. Complete all builder steps with Compliance template
2. Click "Deploy Agent"
3. Verify agent created

**Expected:**
- Record in `agents` table
- `template_id` = 'compliance-ai'
- Status = 'deployed'
- Toast: "Agent deployed successfully"

**Pass Criteria:** Agent persisted with template link

---

### TC-103: Agent Workspace Access
**Steps:**
1. Deploy Compliance AI agent
2. Navigate to `/agent/{id}`
3. Verify workspace loads

**Expected:**
- Agent name and description displayed
- Template badge shown
- 4 KPI cards visible
- Chat interface ready
- Sample prompts displayed

**Pass Criteria:** Workspace fully functional

---

### TC-104: Compliance AI Chat
**Steps:**
1. Open agent workspace
2. Click sample prompt: "Review our data privacy policy for GDPR compliance"
3. Wait for response

**Expected:**
- Message sent to `agent_messages` table
- Edge function `agent-execute` invoked
- Lovable AI (Gemini 2.5 Flash) responds
- Response stored in database
- Response displays in chat with markdown

**Pass Criteria:** Full chat flow works

---

### TC-105: Conversation Persistence
**Steps:**
1. Send 3 messages
2. Refresh page
3. Verify history retained

**Expected:**
- All 3 messages still visible
- `agent_conversations` table has record
- `agent_messages` table has 6 rows (3 user + 3 assistant)
- conversation_id persists

**Pass Criteria:** State persists across sessions

---

### TC-106: Export Functionality
**Steps:**
1. Have active conversation
2. Click "Export" → JSON
3. Download file

**Expected:**
- Edge function `agent-export` invoked
- JSON file downloads
- Contains: agent config, messages, runs, timestamp
- Record in `agent_exports` table

**Pass Criteria:** Export completes successfully

---

### TC-107: KPI Tracking
**Steps:**
1. Send 10 queries
2. Check KPIs on workspace

**Expected:**
- Total Runs: 10
- Success Rate: 100%
- Avg Response Time: <2000ms
- Last Run: just now

**Pass Criteria:** KPIs update real-time

---

### TC-108: RAG Integration
**Steps:**
1. Configure Vertex hybrid search
2. Enable grounding
3. Ask: "What are our current policies?"

**Expected:**
- Response grounded in indexed documents
- Citations included
- `topK=10, topN=5` applied
- Vertex region: northamerica-northeast1

**Pass Criteria:** RAG pipeline functional

---

## Test Suite 2: Model Marketplace Integration

### TC-109: Model Selection Pre-fills RAG
**Steps:**
1. Go to Builder step 4 (Configure AI)
2. Open Model Marketplace
3. Select "Google Gemini 2.5 Pro"

**Expected:**
- `selectedModel` in state = "gemini-2.5-pro"
- RAG settings auto-adjust:
  - topK: 15
  - topN: 8
  - temperature: 0.7
  - hybridSearch: true

**Pass Criteria:** Model selection updates config

---

### TC-110: Template + Model Override
**Steps:**
1. Load Compliance AI template (temp=0.3)
2. Select different model with different config
3. Verify override works

**Expected:**
- User's model selection takes precedence
- Temperature updates to model default
- Template config overridden

**Pass Criteria:** User choice respected

---

## Test Suite 3: Error Handling

### TC-111: Missing LOVABLE_API_KEY
**Steps:**
1. Remove LOVABLE_API_KEY secret (simulate)
2. Send agent message
3. Observe error handling

**Expected:**
- Error caught in edge function
- Toast: "Configuration error"
- Message not stored
- Run logged as 'error'

**Pass Criteria:** Graceful failure

---

### TC-112: Network Timeout
**Steps:**
1. Simulate slow network (dev tools)
2. Send agent message
3. Wait >30s

**Expected:**
- Loading spinner visible
- No UI freeze
- Timeout error caught
- User informed

**Pass Criteria:** Timeout handled

---

## Test Suite 4: Database Integrity

### TC-113: Cascade Deletes
**Steps:**
1. Deploy agent
2. Create conversation
3. Delete agent
4. Query `agent_conversations` table

**Expected:**
```sql
SELECT * FROM agent_conversations WHERE agent_id = '{deleted_id}';
```
- Returns 0 rows
- Conversations cascade deleted
- Messages also removed

**Pass Criteria:** Referential integrity maintained

---

### TC-114: RLS Enforcement
**Steps:**
1. User A creates agent
2. User B queries:
```sql
SELECT * FROM agents WHERE id = '{user_a_agent_id}';
```

**Expected:**
- User B sees own agents only
- User A's agents hidden
- RLS enforced at DB level

**Pass Criteria:** Data isolation works

---

## Test Suite 5: Telemetry & Logging

### TC-115: Action Logging
**Steps:**
1. Connect integration
2. Test integration
3. Disconnect integration
4. Query logs

**Expected:**
```sql
SELECT action, status, duration_ms 
FROM integration_logs 
ORDER BY created_at DESC 
LIMIT 3;
```
- 3 rows: connect, test, disconnect
- All have status='success'
- Duration captured

**Pass Criteria:** All actions logged

---

### TC-116: Performance Metrics
**Steps:**
1. Execute agent 50 times
2. Check `agent_runs` table

**Expected:**
```sql
SELECT AVG(duration_ms), MIN(duration_ms), MAX(duration_ms)
FROM agent_runs
WHERE agent_id = '{agent_id}';
```
- Avg < 2000ms
- Min > 50ms
- Max < 5000ms

**Pass Criteria:** Performance within targets

---

## Test Suite 6: E2E Scenarios

### TC-117: End-to-End Template Deploy
**Steps:**
1. Click "Browse Templates"
2. Select "Compliance AI"
3. Complete all 6 steps
4. Deploy
5. Access workspace
6. Run test query
7. Export results

**Expected:**
- All steps complete without errors
- Agent accessible at `/agent/{id}`
- Query returns grounded response
- Export downloads successfully

**Pass Criteria:** Full workflow success

---

### TC-118: Multi-User Concurrent Access
**Steps:**
1. User A deploys Compliance AI
2. User B deploys Finance AI
3. Both query simultaneously

**Expected:**
- No conflicts
- Responses isolated
- Database handles concurrency
- No race conditions

**Pass Criteria:** Multi-tenancy works

---

## Performance Benchmarks

| Metric | Target | Test Result |
|--------|--------|-------------|
| Page Load | <1s | ___ |
| Agent Response | <2s | ___ |
| Export Generate | <5s | ___ |
| Filter Apply | <100ms | ___ |
| Database Query | <200ms | ___ |

## Security Checklist

- [ ] RLS enabled on all tables
- [ ] No service_role_key exposed
- [ ] API keys encrypted in DB
- [ ] RBAC enforced on all endpoints
- [ ] SQL injection prevented
- [ ] XSS sanitized
- [ ] CORS headers correct
- [ ] Auth required on sensitive functions

## Deployment Checklist

- [ ] All migrations applied
- [ ] Edge functions deployed
- [ ] Secrets configured
- [ ] Database indexed
- [ ] RLS policies tested
- [ ] Error monitoring active
- [ ] Logs accessible
- [ ] Rollback plan ready

**Final Status:** ⏳ Awaiting full E2E validation
**Blockers:** None - all core systems functional
