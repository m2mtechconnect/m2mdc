# AOC Comprehensive Test Plan

Complete testing strategy for Agent Operations Center covering all features, flows, and acceptance criteria.

## Test Execution Summary

| Category | Total Tests | Status |
|----------|-------------|--------|
| Runtime Controls | 12 | ⏳ Pending |
| Panel Loading | 6 | ⏳ Pending |
| Real-time Features | 8 | ⏳ Pending |
| Workflow Visualization | 6 | ⏳ Pending |
| Metrics & Analytics | 10 | ⏳ Pending |
| User Flows | 16 | ⏳ Pending |
| Security & RBAC | 8 | ⏳ Pending |
| Integration Points | 12 | ⏳ Pending |

**Total Test Cases**: 78

---

## Test Categories

### 1. Runtime Controls Testing

#### 1.1 Agent Start Functionality
```typescript
describe('Agent Start Control', () => {
  test('starts agent with valid configuration', async () => {
    // Pre-conditions: Agent in 'stopped' state
    // Action: Click Start button
    // Expected: Agent transitions to 'active' within 10 seconds
  });

  test('prevents start with invalid workflow', async () => {
    // Pre-conditions: Agent has no actions defined
    // Action: Click Start button
    // Expected: Error message "Workflow actions required"
  });

  test('requires proper permissions to start', async () => {
    // Pre-conditions: User lacks agents:write permission
    // Action: Click Start button
    // Expected: Permission denied error
  });
});
```

#### 1.2 Agent Pause Functionality
```typescript
describe('Agent Pause Control', () => {
  test('pauses active agent successfully', async () => {
    // Pre-conditions: Agent in 'active' state
    // Action: Click Pause button
    // Expected: Agent transitions to 'paused'
  });

  test('allows pause with custom duration', async () => {
    // Pre-conditions: Agent active
    // Action: Pause with 1 hour duration
    // Expected: Auto-resumes after 1 hour
  });

  test('preserves in-flight requests during pause', async () => {
    // Pre-conditions: Agent processing request
    // Action: Pause agent
    // Expected: Current request completes, new ones queued
  });
});
```

#### 1.3 Agent Stop Functionality
```typescript
describe('Agent Stop Control', () => {
  test('stops agent with confirmation', async () => {
    // Pre-conditions: Agent active
    // Action: Click Stop → Confirm
    // Expected: Agent transitions to 'stopped'
  });

  test('cancels stop on dismiss', async () => {
    // Pre-conditions: Agent active
    // Action: Click Stop → Cancel
    // Expected: Agent remains active
  });

  test('handles emergency stop (Cmd+Shift+S)', async () => {
    // Pre-conditions: Agent active
    // Action: Press keyboard shortcut
    // Expected: Immediate stop without confirmation
  });
});
```

#### 1.4 Agent Restart Functionality
```typescript
describe('Agent Restart Control', () => {
  test('restarts agent successfully', async () => {
    // Pre-conditions: Agent active
    // Action: Click Restart
    // Expected: Agent stops then starts (10-15 seconds)
  });

  test('preserves configuration on restart', async () => {
    // Pre-conditions: Agent with custom config
    // Action: Restart agent
    // Expected: Same config retained
  });
});
```

---

### 2. Panel Loading Tests

#### 2.1 Activity Stream Panel
```typescript
describe('Activity Stream Panel', () => {
  test('loads recent logs on initial render', async () => {
    // Expected: Last 100 logs displayed
  });

  test('shows loading state during fetch', async () => {
    // Expected: Skeleton loader visible
  });

  test('handles empty state gracefully', async () => {
    // Pre-conditions: New agent, no logs
    // Expected: "No activity yet" message
  });

  test('displays error state on failure', async () => {
    // Pre-conditions: Database unreachable
    // Expected: Error message with retry button
  });
});
```

#### 2.2 Metrics Panel
```typescript
describe('Metrics Panel', () => {
  test('loads all KPI cards', async () => {
    // Expected: Success Rate, Avg Latency, Total Runs visible
  });

  test('calculates metrics correctly', async () => {
    // Pre-conditions: Known test data
    // Expected: Correct calculations
  });

  test('updates metrics on interval', async () => {
    // Expected: Refresh every 30 seconds
  });
});
```

#### 2.3 Workflow Graph Panel
```typescript
describe('Workflow Graph Panel', () => {
  test('renders workflow visualization', async () => {
    // Expected: All nodes and edges displayed
  });

  test('handles complex workflows', async () => {
    // Pre-conditions: 20+ node workflow
    // Expected: Renders without performance issues
  });

  test('shows empty state for no workflow', async () => {
    // Pre-conditions: Agent without workflow
    // Expected: "No workflow configured" message
  });
});
```

#### 2.4 Control Panel
```typescript
describe('Control Panel', () => {
  test('displays current agent status', async () => {
    // Expected: Status badge shows correct state
  });

  test('shows available actions based on state', async () => {
    // Pre-conditions: Agent stopped
    // Expected: Only "Start" button enabled
  });
});
```

#### 2.5 Recent Activity Panel
```typescript
describe('Recent Activity Panel', () => {
  test('shows latest runs summary', async () => {
    // Expected: Last 10 runs displayed
  });

  test('highlights errors prominently', async () => {
    // Pre-conditions: Recent failed runs
    // Expected: Error runs highlighted in red
  });
});
```

#### 2.6 Audit Trail Panel
```typescript
describe('Audit Trail Panel', () => {
  test('loads user actions history', async () => {
    // Expected: All control actions logged
  });

  test('shows user who made changes', async () => {
    // Expected: User name/email visible
  });
});
```

---

### 3. Real-time Features Tests

#### 3.1 Log Streaming
```typescript
describe('Real-time Log Streaming', () => {
  test('streams new logs as they occur', async () => {
    // Action: Trigger agent action
    // Expected: Log appears within 100ms
  });

  test('maintains scroll position on new logs', async () => {
    // Pre-conditions: User scrolled up
    // Expected: New logs don't auto-scroll
  });

  test('auto-scrolls when at bottom', async () => {
    // Pre-conditions: Scrolled to bottom
    // Expected: New logs auto-scroll into view
  });

  test('reconnects on WebSocket disconnect', async () => {
    // Action: Simulate network drop
    // Expected: Auto-reconnects within 5 seconds
  });
});
```

#### 3.2 Status Updates
```typescript
describe('Real-time Status Updates', () => {
  test('updates agent status immediately', async () => {
    // Action: Start agent
    // Expected: Status changes in UI instantly
  });

  test('updates metrics in real-time', async () => {
    // Action: Complete agent run
    // Expected: Total runs increments
  });
});
```

#### 3.3 Presence Tracking
```typescript
describe('Team Presence', () => {
  test('shows other viewers in real-time', async () => {
    // Action: Second user opens same agent
    // Expected: Avatar appears in header
  });

  test('removes presence on disconnect', async () => {
    // Action: User closes tab
    // Expected: Avatar disappears
  });
});
```

---

### 4. Workflow Visualization Tests

#### 4.1 Graph Rendering
```typescript
describe('Workflow Graph Rendering', () => {
  test('renders all node types correctly', async () => {
    // Expected: Trigger, Condition, Action nodes visible
  });

  test('draws edges between connected nodes', async () => {
    // Expected: Lines connect related nodes
  });

  test('applies correct styling to nodes', async () => {
    // Expected: Color-coded by type
  });
});
```

#### 4.2 Interactive Features
```typescript
describe('Workflow Graph Interaction', () => {
  test('shows node details on click', async () => {
    // Action: Click node
    // Expected: Drawer opens with details
  });

  test('highlights active path during execution', async () => {
    // Pre-conditions: Agent running
    // Expected: Current nodes pulse/highlight
  });

  test('allows zoom and pan', async () => {
    // Action: Scroll to zoom, drag to pan
    // Expected: Graph responds smoothly
  });
});
```

---

### 5. Metrics & Analytics Tests

#### 5.1 Success Rate Calculation
```typescript
describe('Success Rate Metric', () => {
  test('calculates success rate correctly', async () => {
    // Pre-conditions: 98 successful, 2 failed runs
    // Expected: 98% success rate
  });

  test('updates on new run completion', async () => {
    // Action: Complete new run
    // Expected: Metric recalculates
  });

  test('shows trend indicator', async () => {
    // Expected: Up/down arrow with percentage change
  });
});
```

#### 5.2 Latency Metrics
```typescript
describe('Latency Metrics', () => {
  test('calculates average latency', async () => {
    // Pre-conditions: Known run durations
    // Expected: Correct average displayed
  });

  test('shows percentile breakdowns (P50, P90, P95, P99)', async () => {
    // Action: Click metric card
    // Expected: Detailed breakdown visible
  });
});
```

#### 5.3 Custom KPI Events
```typescript
describe('KPI Analytics Events', () => {
  test('fires event on agent start', async () => {
    // Action: Start agent
    // Expected: Analytics event logged
  });

  test('tracks error occurrences', async () => {
    // Pre-conditions: Agent error occurs
    // Expected: Error event captured
  });
});
```

---

### 6. User Flow Tests

#### 6.1 Template → Build → Deploy → Manage
```typescript
describe('Template Flow', () => {
  test('complete template to AOC flow', async ({ page }) => {
    // 1. Browse templates
    await page.goto('/templates');
    await page.click('text=YVR Airport');
    
    // 2. Use template
    await page.click('button:has-text("Use This Template")');
    
    // 3. Build agent
    await page.fill('[name="name"]', 'Test Agent');
    await page.click('button:has-text("Next")');
    // ... complete all steps
    
    // 4. Deploy
    await page.click('button:has-text("Deploy")');
    await expect(page.locator('text=Successfully deployed')).toBeVisible();
    
    // 5. Open AOC
    await page.click('button:has-text("Manage")');
    await expect(page.url()).toContain('/operations');
    
    // 6. Verify AOC loaded
    await expect(page.locator('text=Agent Operations')).toBeVisible();
    await expect(page.locator('.activity-stream')).toBeVisible();
  });
});
```

#### 6.2 Scanner → Build → Deploy → Manage
```typescript
describe('URL Scanner Flow', () => {
  test('scanner to AOC flow', async ({ page }) => {
    // 1. Enter URL
    await page.goto('/');
    await page.fill('input[placeholder*="Enter website URL"]', 'https://example.com');
    await page.click('button:has-text("Scan")');
    
    // 2. Review recommendations
    await expect(page.locator('text=Recommended Template')).toBeVisible();
    
    // 3. Build agent
    await page.click('button:has-text("Build Agent")');
    // ... complete builder
    
    // 4. Deploy & Manage
    await page.click('button:has-text("Deploy")');
    await page.click('button:has-text("Manage")');
    
    // 5. Verify AOC
    await expect(page.url()).toContain('/operations');
  });
});
```

#### 6.3 File Upload → Build → Deploy → Manage
```typescript
describe('File Upload Flow', () => {
  test('document upload to AOC flow', async ({ page }) => {
    // 1. Upload file
    await page.goto('/upload');
    const input = await page.locator('input[type="file"]');
    await input.setInputFiles('test-doc.pdf');
    
    // 2. Review analysis
    await expect(page.locator('text=Document Analyzed')).toBeVisible();
    
    // 3. Build agent
    await page.click('button:has-text("Build Agent")');
    // ... complete builder
    
    // 4. Deploy & Manage
    await page.click('button:has-text("Deploy")');
    await page.click('button:has-text("Manage")');
    
    // 5. Verify AOC
    await expect(page.url()).toContain('/operations');
  });
});
```

#### 6.4 Blank Build → Deploy → Manage
```typescript
describe('Blank Build Flow', () => {
  test('blank agent to AOC flow', async ({ page }) => {
    // 1. Start blank
    await page.goto('/builder');
    await page.click('button:has-text("Start from Scratch")');
    
    // 2. Configure agent
    await page.fill('[name="name"]', 'Custom Agent');
    await page.fill('[name="description"]', 'My custom agent');
    // ... complete all steps
    
    // 3. Deploy & Manage
    await page.click('button:has-text("Deploy")');
    await page.click('button:has-text("Manage")');
    
    // 5. Verify AOC
    await expect(page.url()).toContain('/operations');
  });
});
```

---

### 7. Security & RBAC Tests

#### 7.1 Authentication
```typescript
describe('Authentication', () => {
  test('redirects unauthenticated users to login', async () => {
    // Pre-conditions: User not logged in
    // Action: Navigate to /app/agents/123/operations
    // Expected: Redirected to /login
  });

  test('maintains session across navigation', async () => {
    // Action: Navigate between pages
    // Expected: User stays logged in
  });
});
```

#### 7.2 Role-Based Access Control
```typescript
describe('RBAC Enforcement', () => {
  test('admin can access all features', async () => {
    // Pre-conditions: User has admin role
    // Expected: All controls enabled
  });

  test('operator can control but not configure', async () => {
    // Pre-conditions: User has operator role
    // Expected: Start/stop enabled, settings disabled
  });

  test('viewer has read-only access', async () => {
    // Pre-conditions: User has viewer role
    // Expected: All controls disabled
  });

  test('prevents privilege escalation', async () => {
    // Pre-conditions: User is viewer
    // Action: Attempt to modify localStorage role
    // Expected: Backend still enforces viewer permissions
  });
});
```

#### 7.3 Row-Level Security
```typescript
describe('RLS Policies', () => {
  test('users only see their org\'s agents', async () => {
    // Pre-conditions: Multi-org setup
    // Expected: User A cannot see User B's agents
  });

  test('enforces agent ownership on mutations', async () => {
    // Pre-conditions: User tries to modify another org's agent
    // Expected: Permission denied error
  });
});
```

---

### 8. Integration Points Tests

#### 8.1 Builder Integration
```typescript
describe('Builder Integration', () => {
  test('opens builder from AOC', async () => {
    // Action: Click "Edit Configuration"
    // Expected: Builder opens with agent pre-loaded
  });

  test('syncs changes from builder to AOC', async () => {
    // Action: Update agent in builder
    // Expected: Changes reflected in AOC
  });
});
```

#### 8.2 Environment Promotions
```typescript
describe('Environment Promotions', () => {
  test('promotes agent from dev to staging', async () => {
    // Action: Click "Promote to Staging"
    // Expected: Agent created in staging environment
  });

  test('preserves configuration during promotion', async () => {
    // Expected: Same config in promoted agent
  });

  test('requires approval for prod promotion', async () => {
    // Action: Attempt prod promotion
    // Expected: Approval workflow triggered
  });
});
```

#### 8.3 Quick Access Integration
```typescript
describe('Quick Access Integration', () => {
  test('shows active agents in header dropdown', async () => {
    // Action: Click Operations button
    // Expected: Dropdown shows active agents
  });

  test('navigates to AOC on agent selection', async () => {
    // Action: Click agent in dropdown
    // Expected: AOC opens for that agent
  });

  test('hides dropdown when no active agents', async () => {
    // Pre-conditions: No active agents
    // Expected: Operations button not visible
  });
});
```

#### 8.4 Digital Twin Integration
```typescript
describe('Digital Twin Integration', () => {
  test('shows spatial view for digital twins', async () => {
    // Pre-conditions: Agent is digital twin type
    // Expected: 3D view panel visible
  });

  test('displays sensor health data', async () => {
    // Pre-conditions: Twin has sensors
    // Expected: Sensor status cards visible
  });

  test('updates twin state in real-time', async () => {
    // Action: Sensor state changes
    // Expected: UI updates immediately
  });
});
```

---

## Test Execution Instructions

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure Supabase is running
supabase start

# Seed test data
npm run test:seed
```

### Running Tests

#### Unit Tests
```bash
# Run all unit tests
npm run test

# Run specific test file
npm run test src/components/aoc/__tests__/AOCIntegration.test.tsx

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

#### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Specific integration test
npm run test:integration -- --grep "Activity Stream"
```

#### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test
npm run test:e2e tests/aoc/aoc-complete-flow.spec.ts

# Debug mode
npm run test:e2e -- --debug
```

#### Regression Suite
```bash
# Run complete regression suite
npm run test:regression

# This runs:
# 1. Unit tests
# 2. Integration tests
# 3. E2E tests
# 4. Visual regression tests
```

---

## Test Data Management

### Seeding Test Data

```typescript
// tests/setup/seed.ts

export async function seedTestData() {
  // Create test user
  const { data: user } = await supabase.auth.signUp({
    email: 'test@aura.com',
    password: 'Test123!@#'
  });

  // Create test agents
  const testAgents = [
    { name: 'Test Agent 1', status: 'active' },
    { name: 'Test Agent 2', status: 'stopped' },
    { name: 'Test Agent 3', status: 'paused' },
  ];

  for (const agent of testAgents) {
    await supabase.from('agents').insert({
      ...agent,
      owner_id: user.id,
      config: { model: 'gpt-4' },
      workflow_graph_id: 'test-workflow'
    });
  }

  // Create test logs
  await supabase.from('agent_action_logs').insert([
    { system_id: 'agent-1', action_key: 'test', status: 'success' },
    { system_id: 'agent-1', action_key: 'test', status: 'error' },
  ]);
}
```

### Cleanup After Tests

```typescript
afterEach(async () => {
  // Clean up test data
  await supabase.from('agent_action_logs').delete().match({ system_id: 'test-agent' });
  await supabase.from('agents').delete().match({ name: 'Test Agent' });
});
```

---

## Acceptance Criteria Checklist

### ✅ Feature Completeness

- [ ] All 6 panels implemented and functional
- [ ] All backend endpoints operational
- [ ] Real-time log streaming works
- [ ] Workflow graph is interactive
- [ ] Run/pause/stop/restart operations work
- [ ] Simulation sandbox functional
- [ ] Builder connection works properly
- [ ] Environment management operational
- [ ] KPI dashboards update correctly
- [ ] SSO + RBAC fully enforced

### ✅ Quality Standards

- [ ] No console errors in production
- [ ] No broken links anywhere
- [ ] All tests passing (78/78)
- [ ] Test coverage >80%
- [ ] Performance benchmarks met:
  - [ ] Initial load <2 seconds
  - [ ] Log streaming <100ms latency
  - [ ] Panel transitions <200ms
  - [ ] Metrics update <500ms

### ✅ User Experience

- [ ] Every deployed agent opens AOC via "Manage" button
- [ ] Quick access dropdown shows active agents
- [ ] Real-time updates work seamlessly
- [ ] Command palette (⌘K) functional
- [ ] Keyboard shortcuts work
- [ ] Mobile responsive design
- [ ] No UI glitches or layout issues

### ✅ Security

- [ ] RLS policies prevent data leakage
- [ ] RBAC enforced on all actions
- [ ] No privilege escalation possible
- [ ] Audit trail captures all changes
- [ ] SSO integration works (if enabled)

### ✅ Integration

- [ ] Builder opens from AOC
- [ ] Template flow ends in AOC
- [ ] Scanner flow ends in AOC
- [ ] Upload flow ends in AOC
- [ ] Digital twins show spatial views
- [ ] Environment promotions work

### ✅ Documentation

- [ ] User guide complete
- [ ] Admin guide complete
- [ ] Developer guide complete
- [ ] API documentation complete
- [ ] Troubleshooting guide complete
- [ ] FAQ complete

---

## Performance Benchmarks

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Initial page load | <2s | TBD | ⏳ |
| Log streaming latency | <100ms | TBD | ⏳ |
| Panel transition | <200ms | TBD | ⏳ |
| Metrics calculation | <500ms | TBD | ⏳ |
| Workflow graph render | <1s | TBD | ⏳ |
| Real-time update propagation | <200ms | TBD | ⏳ |

---

## Test Reporting

### Daily Test Summary
```
Date: 2024-01-XX
Environment: Staging

Unit Tests: 45/45 ✅
Integration Tests: 18/18 ✅
E2E Tests: 15/15 ✅

Coverage: 87% (target: 80%)
Performance: All benchmarks met

Blockers: None
Issues: 0 Critical, 2 Minor
```

### Weekly Regression Report
```
Week: XX/2024
Commits: 47
Test Runs: 235

Pass Rate: 98.7%
Flaky Tests: 2
New Tests Added: 8

Performance Trend: Stable
Coverage Trend: +2%
```

---

## Next Steps

1. **Execute Unit Tests** - Run all component tests
2. **Execute Integration Tests** - Test panel interactions
3. **Execute E2E Tests** - Test complete user flows
4. **Run Regression Suite** - Full system verification
5. **Performance Testing** - Benchmark all operations
6. **Security Audit** - Verify RBAC and RLS
7. **User Acceptance Testing** - Get stakeholder approval
8. **Production Deployment** - Go live!

---

**Test Plan Version**: 1.0  
**Last Updated**: 2025-12-01  
**Owner**: AURA Engineering Team
