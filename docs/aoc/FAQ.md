# AOC Frequently Asked Questions

Quick answers to common questions about the Agent Operations Center.

## General Questions

### What is AOC?

AOC (Agent Operations Center) is your mission control for deployed AI agents and digital twins. It provides real-time monitoring, control, and management capabilities for all your autonomous agents.

### Who should use AOC?

- **Operators**: Daily management of deployed agents
- **Administrators**: System configuration and user management
- **Developers**: Debugging and performance analysis
- **Stakeholders**: Monitoring and reporting

### What can I do with AOC?

- ✅ Start, pause, and stop agents in real-time
- ✅ View live activity logs as they happen
- ✅ Track performance metrics (success rate, latency, runs)
- ✅ Visualize agent workflows
- ✅ Search and filter logs
- ✅ Export data for analysis
- ✅ Collaborate with team members
- ✅ Set up alerts and notifications

### How much does AOC cost?

AOC is included with your AURA platform subscription. No additional costs for:
- Unlimited agents
- Unlimited users
- Unlimited logs (within retention period)
- All features

Additional costs may apply for:
- Extended log retention (>30 days)
- High-volume API usage
- Premium support

---

## Access & Authentication

### How do I access AOC?

Three ways:

1. **Quick Access Button** (Recommended):
   - Click "Operations" in top-right header
   - Select your agent
   
2. **From Agents Page**:
   - Go to Manage Agents
   - Click "Manage" on any deployed agent
   
3. **Direct URL**:
   - `/app/agents/{agentId}/operations`

### I can't log in, what should I do?

1. Verify your credentials are correct
2. Check if your account is active
3. Try password reset
4. Clear browser cache
5. Contact your administrator

### How do I reset my password?

1. Click "Forgot Password" on login page
2. Enter your email
3. Check email for reset link
4. Click link and set new password
5. Log in with new password

### What permissions do I need?

Minimum required:
- `agents:read` - View agents and logs
- `agents:write` - Control agents (start/stop)

Additional permissions:
- `logs:export` - Export log data
- `settings:write` - Change configuration
- `admin` - Full access

Contact your administrator to request permissions.

---

## Agent Control

### How do I start an agent?

1. Open AOC for that agent
2. Find Control Panel (top-right)
3. Click status indicator
4. Select "Start Agent"
5. Confirm action
6. Wait 5-10 seconds for activation

### Why won't my agent start?

Common causes:

1. **Missing Configuration**:
   - Verify all required fields set
   - Check workflow is defined
   
2. **Connection Issues**:
   - Ensure data sources are connected
   - Test integration credentials
   
3. **Permission Denied**:
   - Verify you have `agents:write` permission
   
4. **Resource Limits**:
   - Check if org has reached agent limit

See [Troubleshooting Guide](./TROUBLESHOOTING.md#agent-wont-start) for detailed solutions.

### What's the difference between Pause and Stop?

| Action | Effect | Resume | Use Case |
|--------|--------|--------|----------|
| **Pause** | Temporarily halts | Click "Resume" | Maintenance, testing |
| **Stop** | Fully stops | Must restart manually | End of workday, major changes |

### Can I schedule when agents run?

Not directly in AOC, but you can:

1. Use workflow triggers with time conditions
2. Set up external scheduler (cron) to call start/stop API
3. Use pause duration to auto-resume

Example:
```typescript
// Pause for 8 hours (overnight)
pauseAgent(agentId, { duration: 28800 });
```

### What happens if I accidentally stop an agent?

1. In-flight requests may fail
2. Agent stops immediately
3. No automatic restart

To recover:
1. Click "Start" to restart
2. Check logs for failed requests
3. Optionally retry failed actions

---

## Logs & Monitoring

### Why am I not seeing logs?

Check these:

1. **Agent is running**: Status must be "Active"
2. **Permissions**: Verify you can view logs
3. **Filters**: Clear any active filters
4. **Time range**: Ensure range includes recent activity
5. **Real-time connection**: Refresh page

If still not working, see [Troubleshooting Guide](./TROUBLESHOOTING.md#logs-not-appearing).

### How long are logs stored?

Default: 7 days

Configurable options:
- 1 day (dev/test environments)
- 7 days (default)
- 30 days (production recommended)
- 90 days (compliance requirements)

After retention period, logs are automatically deleted. Export important logs before they expire.

### Can I search logs?

Yes! Multiple ways:

1. **Quick search**: Type in search box
2. **Command palette**: Press `⌘K` → type query
3. **Advanced syntax**: Use filters like `status:error`
4. **Saved searches**: Create reusable queries

Examples:
```
status:error                    # All errors
action:sendEmail status:success # Successful emails
timeRange:1h                    # Last hour
user:john@company.com          # Specific user
```

### How do I export logs?

1. Apply desired filters
2. Click "Export" button
3. Choose format (CSV, JSON, PDF, Text)
4. Select date range
5. Click "Download"

Exports include:
- Timestamp
- Log level
- Action name
- Message
- Duration
- Status
- Metadata

### What log levels exist?

| Level | Color | Meaning | When Used |
|-------|-------|---------|-----------|
| **INFO** | Blue | Normal operation | Successful actions |
| **WARN** | Yellow | Potential issue | Slow response, retry |
| **ERROR** | Red | Action failed | API error, timeout |
| **DEBUG** | Gray | Technical details | Development only |

Filter by level in Activity Stream.

---

## Performance & Metrics

### What metrics does AOC track?

**Standard metrics**:
- Success Rate - % of successful runs
- Average Latency - Time per action
- Total Runs - Count of executions
- Error Rate - % of failed runs

**Custom metrics**:
- Define your own KPIs
- Query any data point
- Set custom thresholds

### What's a good success rate?

**Target**: >98%  
**Warning**: 95-98%  
**Critical**: <95%

Depends on use case:
- Mission-critical: Aim for 99%+
- Standard automation: 95%+ acceptable
- Experimental: 90%+ okay

### Why is my latency high?

Common causes:

1. **Slow data sources**: External API taking long
2. **Complex workflows**: Many steps to execute
3. **Network issues**: Poor connectivity
4. **High load**: System under heavy use

Solutions:
- Optimize data source queries
- Simplify workflows
- Add caching
- Scale resources

See [Performance Tuning](./ADMIN_GUIDE.md#performance-tuning).

### How often do metrics update?

- **Live metrics**: Every 30 seconds
- **Historical trends**: Every 5 minutes
- **Reports**: Daily aggregation

Force refresh: Click refresh icon or press `R`

---

## Collaboration

### Can multiple people view AOC at once?

Yes! Real-time collaboration features:

- See who else is viewing (avatars in top-right)
- Live cursor tracking
- Shared filters and searches
- Comments on logs and runs

### How do I share my view with a teammate?

1. Set up filters/search as desired
2. Click "Share View" button
3. Copy the generated URL
4. Send to teammate

The URL includes:
- Selected agent
- Active filters
- Time range
- Panel layout

### Can I leave comments on logs?

Yes:

1. Click any log entry to expand
2. Scroll to bottom
3. Click "Add Comment"
4. Type message (use @mention to notify)
5. Click "Post"

Comments are visible to all team members.

### How do I know who made changes?

Check the Audit Trail:

1. Open Settings → Audit Log
2. Filter by date range
3. See all actions:
   - Who made change
   - What changed
   - When it occurred
   - Reason (if provided)

---

## Features & Capabilities

### What is the Command Palette?

Keyboard-first interface for quick actions:

- Press `⌘K` (Mac) or `Ctrl+K` (Windows)
- Type command or search
- Navigate with arrow keys
- Press Enter to execute

Use for:
- Searching logs
- Running actions
- Navigating panels
- Changing settings

### Can I customize the dashboard?

Some customization available:

✅ **Can customize**:
- Panel sizes (drag borders)
- Visible panels (show/hide)
- Metric cards (add custom)
- Theme (light/dark)

❌ **Cannot customize** (yet):
- Panel positions
- Layout structure
- Color scheme
- Font sizes

More customization coming in future releases.

### Does AOC work on mobile?

Yes! Responsive design supports:

- **Mobile phones**: Single-column layout
- **Tablets**: Dual-column layout
- **Desktop**: Full multi-panel layout

Some features simplified on mobile:
- Workflow graph (simplified view)
- Command palette (touch-friendly)
- Metrics (stacked cards)

Best experience: Desktop or tablet

### Are there keyboard shortcuts?

Yes! Many shortcuts available:

**Most useful**:
- `⌘K` - Command palette
- `?` - Show all shortcuts
- `Space` - Pause/resume log stream
- `R` - Refresh data
- `Esc` - Close dialogs

See full list: [Keyboard Shortcuts](./USER_GUIDE.md#keyboard-shortcuts)

---

## Data & Privacy

### Is my data secure?

Yes. Security measures:

- ✅ All data encrypted at rest (AES-256)
- ✅ All connections encrypted in transit (TLS 1.3)
- ✅ Row-level security (RLS) enforced
- ✅ Regular security audits
- ✅ SOC 2 Type II compliant
- ✅ GDPR compliant

### Who can see my agents?

Only authorized users in your organization who have:

1. Account in your AURA instance
2. Permission to view agents
3. Access to specific agent (if using org-level permissions)

Administrators cannot see data from other organizations.

### Can I delete my data?

Yes:

**Individual logs**:
1. Find log entry
2. Click "Delete"
3. Confirm

**Bulk deletion**:
Contact administrator to run data cleanup

**Account deletion**:
1. Settings → Account
2. "Delete Account"
3. All your data deleted within 30 days

### Where is my data stored?

Data stored in Supabase (PostgreSQL):

- Database: Your selected region
- Backups: Same region + off-site
- Logs: Same region

You can choose region during setup:
- us-east-1 (US East)
- us-west-2 (US West)
- eu-west-1 (EU Ireland)
- ap-southeast-1 (Singapore)
- And more...

---

## Troubleshooting

### I found a bug, how do I report it?

1. Note what you were doing
2. Take screenshot if possible
3. Check browser console for errors (F12)
4. Report via:
   - Help menu → "Report Issue"
   - Email: support@your-org.com
   - Slack: #aoc-support

Include:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/console logs

### Why is AOC slow?

Try these quick fixes:

1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Reduce filters**: Show less data
3. **Close other tabs**: Free up memory
4. **Check network**: Test connection speed
5. **Update browser**: Use latest version

If still slow, see [Performance Issues](./TROUBLESHOOTING.md#performance-issues).

### How do I get help?

**Self-service**:
1. Check this FAQ
2. Read [User Guide](./USER_GUIDE.md)
3. See [Troubleshooting Guide](./TROUBLESHOOTING.md)

**Support**:
- 💬 Chat: Click help icon (bottom-right)
- 📧 Email: support@your-org.com  
- 📱 Slack: #aoc-support
- 📞 Phone: +1-XXX-XXX-XXXX (critical issues)

**Response times**:
- 🔴 Critical: <1 hour
- 🟡 High: <4 hours  
- 🟢 Normal: <24 hours

---

## Advanced Topics

### Can I use AOC via API?

Yes! Full API available for:

- Querying agents and logs
- Controlling agents
- Exporting data
- Creating custom integrations

See [Developer Guide](./DEVELOPER_GUIDE.md) for API documentation.

### How do I integrate AOC with external tools?

**Webhooks**:
Configure webhooks to send events to:
- Slack
- PagerDuty
- DataDog
- Custom endpoints

**API**:
Pull data into external tools:
- Business intelligence platforms
- Monitoring solutions
- Custom dashboards

**Export**:
Regular exports to:
- Data warehouses
- Analytics platforms
- Reporting tools

### Can I run AOC on-premise?

Not currently. AOC runs on Supabase cloud.

For enterprise customers requiring on-premise:
- Contact sales team
- Self-hosted options may be available
- Additional setup and support costs apply

### How do I contribute to AOC development?

1. Check [Developer Guide](./DEVELOPER_GUIDE.md)
2. Fork the repository
3. Create feature branch
4. Make changes with tests
5. Submit pull request
6. Wait for review

We welcome contributions!

---

## More Questions?

Can't find your answer?

- 📖 Read the [User Guide](./USER_GUIDE.md)
- ⚙️ Check [Admin Guide](./ADMIN_GUIDE.md)
- 🐛 See [Troubleshooting](./TROUBLESHOOTING.md)
- 💬 Ask in Slack: #aoc-support
- 📧 Email: support@your-org.com

---

[← Back to Documentation](./README.md)
