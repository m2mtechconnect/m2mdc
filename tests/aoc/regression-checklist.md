# AOC Regression Test Checklist

Manual verification checklist for final acceptance testing.

---

## 🎯 Runtime Controls

### Start Agent
- [ ] Click "Start" button
- [ ] Agent transitions from Stopped → Active within 10 seconds
- [ ] Status badge updates in UI
- [ ] Logs begin streaming immediately
- [ ] Metrics start calculating
- [ ] Workflow graph shows active state

### Pause Agent
- [ ] Click status indicator → Select "Pause"
- [ ] Agent transitions to Paused state
- [ ] Can set custom pause duration
- [ ] Resume button appears
- [ ] In-flight requests complete before pausing
- [ ] Auto-resume works if duration set

### Stop Agent
- [ ] Click status indicator → Select "Stop"
- [ ] Confirmation dialog appears
- [ ] Cancel works correctly
- [ ] Confirm stops agent within 5 seconds
- [ ] Status updates to Stopped
- [ ] Logs stop streaming
- [ ] Can restart manually

### Restart Agent
- [ ] Click status indicator → Select "Restart"
- [ ] Agent stops then starts
- [ ] Configuration preserved
- [ ] Completes within 15 seconds
- [ ] All functionality resumes normally

### Emergency Stop
- [ ] Press `⌘⇧S` / `Ctrl+Shift+S`
- [ ] Agent stops immediately without confirmation
- [ ] Warning appears explaining emergency stop
- [ ] Can restart after emergency stop

---

## 📊 Panel Loading

### Activity Stream Panel
- [ ] Loads last 100 logs on initial render
- [ ] Shows skeleton loader during fetch
- [ ] Empty state displays when no logs
- [ ] Error state appears on failure with retry
- [ ] Retry button works
- [ ] Scroll to load more logs works
- [ ] Auto-scrolls when at bottom
- [ ] Maintains position when scrolled up

### Metrics Panel
- [ ] Success Rate card displays correctly
- [ ] Average Latency card displays correctly
- [ ] Total Runs card displays correctly
- [ ] All metrics show trend indicators (↑ or ↓)
- [ ] Percentages calculated accurately
- [ ] Refresh every 30 seconds
- [ ] Manual refresh button works
- [ ] Hover shows detailed breakdown

### Workflow Graph Panel
- [ ] Graph renders all nodes
- [ ] Graph renders all edges
- [ ] Node colors match types (Trigger, Condition, Action)
- [ ] Zoom controls work
- [ ] Pan (drag) works
- [ ] Reset zoom works
- [ ] Empty state for no workflow
- [ ] Complex workflows (20+ nodes) render smoothly

### Control Panel
- [ ] Displays current agent status
- [ ] Status badge color correct (Green=Active, Yellow=Paused, Gray=Stopped, Red=Error)
- [ ] Available actions shown based on state
- [ ] Buttons disabled/enabled appropriately
- [ ] Agent name displayed
- [ ] Agent version shown
- [ ] Last heartbeat timestamp visible

### Recent Activity Panel
- [ ] Shows last 10 runs
- [ ] Displays run status
- [ ] Shows duration for each run
- [ ] Error runs highlighted in red
- [ ] Click run opens details
- [ ] Auto-updates on new runs

### Audit Trail Panel (if visible)
- [ ] Loads user actions history
- [ ] Shows who made changes
- [ ] Displays timestamps
- [ ] Includes action details
- [ ] Can filter by user
- [ ] Can filter by date range

---

## ⚡ Real-time Features

### Log Streaming
- [ ] New logs appear within 100ms of event
- [ ] Auto-scroll works when at bottom
- [ ] Scroll position maintained when scrolled up
- [ ] Pause streaming (spacebar) works
- [ ] Resume streaming works
- [ ] WebSocket connection established
- [ ] Reconnects automatically on disconnect
- [ ] No duplicate log entries
- [ ] Logs appear in correct order

### Status Updates
- [ ] Agent status changes reflect immediately in UI
- [ ] Metrics update in real-time
- [ ] Run count increments instantly
- [ ] Success rate recalculates on completion
- [ ] Latency updates with new runs

### Presence Tracking
- [ ] Shows other viewers' avatars
- [ ] Avatars appear when user joins
- [ ] Avatars disappear when user leaves
- [ ] Hover avatar shows user name
- [ ] Max 5 avatars shown (+ count if more)

---

## 🎨 Workflow Visualization

### Graph Rendering
- [ ] All node types render (Trigger, Condition, Action, Error Handler)
- [ ] Edges connect correct nodes
- [ ] Node labels visible
- [ ] Layout is readable and not overlapping
- [ ] Color coding matches node types

### Interactivity
- [ ] Click node opens details drawer
- [ ] Drawer shows execution count
- [ ] Drawer shows success/failure rate
- [ ] Drawer shows average duration
- [ ] Can close drawer
- [ ] Hover node shows tooltip

### Active Execution
- [ ] Active nodes pulse/highlight during execution
- [ ] Execution path animates through graph
- [ ] Completed nodes show success/failure color
- [ ] Current node indicator visible

### Controls
- [ ] Zoom in button works
- [ ] Zoom out button works
- [ ] Reset zoom button works
- [ ] Fit to screen button works
- [ ] Fullscreen toggle works
- [ ] Export graph (PNG/SVG) works

---

## 📈 Metrics & Analytics

### Success Rate
- [ ] Calculates correctly (successful / total * 100)
- [ ] Updates on new run completion
- [ ] Shows trend vs previous period
- [ ] P50/P90/P95/P99 breakdowns visible on click
- [ ] Color coding: Green >95%, Yellow 90-95%, Red <90%

### Latency
- [ ] Shows average latency in ms
- [ ] Updates on new run completion
- [ ] Shows trend indicator
- [ ] Percentile breakdown available
- [ ] Hover shows detailed distribution

### Total Runs
- [ ] Counts all runs accurately
- [ ] Updates immediately on new run
- [ ] Shows breakdown: This hour / Today / This week
- [ ] Trend indicator vs previous period

### Custom KPIs (if configured)
- [ ] Custom metrics display correctly
- [ ] Calculations accurate based on config
- [ ] Updates with new data
- [ ] Can be edited/configured

### Analytics Events
- [ ] Agent start event fires
- [ ] Agent stop event fires
- [ ] Error event fires on failures
- [ ] Custom events fire when configured

---

## 🚀 User Flows

### Template → Build → Deploy → Manage
1. [ ] Browse template marketplace
2. [ ] View template preview tabs
3. [ ] Click "Use This Template"
4. [ ] Builder opens with template pre-populated
5. [ ] Complete all 5 builder steps
6. [ ] Click "Deploy"
7. [ ] Deployment succeeds within 30 seconds
8. [ ] Click "Manage Agent"
9. [ ] AOC opens at /app/agents/{id}/operations
10. [ ] All panels load correctly
11. [ ] Can start agent and see it run

### Scanner → Build → Deploy → Manage
1. [ ] Enter website URL in scanner
2. [ ] Click "Scan Website"
3. [ ] Analysis completes within 30 seconds
4. [ ] Recommendations displayed
5. [ ] Click "Build Agent"
6. [ ] Builder opens with pre-populated data
7. [ ] Complete builder steps
8. [ ] Deploy successfully
9. [ ] Open AOC
10. [ ] All functionality works

### File Upload → Build → Deploy → Manage
1. [ ] Upload PDF/DOCX file
2. [ ] Document analysis runs
3. [ ] Results displayed
4. [ ] Click "Build Agent"
5. [ ] Builder pre-populated from document
6. [ ] Complete and deploy
7. [ ] Open AOC
8. [ ] Verify functionality

### Blank Build → Deploy → Manage
1. [ ] Click "Start from Scratch"
2. [ ] Manually configure agent in builder
3. [ ] Define workflow manually
4. [ ] Deploy agent
5. [ ] Open AOC
6. [ ] Everything works as expected

### Quick Access Flow
1. [ ] Deploy at least one agent
2. [ ] Click "Operations" in header
3. [ ] Dropdown shows active agents
4. [ ] Click agent name
5. [ ] AOC opens for that agent
6. [ ] Dropdown hides when no active agents
7. [ ] Dropdown auto-refreshes every 30 seconds

---

## 🔒 Security & RBAC

### Authentication
- [ ] Unauthenticated users redirect to login
- [ ] Authenticated users can access AOC
- [ ] Session persists across navigation
- [ ] Logout works correctly
- [ ] Session expires after timeout

### Admin Role
- [ ] Can access all features
- [ ] Can start/stop any agent
- [ ] Can edit configuration
- [ ] Can view all logs
- [ ] Can export data
- [ ] Can manage users

### Operator Role
- [ ] Can start/stop agents
- [ ] Can view logs and metrics
- [ ] Cannot edit configuration
- [ ] Cannot manage users
- [ ] Can export logs

### Viewer Role
- [ ] Can view logs (read-only)
- [ ] Can view metrics (read-only)
- [ ] Cannot start/stop agents
- [ ] Cannot export data
- [ ] All control buttons disabled

### Row-Level Security
- [ ] Users only see their org's agents
- [ ] Cannot access other org's data via URL manipulation
- [ ] Cannot modify other org's agents
- [ ] API enforces RLS on all requests

### Privilege Escalation Prevention
- [ ] Modifying localStorage role has no effect
- [ ] Backend validates permissions on every request
- [ ] Cannot bypass RBAC via API calls
- [ ] Audit log tracks all permission checks

---

## 🔗 Integration Points

### Builder Integration
- [ ] "Edit Configuration" opens builder
- [ ] Builder pre-loads current agent
- [ ] Changes in builder reflect in AOC
- [ ] Can navigate back to AOC from builder

### Environment Promotions
- [ ] Can promote dev → staging
- [ ] Can promote staging → prod
- [ ] Configuration preserved during promotion
- [ ] Prod promotion requires approval (if configured)
- [ ] Rollback works correctly

### Quick Access Integration
- [ ] Header dropdown shows active agents
- [ ] Status dots correct (Green=Active, Blue=Deployed)
- [ ] Click agent navigates to AOC
- [ ] Auto-updates every 30 seconds
- [ ] Hidden when no active agents
- [ ] Hidden when already in AOC

### Intro Card Integration
- [ ] Shows on first visit to Manage Agents page
- [ ] Can be dismissed
- [ ] Doesn't show again after dismissal
- [ ] localStorage persists preference
- [ ] Explains key AOC features clearly

### Digital Twin Integration (if applicable)
- [ ] Spatial view panel visible for digital twins
- [ ] 3D visualization renders
- [ ] Sensor health data displayed
- [ ] Real-time updates work
- [ ] Can interact with spatial view

---

## 🔍 Search & Filters

### Command Palette (⌘K)
- [ ] Opens on keyboard shortcut
- [ ] Shows search input
- [ ] Can search logs
- [ ] Can search runs
- [ ] Can search actions
- [ ] Shows results as you type
- [ ] Can navigate results with arrow keys
- [ ] Enter selects result
- [ ] Esc closes palette

### Advanced Search Syntax
- [ ] `status:error` filters by status
- [ ] `action:sendEmail` filters by action
- [ ] `timeRange:1h` filters by time
- [ ] `user:john@company.com` filters by user
- [ ] `AND`, `OR`, `NOT` operators work
- [ ] Can combine multiple filters
- [ ] Results update immediately

### Log Level Filters
- [ ] Can filter by INFO
- [ ] Can filter by WARN
- [ ] Can filter by ERROR
- [ ] Can filter by DEBUG
- [ ] Can select multiple levels
- [ ] Clear filters works
- [ ] Filters persist during session

### Time Range Filters
- [ ] Last 15 minutes works
- [ ] Last hour works
- [ ] Last 24 hours works
- [ ] Last 7 days works
- [ ] Custom range picker works
- [ ] Time range displayed clearly

### Saved Searches
- [ ] Can save current search
- [ ] Saved searches accessible from dropdown
- [ ] Can load saved search
- [ ] Can delete saved search
- [ ] Saved searches persist across sessions

---

## 📱 Responsive Design

### Desktop (≥1024px)
- [ ] All panels visible
- [ ] Layout not cramped
- [ ] No horizontal scroll
- [ ] All features accessible

### Tablet (768px - 1023px)
- [ ] Panels stack appropriately
- [ ] Touch targets large enough
- [ ] No horizontal scroll
- [ ] Can access all features

### Mobile (<768px)
- [ ] Single column layout
- [ ] Quick access in mobile menu
- [ ] Simplified workflow view
- [ ] All critical features accessible
- [ ] Bottom nav works

---

## ⚠️ Error Handling

### Network Errors
- [ ] Shows "Connection lost" message
- [ ] Auto-reconnects when network restored
- [ ] Shows "Connected" confirmation
- [ ] Retry button works
- [ ] No data loss during disconnect

### API Errors
- [ ] User-friendly error messages (no 500, undefined, null)
- [ ] Suggests corrective actions
- [ ] Retry button appears when appropriate
- [ ] Contact support link shown for persistent errors

### Invalid States
- [ ] Cannot start agent with no workflow
- [ ] Cannot start agent with invalid config
- [ ] Shows specific validation errors
- [ ] Suggests how to fix

### Edge Cases
- [ ] Handles agent not found gracefully
- [ ] Handles deleted agent
- [ ] Handles permission changes mid-session
- [ ] Handles concurrent edits

---

## ⚡ Performance

### Load Times
- [ ] Initial page load < 2 seconds
- [ ] Panel transitions < 200ms
- [ ] Log streaming latency < 100ms
- [ ] Metrics update < 500ms
- [ ] Workflow graph renders < 1 second

### Memory Usage
- [ ] No memory leaks over extended use
- [ ] Large log volumes don't cause slowdown
- [ ] Browser doesn't freeze with many logs
- [ ] Smooth scrolling even with 1000+ logs

### Network Efficiency
- [ ] Minimal API calls (no repeated requests)
- [ ] WebSocket used for real-time data
- [ ] Pagination for large datasets
- [ ] Efficient payload sizes

---

## 🔗 No Broken Links

### Internal Links
- [ ] All navigation links work
- [ ] Breadcrumbs work
- [ ] "Back" buttons work
- [ ] Quick access links work
- [ ] Builder links work

### External Links
- [ ] Help documentation links work
- [ ] Support contact links work
- [ ] All footer links work

### Deep Links
- [ ] Direct URL to specific agent works
- [ ] Shared view links work
- [ ] Bookmark links work

---

## 📚 Documentation

### User Documentation
- [ ] README complete and accurate
- [ ] Quick Start guide works end-to-end
- [ ] User Guide covers all features
- [ ] Troubleshooting guide helpful
- [ ] FAQ answers common questions

### Admin Documentation
- [ ] Admin guide covers setup
- [ ] Configuration guide accurate
- [ ] Security guide complete
- [ ] Backup procedures documented

### Developer Documentation
- [ ] API docs complete
- [ ] Code examples work
- [ ] Architecture diagrams accurate
- [ ] Testing guide clear

---

## ✅ Final Acceptance

### Feature Completeness
- [ ] All 6 panels implemented
- [ ] All runtime controls work
- [ ] Real-time features functional
- [ ] Search and filters work
- [ ] All integrations complete

### Quality Standards
- [ ] No console errors in production
- [ ] All tests passing (78/78)
- [ ] Test coverage >80%
- [ ] Performance benchmarks met
- [ ] No visual glitches

### User Experience
- [ ] Intuitive navigation
- [ ] Clear visual feedback
- [ ] Helpful error messages
- [ ] Responsive on all devices
- [ ] Keyboard shortcuts work

### Production Readiness
- [ ] Documentation complete
- [ ] Security audit passed
- [ ] Performance tested
- [ ] Backup strategy in place
- [ ] Monitoring configured

---

## 📝 Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| **QA Lead** | | | |
| **Product Owner** | | | |
| **Engineering Lead** | | | |
| **Security Officer** | | | |

---

**Checklist Version**: 1.0  
**Last Updated**: 2025-12-01  
**Status**: ⏳ Pending Completion

---

## Notes

Use this space to document any issues found during testing:

```
Issue #1:
Description:
Steps to Reproduce:
Expected:
Actual:
Severity:
Status:

Issue #2:
...
```

---

**Next Steps After Completion**:
1. ✅ All items checked
2. 📊 Generate test report
3. 🐛 Fix any issues found
4. ✅ Re-test fixed issues
5. 📋 Final sign-off
6. 🚀 Production deployment!
