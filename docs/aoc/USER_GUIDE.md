# AOC User Guide

Complete guide for daily operations with the Agent Operations Center.

## Table of Contents

1. [Dashboard Overview](#dashboard-overview)
2. [Controlling Agents](#controlling-agents)
3. [Viewing Logs](#viewing-logs)
4. [Performance Metrics](#performance-metrics)
5. [Workflow Visualization](#workflow-visualization)
6. [Search & Filters](#search-filters)
7. [Collaboration Features](#collaboration-features)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [Export & Reporting](#export-reporting)
10. [Best Practices](#best-practices)

---

## Dashboard Overview

### Layout

The AOC interface consists of 5 main panels:

```
┌─────────────────────────────────────┐
│  Header: Agent Info & Controls      │
├───────────┬─────────────────────────┤
│           │  Metrics Panel          │
│  Activity │  - Success Rate         │
│  Stream   │  - Avg Latency          │
│           │  - Total Runs           │
│  (Logs)   ├─────────────────────────┤
│           │  Workflow Graph         │
│           │  (Visual Representation)│
│           ├─────────────────────────┤
│           │  Recent Activity        │
│           │  (Quick Stats)          │
└───────────┴─────────────────────────┘
```

### Panel Functions

**Header**
- Agent name and status
- Quick control buttons
- Team presence indicators

**Activity Stream** (Left)
- Real-time log entries
- Filter controls
- Search input
- Export button

**Metrics Panel** (Top Right)
- Key performance indicators
- Success rate over time
- Latency distribution
- Run count trends

**Workflow Graph** (Middle Right)
- Visual workflow representation
- Node status indicators
- Interactive exploration

**Recent Activity** (Bottom Right)
- Latest runs summary
- Error highlights
- Quick actions

---

## Controlling Agents

### Agent States

| State | Description | Actions Available |
|-------|-------------|-------------------|
| **Active** | Running and processing | Pause, Stop |
| **Paused** | Temporarily halted | Resume, Stop |
| **Stopped** | Fully stopped | Start |
| **Error** | Failed state | Restart, View Logs |
| **Deploying** | Starting up | Wait |

### Starting an Agent

1. Click the status indicator in Control Panel
2. Select **"Start Agent"**
3. Confirm in dialog
4. Wait for status to change to "Active" (~5-10 seconds)

**What happens**:
- Edge function deploys agent runtime
- Connections to data sources established
- Workflow engine initialized
- First heartbeat sent

### Pausing an Agent

1. Click status indicator
2. Select **"Pause Agent"**
3. Choose pause duration (optional)
   - 15 minutes
   - 1 hour
   - Until manually resumed

**Use cases**:
- Temporary maintenance
- Rate limit management
- Testing environment changes

### Stopping an Agent

1. Click status indicator
2. Select **"Stop Agent"**
3. ⚠️ Confirm you want to stop

**Warning**: 
- Stops all processing immediately
- In-flight requests may fail
- Will not auto-restart

### Emergency Stop

Press `⌘⇧S` (Ctrl+Shift+S) for immediate stop without confirmation.

**When to use**:
- Agent behaving unexpectedly
- Infinite loop detected
- Critical error occurring

---

## Viewing Logs

### Log Entry Structure

Each log entry shows:
```
[Timestamp] [Level] [Action] Message
  ↓ Expand for details
```

Example:
```
[10:24:33] [INFO] [sendEmail] Email sent to customer@example.com
  Duration: 234ms
  Recipient: customer@example.com
  Template: order_confirmation
  Status: delivered
```

### Log Levels

| Level | Color | Meaning |
|-------|-------|---------|
| **INFO** | Blue | Normal operation |
| **WARN** | Orange | Potential issue |
| **ERROR** | Red | Action failed |
| **DEBUG** | Gray | Technical details |

### Real-Time Streaming

Logs appear instantly as events occur:

- **Auto-scroll**: On by default, disable with spacebar
- **Rate**: Updates every 100ms
- **Buffer**: Last 1,000 entries cached
- **Retention**: 7 days (configurable)

### Filtering Logs

#### By Level
```
Click filter icon → Select levels → Apply
```
Shows only selected severity levels.

#### By Action
```
Type action name in search → Filter by action
```
Example: `sendEmail` shows only email actions.

#### By Time Range
```
Click time picker → Select range → Apply
```
Options:
- Last 15 minutes
- Last hour
- Last 24 hours
- Custom range

#### By Status
```
Filter by: Success | Failed | Pending
```

### Advanced Search

Press `⌘K` and use query syntax:

```
status:error                    # All errors
action:sendEmail status:success # Successful emails
timeRange:1h level:warn        # Warnings in last hour
user:john@company.com          # Specific user actions
```

**Operators**:
- `AND` - Both conditions
- `OR` - Either condition
- `NOT` - Exclude condition
- `()` - Group conditions

Example:
```
(action:sendEmail OR action:sendSMS) AND status:error
```

### Expanding Log Details

1. Click any log entry
2. Drawer opens with full details:
   - Request payload
   - Response data
   - Duration breakdown
   - Related logs
   - Trace ID

3. Actions available:
   - Copy trace ID
   - Share link
   - Retry action
   - Report issue

---

## Performance Metrics

### Success Rate

Shows percentage of successful runs vs failed:

```
Success Rate: 98.5% ↑ 2.1%
  ├─ Successful: 1,234
  ├─ Failed: 19
  └─ In Progress: 3
```

**Color coding**:
- 🟢 Green: >95% success
- 🟡 Yellow: 90-95% success
- 🔴 Red: <90% success

**Calculations**:
- Updates every 30 seconds
- Rolling 24-hour window
- Excludes cancelled runs

### Average Latency

Time from trigger to completion:

```
Avg Latency: 234ms ↓ 12ms
  ├─ P50: 156ms
  ├─ P90: 312ms
  ├─ P95: 445ms
  └─ P99: 1,023ms
```

**What affects latency**:
- Network conditions
- Data source response times
- Workflow complexity
- System load

### Total Runs

Count of agent executions:

```
Total Runs: 1,256 ↑ 124 today
  ├─ This hour: 52
  ├─ Today: 124
  └─ This week: 843
```

**Run states**:
- **Completed**: Finished successfully
- **Failed**: Ended in error
- **Cancelled**: Manually stopped
- **In Progress**: Currently running

### Custom Metrics

Create custom KPIs:

1. Click **"Add Metric"**
2. Choose data source
3. Define calculation
4. Set alert thresholds

Example custom metrics:
- Orders processed per hour
- Average customer satisfaction score
- API call cost
- Data processed (MB)

### Metric Alerts

Set up notifications:

1. Click metric card
2. Select **"Configure Alerts"**
3. Set thresholds:
   - Success rate < 95%
   - Latency > 500ms
   - Error count > 10/hour

4. Choose notification method:
   - Email
   - Slack
   - Webhook
   - In-app

---

## Workflow Visualization

### Graph View

Interactive visual representation of agent workflow:

```
[Trigger] → [Condition] → [Action] → [Action] → [Complete]
   └─────────→ [Fallback Action]
```

**Node types**:
- 🟦 **Trigger**: What starts the workflow
- 🟨 **Condition**: Decision points
- 🟩 **Action**: Tasks performed
- 🟥 **Error Handler**: Fallback logic

### Interaction

**Click node** → See details:
- Execution count
- Success/failure rate
- Average duration
- Recent errors

**Hover node** → Quick stats tooltip

**Drag nodes** → Rearrange layout (cosmetic only)

### Real-Time Execution

When agent is running:
- Active nodes pulse
- Current execution path highlights
- Completion animates through graph

### Graph Filters

Show/hide:
- ☑️ Successful paths
- ☑️ Error paths
- ☑️ Inactive nodes
- ☑️ Labels

### Export Graph

1. Click **"Export"** in graph toolbar
2. Choose format:
   - PNG image
   - SVG vector
   - JSON data
   - Mermaid diagram

---

## Search & Filters

### Global Search

Press `⌘K` to open command palette:

```
Type to search:
  - Log entries
  - Agent runs
  - Actions
  - Errors
  - Team activity
```

**Search tips**:
- Use quotes for exact match: `"email sent"`
- Wildcard: `send*` matches sendEmail, sendSMS
- Regex: `/^error.*/i` for pattern matching

### Saved Searches

Create reusable searches:

1. Perform search
2. Click **"Save Search"**
3. Name it
4. Access from dropdown

Example saved searches:
- "Critical errors today"
- "Failed payments last 7 days"
- "High latency runs"

### Filter Combinations

Stack multiple filters:

```
[Level: ERROR] + [Action: sendEmail] + [Time: Last 24h]
  ↓
Shows: Email errors in last day
```

**Apply filters**:
- From UI controls (point and click)
- From search syntax (⌘K)
- From saved combinations

---

## Collaboration Features

### Team Presence

See who's viewing in real-time:

```
👤 You
👤 Sarah (viewing Activity)
👤 Mike (editing workflow)
```

**Features**:
- Live cursor tracking
- Activity annotations
- Simultaneous viewing

### Comments

Leave notes on specific runs:

1. Click run entry
2. Select **"Add Comment"**
3. Type message
4. Optional: @mention teammate
5. Post

**Use cases**:
- Document investigation findings
- Ask questions about errors
- Share insights

### Shared Views

Share your current view:

1. Set up filters/search
2. Click **"Share View"**
3. Copy link
4. Send to team

Link includes:
- Selected agent
- Active filters
- Time range
- Panel layout

### Audit Trail

All changes tracked:

```
[10:24] Sarah stopped Agent #1234
[10:22] Mike updated workflow
[10:15] You viewed error logs
```

View full history:
- Who made change
- What changed
- When it occurred
- Why (if reason provided)

---

## Keyboard Shortcuts

### Global

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open command palette |
| `?` | Show shortcuts help |
| `Esc` | Close dialog/panel |
| `⌘R` | Refresh data |
| `⌘/` | Focus search |

### Navigation

| Shortcut | Action |
|----------|--------|
| `1-5` | Jump to panel 1-5 |
| `Tab` | Cycle through panels |
| `⇧Tab` | Reverse cycle |
| `←→` | Navigate timeline |

### Log Viewing

| Shortcut | Action |
|----------|--------|
| `Space` | Pause/resume stream |
| `J/K` | Next/previous log |
| `Enter` | Expand log details |
| `⌘F` | Search logs |
| `E` | Export visible logs |

### Agent Control

| Shortcut | Action |
|----------|--------|
| `⌘⇧S` | Start agent |
| `⌘⇧P` | Pause agent |
| `⌘⇧X` | Stop agent |
| `⌘⇧R` | Restart agent |

### Workflow

| Shortcut | Action |
|----------|--------|
| `G` | Open workflow graph |
| `F` | Toggle fullscreen |
| `+/-` | Zoom in/out |
| `0` | Reset zoom |

### Custom Shortcuts

Create your own:

1. Open Settings (`⌘,`)
2. Go to Keyboard section
3. Click "Add Shortcut"
4. Record key combination
5. Assign action

---

## Export & Reporting

### Log Export

Export logs for analysis:

1. Apply desired filters
2. Click **"Export"** button
3. Choose format:
   - **CSV**: Spreadsheet analysis
   - **JSON**: API integration
   - **PDF**: Presentation/reports
   - **Text**: Simple viewing

4. Select date range
5. Download

**CSV columns**:
```
timestamp,level,action,message,duration_ms,status,user_id
```

### Metric Reports

Generate performance reports:

1. Go to Metrics panel
2. Click **"Generate Report"**
3. Select:
   - Time range
   - Metrics to include
   - Comparison period

4. Choose format
5. Export

**Report includes**:
- Metric trends over time
- Period-over-period comparison
- Top errors
- Performance summary
- Recommendations

### Scheduled Reports

Automate report generation:

1. Create report template
2. Click **"Schedule"**
3. Set frequency:
   - Daily
   - Weekly
   - Monthly

4. Add recipients
5. Choose delivery method

### API Access

Export data programmatically:

```typescript
// Example: Fetch logs via API
const response = await fetch('/api/aoc/logs', {
  method: 'POST',
  body: JSON.stringify({
    agentId: 'agent-123',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    filters: { level: 'ERROR' }
  })
});

const logs = await response.json();
```

See [Developer Guide](./DEVELOPER_GUIDE.md) for full API documentation.

---

## Best Practices

### Daily Operations

**Morning Checklist**:
- [ ] Check overnight errors
- [ ] Review agent status
- [ ] Verify success rate >95%
- [ ] Check for alerts

**During the day**:
- Keep AOC open in background tab
- Respond to alerts within 15 minutes
- Comment on investigated issues
- Share critical findings with team

**End of day**:
- Review day's metrics
- Note any anomalies
- Plan next day's optimizations

### Monitoring Strategy

**Set up these alerts**:
1. Success rate < 95%
2. Error count > 10/hour
3. Latency > 500ms (P95)
4. Agent stopped unexpectedly

**Check these daily**:
- Error log patterns
- Performance trends
- Resource utilization
- User feedback

### Performance Optimization

**If success rate drops**:
1. Check recent errors
2. Look for patterns (same action failing?)
3. Review recent changes
4. Test affected workflow
5. Rollback if needed

**If latency increases**:
1. Check data source response times
2. Review workflow complexity
3. Look for network issues
4. Consider scaling resources

### Troubleshooting Workflow

1. **Identify**: What's the symptom?
2. **Isolate**: When did it start?
3. **Investigate**: Check logs, metrics
4. **Diagnose**: Find root cause
5. **Resolve**: Apply fix
6. **Verify**: Confirm resolution
7. **Document**: Record findings

### Team Coordination

**Communication**:
- Use comments for async updates
- Tag teammates with @mentions
- Share views for live collaboration
- Document decisions in audit trail

**Escalation**:
- Level 1: Team member can fix
- Level 2: Requires admin
- Level 3: Engineering support needed

### Security Practices

**Access control**:
- Only share views with authorized team
- Don't screenshot sensitive data
- Use audit trail for compliance
- Review permissions quarterly

**Data handling**:
- Export logs securely
- Encrypt exports with sensitive data
- Delete old exports
- Follow data retention policies

---

## Next Steps

- 🛠️ [Administrator Guide](./ADMIN_GUIDE.md) - Advanced configuration
- 🐛 [Troubleshooting](./TROUBLESHOOTING.md) - Solve common issues
- 👨‍💻 [Developer Guide](./DEVELOPER_GUIDE.md) - Extend functionality
- ❓ [FAQ](./FAQ.md) - Quick answers

---

[← Back to Documentation](./README.md)
