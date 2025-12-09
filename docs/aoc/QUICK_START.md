# AOC Quick Start Guide

Get up and running with the Agent Operations Center in 5 minutes.

## Prerequisites

- Active AURA account
- At least one deployed agent
- Browser: Chrome, Firefox, Safari, or Edge (latest versions)

## Accessing AOC

### Method 1: Quick Access Button (Recommended)

1. Look for the **"Operations"** button in the top-right header
2. Click to see your active agents
3. Select the agent you want to manage
4. AOC opens instantly

### Method 2: From Agents Page

1. Navigate to **Manage Agents** from the sidebar
2. Find your deployed agent
3. Click the **"Manage"** button
4. AOC opens with that agent selected

### Method 3: Direct URL

```
https://your-aura-instance.com/app/agents/YOUR-AGENT-ID/operations
```

Bookmark this for quick access!

## First Time Setup

When you first open AOC, you'll see an **onboarding tour**:

1. **Welcome Screen** - Overview of key features
2. **Activity Stream** - How to view real-time logs
3. **Control Panel** - Starting and stopping agents
4. **Metrics** - Understanding performance data
5. **Command Palette** - Keyboard shortcuts (⌘K)

💡 **Tip**: Complete the tour! It only takes 2 minutes and shows you everything.

## Essential Actions

### View Live Logs

```
1. Open AOC
2. Look at the Activity Stream panel (left side)
3. Logs appear in real-time as your agent works
4. Use filters to narrow down what you see
```

### Start/Stop Agent

```
1. Find the Control Panel (top-right)
2. Click the status indicator
3. Select "Start", "Pause", or "Stop"
4. Confirm the action
5. Status updates immediately
```

### Check Performance

```
1. Look at the Metrics panel (top)
2. See Success Rate, Avg Latency, Total Runs
3. Hover for detailed breakdowns
4. Click "View Details" for trends
```

### Search Logs

```
1. Press ⌘K (Ctrl+K on Windows)
2. Type your search query
3. Select from results
4. Jump directly to that log entry
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open command palette |
| `?` | Show all shortcuts |
| `Esc` | Close dialogs |
| `⌘F` | Search logs |
| `Space` | Pause/resume log stream |
| `R` | Refresh data |

## Common Tasks

### Filter Logs by Level

1. Click the **filter icon** in Activity Stream
2. Select level: Info, Warning, Error
3. Logs update instantly
4. Clear filter to see all

### Export Logs

1. Click **Export** button in Activity Stream
2. Choose format: CSV or JSON
3. Select date range
4. Download starts automatically

### View Agent Details

1. Click the **agent name** in header
2. See full configuration
3. View deployment history
4. Check integrations status

### Share with Team

1. Copy the current URL
2. Send to team member
3. They see the same view
4. Real-time collaboration enabled

## Pro Tips

### 🎯 Quick Actions
- **Right-click** on any log entry for contextual actions
- **Double-click** a run ID to jump to full details
- **Drag** the Activity Stream border to resize

### 🔍 Advanced Search
```
status:error                  # Find all errors
action:sendEmail             # Filter by action
timeRange:1h                 # Last hour only
user:john@company.com        # Specific user
```

### 📊 Performance Monitoring
- Set up **alerts** for error rate > 5%
- Create **dashboards** for key metrics
- Export data for external analysis

### 👥 Team Collaboration
- See who else is viewing (top-right avatars)
- Leave comments on specific runs
- Tag team members with @mentions

## Next Steps

Now that you're up and running:

1. 📖 Read the [User Guide](./USER_GUIDE.md) for complete feature documentation
2. 🎓 Learn advanced features like workflow visualization
3. 🔔 Set up notifications and alerts
4. 📊 Create custom dashboards

## Troubleshooting

### Can't See Logs?
→ Check agent status is "Active"  
→ Verify you have view permissions  
→ Try refreshing the page (⌘R)

### Agent Won't Start?
→ See [Troubleshooting Guide](./TROUBLESHOOTING.md#agent-wont-start)

### Slow Performance?
→ Clear browser cache  
→ Reduce log retention period  
→ Contact administrator

## Need Help?

- Press `?` for inline help
- Check [FAQ](./FAQ.md) for common questions
- Contact support via the help icon

---

**Time Spent**: ~5 minutes  
**Status**: Ready to use AOC! 🎉

[← Back to Documentation](./README.md) | [Next: User Guide →](./USER_GUIDE.md)
