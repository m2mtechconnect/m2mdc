# AOC Troubleshooting Guide

Common issues and solutions for the Agent Operations Center.

## Quick Diagnosis

**Before diving in**:
1. Check system status at `/health`
2. Review recent changes in audit log
3. Try refreshing the page (`⌘R`)
4. Clear browser cache if UI issues

---

## Common Issues

### Agent Won't Start

**Symptom**: Agent status stuck on "Deploying" or immediately stops

**Possible Causes**:
- ❌ Missing required configuration
- ❌ Invalid workflow definition
- ❌ Data source connection failed
- ❌ Insufficient permissions

**Solutions**:

1. **Check agent configuration**:
```typescript
// Verify required fields
const requiredFields = [
  'name',
  'model_id',
  'workflow_graph_id'
];

// Check in browser console
console.log('Agent config:', agent.config);
```

2. **Validate workflow**:
```sql
-- Check for orphaned workflow actions
SELECT * FROM workflow_actions
WHERE workflow_id = 'your-workflow-id'
  AND (trigger IS NULL OR actions IS NULL);
```

3. **Test data source connections**:
```typescript
// Test connectivity
const { data, error } = await supabase
  .from('integrations_connections')
  .select('*')
  .eq('status', 'active');

if (error) console.error('Connection issue:', error);
```

4. **Review edge function logs**:
```bash
supabase functions logs aoc-runtime-control --tail
```

**Common error messages**:

| Error | Cause | Fix |
|-------|-------|-----|
| "Workflow actions required" | Missing action definitions | Add at least one action to workflow |
| "Model not configured" | No LLM model selected | Set model_id in agent config |
| "Connection failed" | Data source unavailable | Check integration status |
| "Permission denied" | User lacks start permission | Grant `agents:write` permission |

---

### Logs Not Appearing

**Symptom**: Activity Stream is empty or not updating

**Possible Causes**:
- ❌ Real-time subscription not connected
- ❌ RLS policy blocking access
- ❌ Agent not actually running
- ❌ WebSocket connection failed

**Solutions**:

1. **Check real-time connection**:
```typescript
// In browser console
const channel = supabase.channel('test');
channel.subscribe((status) => {
  console.log('Realtime status:', status);
});
```

Expected output: `SUBSCRIBED`

2. **Verify RLS policies**:
```sql
-- Test if you can query logs
SELECT COUNT(*) FROM agent_action_logs
WHERE system_id = 'your-agent-id';
```

If count is 0 but agent is running, RLS may be blocking.

3. **Check agent status**:
```sql
SELECT status, last_heartbeat
FROM agents
WHERE id = 'your-agent-id';
```

Status should be `active` and `last_heartbeat` recent.

4. **Test WebSocket**:
```bash
# In terminal
wscat -c "wss://your-project.supabase.co/realtime/v1/websocket"
```

Should connect without errors.

5. **Browser console errors**:
Press `F12` and check Console tab for errors:
- `WebSocket failed` → Network/firewall issue
- `Not authenticated` → Session expired, re-login
- `Permission denied` → RLS policy issue

**Quick fix**: Refresh page and ensure agent is "Active"

---

### Metrics Not Updating

**Symptom**: Success rate, latency, or run count frozen

**Possible Causes**:
- ❌ Query taking too long
- ❌ Database indexes missing
- ❌ Stale cache
- ❌ No recent activity

**Solutions**:

1. **Force refresh**:
Click refresh icon or press `R`

2. **Check for recent runs**:
```sql
SELECT COUNT(*), MAX(created_at)
FROM agent_runs
WHERE agent_id = 'your-agent-id'
  AND created_at > NOW() - INTERVAL '1 hour';
```

If count is 0, agent hasn't run recently.

3. **Verify indexes exist**:
```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'agent_runs';
```

Should include: `idx_agent_runs_agent_id`, `idx_agent_runs_created_at`

4. **Clear cache**:
```typescript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

5. **Check metric calculation**:
```sql
-- Manual calculation
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate,
  AVG(duration_ms) as avg_latency,
  COUNT(*) as total_runs
FROM agent_runs
WHERE agent_id = 'your-agent-id'
  AND created_at > NOW() - INTERVAL '24 hours';
```

---

### Search Not Working

**Symptom**: Command palette (⌘K) returns no results

**Possible Causes**:
- ❌ Search index not built
- ❌ Query syntax error
- ❌ Permissions issue
- ❌ No matching data

**Solutions**:

1. **Try simple query first**:
```
Just type: "error"
```

Should show all errors. If not, search is broken.

2. **Check search syntax**:
```
✅ Good: status:error
❌ Bad: status=error

✅ Good: action:sendEmail
❌ Bad: action="sendEmail"
```

3. **Verify permissions**:
```sql
-- Check if you can access logs
SELECT COUNT(*) FROM agent_action_logs;
```

4. **Rebuild search index** (admin only):
```sql
-- Refresh materialized view if using one
REFRESH MATERIALIZED VIEW CONCURRENTLY search_index;
```

---

### Performance Issues

**Symptom**: AOC is slow, laggy, or unresponsive

**Possible Causes**:
- ❌ Too many logs rendering
- ❌ Large result set
- ❌ Browser memory leak
- ❌ Network latency

**Solutions**:

1. **Limit visible logs**:
- Use filters to reduce results
- Narrow time range (last hour instead of last 7 days)
- Pause auto-scroll (press `Space`)

2. **Check browser performance**:
```
Chrome DevTools → Performance → Record
```

Look for:
- Long tasks (>50ms)
- Memory leaks (increasing heap size)
- Excessive re-renders

3. **Reduce real-time updates**:
```typescript
// Increase update interval
const interval = 5000; // 5 seconds instead of default 30s
```

4. **Close unused tabs**:
Multiple AOC tabs can strain resources.

5. **Disable browser extensions**:
Some extensions interfere with WebSocket connections.

6. **Database optimization** (admin):
```sql
-- Vacuum and analyze
VACUUM ANALYZE agent_action_logs;
VACUUM ANALYZE agent_runs;

-- Update statistics
ANALYZE agent_action_logs;
```

---

### Authentication Issues

**Symptom**: "Session expired" or constant logouts

**Possible Causes**:
- ❌ Token expired
- ❌ Clock skew
- ❌ CORS issue
- ❌ Cookie settings

**Solutions**:

1. **Re-authenticate**:
Log out completely and log back in.

2. **Check system clock**:
Ensure your computer's clock is accurate. JWT tokens are time-sensitive.

3. **Clear auth storage**:
```typescript
// In browser console
localStorage.removeItem('supabase.auth.token');
location.reload();
```

4. **Verify CORS settings** (admin):
```typescript
// Supabase Edge Function
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
};
```

5. **Check cookie settings**:
Ensure third-party cookies aren't blocked (Safari especially).

---

### Export Fails

**Symptom**: Can't export logs or metrics

**Possible Causes**:
- ❌ Result set too large
- ❌ Timeout
- ❌ Permission denied
- ❌ Browser blocking download

**Solutions**:

1. **Reduce export size**:
- Export smaller time range
- Use filters to limit results
- Export in batches

2. **Check permissions**:
```sql
-- Verify export permission
SELECT has_permission(auth.uid(), 'logs:export');
```

3. **Try different format**:
- CSV may work when JSON fails (smaller)
- Text format for simple exports

4. **Increase timeout** (admin):
```typescript
// Edge function config
const timeout = 60000; // 60 seconds
```

5. **Check browser settings**:
Ensure pop-ups and downloads aren't blocked.

---

### Real-Time Not Working

**Symptom**: Updates don't appear automatically, must refresh

**Possible Causes**:
- ❌ WebSocket blocked
- ❌ Subscription failed
- ❌ Publication not configured
- ❌ RLS blocking changes

**Solutions**:

1. **Check WebSocket connection**:
```typescript
// Browser console
console.log(supabase.getChannels());
```

Should show active channels.

2. **Verify publication**:
```sql
-- Admin check
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

Should include: `agents`, `agent_runs`, `agent_action_logs`

3. **Test subscription**:
```typescript
const channel = supabase
  .channel('test')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'agents'
  }, (payload) => console.log('Change:', payload))
  .subscribe();
```

4. **Check firewall/proxy**:
Some corporate networks block WebSocket. Test from different network.

5. **Enable realtime** (admin):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE agent_action_logs;
```

---

### Workflow Graph Not Showing

**Symptom**: Workflow visualization is blank or shows error

**Possible Causes**:
- ❌ Invalid workflow JSON
- ❌ Missing workflow_graph_id
- ❌ Corrupted graph data
- ❌ Browser compatibility

**Solutions**:

1. **Validate workflow JSON**:
```typescript
// Browser console
const workflow = agent.workflow_graph;
console.log(JSON.stringify(workflow, null, 2));
```

Must have:
- `nodes` array
- `edges` array
- Each node has `id`, `type`, `data`

2. **Check workflow exists**:
```sql
SELECT * FROM workflow_graphs
WHERE id = 'your-workflow-id';
```

3. **Rebuild workflow**:
If corrupted, recreate in workflow builder.

4. **Try different browser**:
Graph requires modern browser with Canvas support.

---

## Error Messages

### "Network request failed"

**Cause**: Can't reach Supabase  
**Fix**: Check internet connection, verify Supabase URL in env variables

### "JWT expired"

**Cause**: Session timed out  
**Fix**: Re-authenticate (log out and back in)

### "Permission denied"

**Cause**: RLS policy or role restriction  
**Fix**: Contact admin to grant required permission

### "Resource not found"

**Cause**: Trying to access deleted/non-existent agent  
**Fix**: Verify agent ID, may have been deleted

### "Rate limit exceeded"

**Cause**: Too many requests  
**Fix**: Wait 60 seconds, reduce request frequency

### "Validation error"

**Cause**: Invalid data submitted  
**Fix**: Check form inputs, ensure all required fields filled

### "Internal server error"

**Cause**: Edge function crashed  
**Fix**: Check edge function logs, may need admin investigation

---

## Advanced Diagnostics

### Enable Debug Mode

```typescript
// In browser console
localStorage.setItem('aoc:debug', 'true');
location.reload();
```

Shows additional logging:
- API requests/responses
- Real-time events
- State changes
- Performance metrics

### Network Analysis

```
Chrome DevTools → Network Tab
```

Look for:
- Failed requests (red)
- Slow requests (>1s)
- WebSocket connection (101 status)
- CORS errors

### Database Query Performance

```sql
-- Find slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Edge Function Debugging

```bash
# Tail logs in real-time
supabase functions logs aoc-runtime-control --tail

# Filter for errors only
supabase functions logs aoc-runtime-control | grep ERROR

# Get last 100 lines
supabase functions logs aoc-runtime-control --limit 100
```

---

## Getting Help

### Information to Gather

When reporting issues, include:

1. **Environment**:
   - Browser and version
   - Operating system
   - AOC version

2. **Steps to reproduce**:
   - What you were doing
   - What you expected
   - What actually happened

3. **Screenshots**:
   - Error messages
   - Network tab
   - Console logs

4. **Logs**:
```typescript
// Export debug info
console.save = function(data, filename){
  const blob = new Blob([data], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};

// Then run:
console.save(JSON.stringify({
  browser: navigator.userAgent,
  logs: localStorage.getItem('aoc:logs'),
  state: store.getState()
}, null, 2), 'aoc-debug.json');
```

### Contact Support

**Priority levels**:
- 🔴 **Critical**: System down, data loss → Call on-call
- 🟡 **High**: Feature broken, blocking work → Email within 4h
- 🟢 **Normal**: Minor issue, workaround exists → Email within 24h

**Support channels**:
- Email: support@your-org.com
- Slack: #aoc-support
- Phone: +1-XXX-XXX-XXXX (critical only)

---

## Prevention

### Best Practices

To avoid common issues:

1. **Keep browser updated**:
Use latest Chrome, Firefox, or Safari

2. **Monitor system health**:
Check dashboard daily

3. **Regular maintenance**:
Follow [Admin Guide](./ADMIN_GUIDE.md) schedule

4. **Test changes in staging**:
Never test directly in production

5. **Document customizations**:
Track all configuration changes

### Health Checks

Set up automated monitoring:

```yaml
# Example monitoring config
checks:
  - name: AOC Available
    url: https://your-aoc.com/api/health
    interval: 60s
    
  - name: Database Responsive
    query: SELECT 1
    timeout: 5s
    
  - name: Real-time Working
    websocket: wss://your-project.supabase.co/realtime/v1
    timeout: 10s
```

---

## Related Documentation

- 📖 [User Guide](./USER_GUIDE.md) - Feature documentation
- ⚙️ [Admin Guide](./ADMIN_GUIDE.md) - Configuration
- ❓ [FAQ](./FAQ.md) - Common questions

---

[← Back to Documentation](./README.md)
