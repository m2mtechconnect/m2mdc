# AOC Administrator Guide

Complete guide for administrators managing AOC deployment, configuration, and maintenance.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [User Management](#user-management)
3. [Configuration](#configuration)
4. [Monitoring](#monitoring)
5. [Backup & Recovery](#backup-recovery)
6. [Security](#security)
7. [Performance Tuning](#performance-tuning)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Compliance](#compliance)

---

## Initial Setup

### System Requirements

**Backend (Supabase)**:
- Database: PostgreSQL 13+
- Storage: 10GB minimum
- Edge Functions: Deno runtime

**Frontend**:
- Node.js 18+ or Bun
- React 18+
- Modern browser

**Network**:
- WebSocket support required
- HTTPS recommended
- CDN optional but recommended

### Database Setup

1. **Enable required tables**:
```sql
-- Run in Supabase SQL editor
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ... (see AOC_DEPLOYMENT.md for full schema)
```

2. **Enable real-time**:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_action_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
```

3. **Create indexes** (see [Performance Tuning](#performance-tuning))

### Edge Functions Deployment

1. Deploy runtime control:
```bash
supabase functions deploy aoc-runtime-control
```

2. Deploy simulation test:
```bash
supabase functions deploy aoc-simulate-test
```

3. Set secrets:
```bash
supabase secrets set SUPABASE_URL=your-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
```

### Frontend Configuration

1. Set environment variables:
```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

2. Build production:
```bash
npm run build
```

3. Deploy to hosting (Vercel, Netlify, etc.)

### Verification

Run the deployment checklist:
- [ ] Database tables created
- [ ] RLS policies enabled
- [ ] Edge functions deployed
- [ ] Frontend deployed
- [ ] Real-time working
- [ ] Authentication configured

---

## User Management

### Roles & Permissions

| Role | Permissions | Use Case |
|------|-------------|----------|
| **Owner** | Full access | Organization admin |
| **Admin** | Manage users, config | Team lead |
| **Operator** | Control agents | Daily operations |
| **Viewer** | Read-only access | Stakeholders |

### Adding Users

1. Navigate to Settings → Users
2. Click "Invite User"
3. Enter email address
4. Assign role
5. Send invitation

**Invitation flow**:
- User receives email
- Clicks invitation link
- Sets password
- Gains access

### Managing Permissions

**Role-based access control (RBAC)**:

```sql
-- Example: Grant operator role
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid', 'operator');

-- Example: Revoke role
DELETE FROM user_roles
WHERE user_id = 'user-uuid' AND role = 'viewer';
```

**Granular permissions**:
- `agents:read` - View agents
- `agents:write` - Control agents
- `logs:read` - View logs
- `logs:export` - Export logs
- `settings:write` - Change configuration

### User Audit Trail

Track all user actions:

```sql
SELECT 
  u.email,
  a.action,
  a.entity_type,
  a.created_at,
  a.details
FROM audit_logs a
JOIN profiles u ON a.user_id = u.user_id
WHERE a.created_at > NOW() - INTERVAL '7 days'
ORDER BY a.created_at DESC;
```

### Single Sign-On (SSO)

Enable enterprise SSO:

1. Configure SAML/OAuth provider
2. Set up in Supabase Auth
3. Map roles from identity provider
4. Test authentication flow
5. Migrate users

Supported providers:
- Google Workspace
- Microsoft Azure AD
- Okta
- OneLogin
- Custom SAML 2.0

### Session Management

**Default settings**:
- Session timeout: 24 hours
- Refresh token: 7 days
- MFA recommended: Yes

**Configure**:
```sql
-- Update session timeout
UPDATE auth.config
SET session_timeout = INTERVAL '12 hours';
```

---

## Configuration

### System Settings

Access Settings → System Configuration:

**General**:
- Organization name
- Timezone
- Date format
- Language

**Logging**:
- Log retention period (default: 7 days)
- Log level (INFO, WARN, ERROR, DEBUG)
- Sampling rate (default: 100%)
- Storage location

**Performance**:
- Real-time update interval (default: 30s)
- Max concurrent connections (default: 100)
- Query timeout (default: 30s)
- Cache TTL (default: 5m)

**Notifications**:
- Email server (SMTP)
- Slack webhook URL
- PagerDuty integration
- Custom webhooks

### Agent Defaults

Set default configurations for new agents:

```json
{
  "defaultModel": "gpt-4",
  "maxRetries": 3,
  "timeout": 30000,
  "loggingLevel": "INFO",
  "errorNotifications": true,
  "metricsRetention": "30d"
}
```

### Alert Configuration

**Default alerts** (recommended):
```yaml
alerts:
  - name: High Error Rate
    condition: error_rate > 5%
    window: 5m
    severity: critical
    
  - name: High Latency
    condition: p95_latency > 500ms
    window: 10m
    severity: warning
    
  - name: Agent Down
    condition: status = stopped
    window: 1m
    severity: critical
```

### Integration Settings

**Data sources**:
- API keys management
- Connection pooling
- Retry policies
- Rate limiting

**External services**:
- Slack notifications
- PagerDuty alerts
- DataDog metrics
- Custom webhooks

### Feature Flags

Enable/disable features:

```typescript
export const featureFlags = {
  workflowGraph: true,
  advancedSearch: true,
  exportLogs: true,
  customDashboards: false, // Coming soon
  aiAssistant: false        // Beta
};
```

---

## Monitoring

### Key Metrics to Track

**System health**:
- Uptime percentage
- API response time
- Database query performance
- Edge function cold starts

**Agent performance**:
- Success rate by agent
- Average latency
- Error rate
- Run frequency

**User activity**:
- Daily active users
- Feature usage
- Session duration
- Error reports

### Setting Up Monitoring

**Option 1: Built-in Dashboard**

Access Monitoring → System Health to see:
- Real-time metrics
- Historical trends
- Alert status
- Resource usage

**Option 2: External APM**

Integrate with DataDog, New Relic, or similar:

```typescript
// Example: DataDog integration
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'your-app-id',
  clientToken: 'your-client-token',
  site: 'datadoghq.com',
  service: 'aoc',
  env: 'production',
  version: '1.0.0',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
});
```

### Alert Escalation

**Escalation policy**:

```yaml
Level 1 (Warning):
  - Send Slack notification
  - Log to system
  - Wait 5 minutes

Level 2 (Error):
  - Send email to on-call
  - Create PagerDuty incident
  - Wait 10 minutes

Level 3 (Critical):
  - Call on-call phone
  - Escalate to manager
  - Create war room
```

### Health Checks

Set up automated health checks:

```bash
# Example health check script
curl -f https://your-aoc.com/api/health || exit 1

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "functions": "operational",
  "realtime": "active"
}
```

Run every 60 seconds from external monitoring service.

### Performance Baselines

Establish normal operating ranges:

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Success Rate | >98% | 95-98% | <95% |
| P95 Latency | <300ms | 300-500ms | >500ms |
| Error Rate | <1% | 1-5% | >5% |
| Uptime | 99.9% | 99.5-99.9% | <99.5% |

---

## Backup & Recovery

### Backup Strategy

**Automated backups**:
- Daily full database backup
- Hourly incremental backups
- 30-day retention
- Off-site storage

**What to backup**:
- Database tables
- Edge function code
- Configuration files
- Environment variables
- User data

### Database Backup

**Manual backup**:
```bash
# Via Supabase CLI
supabase db dump -f backup.sql

# Via pg_dump
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

**Automated backup**:
```yaml
# GitHub Actions example
name: Database Backup
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Backup database
        run: |
          supabase db dump -f backup.sql
          aws s3 cp backup.sql s3://backups/aoc/$(date +%Y%m%d).sql
```

### Restore Procedure

**Full restore**:
```bash
# 1. Stop all agents
# 2. Restore database
psql $DATABASE_URL < backup.sql

# 3. Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM agents;"

# 4. Restart services
supabase functions deploy --all
```

**Point-in-time recovery**:
```bash
# Restore to specific timestamp
supabase db restore --backup-id=backup-123 --recovery-point="2024-01-15 14:30:00"
```

### Disaster Recovery Plan

**Recovery Time Objective (RTO)**: 4 hours  
**Recovery Point Objective (RPO)**: 1 hour

**Steps**:
1. **Detect**: Alert triggers
2. **Assess**: Determine severity
3. **Communicate**: Notify stakeholders
4. **Restore**: Execute recovery plan
5. **Verify**: Test functionality
6. **Document**: Post-mortem report

**Runbook**:
```markdown
1. Declare incident
2. Assemble response team
3. Switch to backup infrastructure
4. Restore latest backup
5. Verify critical workflows
6. Resume operations
7. Conduct post-mortem
```

### Testing Backups

**Monthly drill**:
1. Select random backup
2. Restore to staging environment
3. Run test suite
4. Verify data integrity
5. Document results

---

## Security

### Authentication

**Multi-factor authentication (MFA)**:
- Enforce for admin roles
- Optional for operators
- TOTP or SMS-based

**Password policy**:
- Minimum 12 characters
- Complexity requirements
- 90-day expiration
- No password reuse (last 5)

### Authorization

**Row-level security (RLS)**:

```sql
-- Example: Users can only see their org's agents
CREATE POLICY user_org_agents ON agents
  FOR SELECT
  USING (org_id = (SELECT org_id FROM profiles WHERE user_id = auth.uid()));
```

### API Security

**Rate limiting**:
```typescript
// Supabase Edge Function
const rateLimiter = new RateLimiter({
  points: 100,        // Number of requests
  duration: 60,       // Per 60 seconds
  blockDuration: 300  // Block for 5 minutes if exceeded
});
```

**API key rotation**:
- Rotate service keys quarterly
- Automated rotation via secrets manager
- Notify affected services

### Data Encryption

**At rest**:
- Database: AES-256 encryption
- Backups: Encrypted before upload
- Secrets: Vault storage

**In transit**:
- HTTPS/TLS 1.3 required
- WebSocket over TLS (wss://)
- Certificate pinning (optional)

### Audit Logging

**Log all security events**:
- Failed login attempts
- Permission changes
- Data exports
- Configuration updates
- Agent control actions

**Retention**: 2 years minimum

### Compliance

**Standards supported**:
- SOC 2 Type II
- GDPR
- HIPAA (with BAA)
- ISO 27001

**Data residency**:
- Configure region in Supabase
- Ensure data stays in required geography
- Document data flows

### Vulnerability Management

**Patch management**:
- Weekly dependency updates
- Monthly security patches
- Quarterly major version updates

**Scanning**:
```bash
# Run security audit
npm audit

# Fix automatically
npm audit fix

# Check for outdated packages
npm outdated
```

### Incident Response

**Security incident playbook**:

1. **Detection**: Alert or report
2. **Containment**: Isolate affected systems
3. **Eradication**: Remove threat
4. **Recovery**: Restore services
5. **Lessons Learned**: Post-incident review

**Contact**: security@your-org.com

---

## Performance Tuning

### Database Optimization

**Indexes** (already created in deployment):
```sql
-- Query performance indexes
CREATE INDEX idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_created_at ON agent_runs(created_at);
CREATE INDEX idx_action_logs_run_id ON agent_action_logs(run_id);
CREATE INDEX idx_action_logs_created_at ON agent_action_logs(created_at);
```

**Query optimization**:
```sql
-- Use EXPLAIN to analyze queries
EXPLAIN ANALYZE
SELECT * FROM agent_runs
WHERE agent_id = 'agent-123'
  AND status = 'completed'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Connection pooling**:
```typescript
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  global: {
    headers: { 'x-connection-pool-size': '20' }
  }
});
```

### Frontend Performance

**Code splitting**:
```typescript
// Lazy load AOC page
const AOCPage = lazy(() => import('./pages/AOC'));
```

**Memoization**:
```typescript
const MemoizedActivityStream = React.memo(ActivityStream);
```

**Virtual scrolling**:
- Use for large log lists
- Render only visible items
- Improves scroll performance

### Real-time Optimization

**Reduce payload size**:
```typescript
supabase
  .channel('agent-logs')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'agent_action_logs',
    filter: `agent_id=eq.${agentId}`
  }, payload => {
    // Only subscribe to relevant changes
  })
```

**Batch updates**:
- Accumulate changes for 100ms
- Send single update instead of many

### Caching Strategy

**API responses**:
```typescript
const { data, error } = await supabase
  .from('agents')
  .select('*')
  .eq('status', 'active')
  .cache(300); // Cache for 5 minutes
```

**Static assets**:
- CDN caching: 1 year
- API responses: 5 minutes
- User data: No cache

---

## Maintenance

### Routine Tasks

**Daily**:
- Review error logs
- Check alert status
- Verify backup completion
- Monitor resource usage

**Weekly**:
- Analyze performance trends
- Review security logs
- Update documentation
- Team sync meeting

**Monthly**:
- Patch updates
- Capacity planning review
- Backup restoration test
- Security audit

**Quarterly**:
- Major version upgrades
- Cost optimization review
- User access audit
- Disaster recovery drill

### Scheduled Maintenance

**Planning**:
1. Announce 7 days in advance
2. Schedule during low-usage window
3. Prepare rollback plan
4. Test in staging first

**Maintenance window**:
```markdown
Date: Saturday, 2024-01-20
Time: 02:00 - 06:00 UTC
Expected downtime: 2 hours
Impact: Full system unavailable

Reason: Database upgrade and security patches
```

**Communication template**:
```
Subject: Scheduled Maintenance - AOC - [Date]

Dear Users,

We will be performing scheduled maintenance on [Date] from [Start] to [End] UTC.

During this time:
- AOC will be unavailable
- Agents will continue running (no impact on operations)
- Access will resume automatically after maintenance

What we're doing:
- Database performance improvements
- Security updates
- Feature enhancements

Thank you for your patience.
```

### Data Cleanup

**Log retention**:
```sql
-- Delete logs older than 30 days
DELETE FROM agent_action_logs
WHERE created_at < NOW() - INTERVAL '30 days';

-- Archive to cold storage first (optional)
INSERT INTO agent_action_logs_archive
SELECT * FROM agent_action_logs
WHERE created_at < NOW() - INTERVAL '30 days';
```

**Scheduled cleanup job**:
```sql
-- Create pg_cron job
SELECT cron.schedule('cleanup-old-logs', '0 3 * * *', $$
  DELETE FROM agent_action_logs
  WHERE created_at < NOW() - INTERVAL '30 days'
$$);
```

### Version Updates

**Update checklist**:
- [ ] Review changelog
- [ ] Test in staging
- [ ] Backup production
- [ ] Schedule maintenance window
- [ ] Deploy to production
- [ ] Verify functionality
- [ ] Monitor for issues
- [ ] Update documentation

---

## Troubleshooting

### Common Admin Issues

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions.

**Quick reference**:

| Issue | Likely Cause | Quick Fix |
|-------|--------------|-----------|
| Users can't log in | Auth config issue | Check Supabase Auth settings |
| Slow queries | Missing indexes | Add indexes (see Performance) |
| Real-time not working | Publication not configured | Add tables to publication |
| Edge function errors | Missing secrets | Set required secrets |
| High memory usage | Log accumulation | Run cleanup job |

### Log Analysis

**Find performance bottlenecks**:
```sql
SELECT 
  action_key,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration
FROM agent_action_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY action_key
ORDER BY avg_duration DESC;
```

**Identify error patterns**:
```sql
SELECT 
  error_message,
  COUNT(*) as occurrences,
  MAX(created_at) as last_occurrence
FROM agent_action_logs
WHERE status = 'error'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY error_message
ORDER BY occurrences DESC
LIMIT 10;
```

### Support Escalation

**Level 1**: User reports issue
- Check user permissions
- Verify system status
- Review recent changes
- Standard troubleshooting

**Level 2**: Admin investigates
- Analyze logs and metrics
- Test reproduction steps
- Attempt workarounds
- Document findings

**Level 3**: Engineering support
- Code-level debugging
- Database query analysis
- Infrastructure review
- Hotfix deployment

---

## Compliance

### GDPR Compliance

**Data subject rights**:
- Right to access
- Right to erasure
- Right to portability
- Right to rectification

**Implementation**:
```typescript
// Export user data
async function exportUserData(userId: string) {
  const { data } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('user_id', userId);
  
  return data;
}

// Delete user data
async function deleteUserData(userId: string) {
  await supabase
    .from('agent_runs')
    .delete()
    .eq('user_id', userId);
  
  // Also delete from other tables...
}
```

### SOC 2 Requirements

**Access controls**:
- MFA enabled
- Role-based access
- Audit logging
- Regular access reviews

**Change management**:
- Code reviews required
- Staging environment testing
- Rollback procedures
- Change documentation

**Incident response**:
- Detection mechanisms
- Response procedures
- Communication plans
- Post-incident reviews

### Data Retention

**Retention policy**:
- Logs: 30 days (configurable)
- Metrics: 90 days
- Audit logs: 2 years
- User data: Until account deletion

**Configure**:
```sql
-- Update retention settings
UPDATE system_config
SET log_retention_days = 30,
    metrics_retention_days = 90,
    audit_retention_days = 730;
```

### Regular Audits

**Quarterly security audit**:
- [ ] Review user access
- [ ] Check RLS policies
- [ ] Analyze security logs
- [ ] Test backup restoration
- [ ] Update documentation
- [ ] Conduct penetration test
- [ ] Review compliance status

---

## Next Steps

- 📖 [User Guide](./USER_GUIDE.md) - Daily operations
- 🐛 [Troubleshooting](./TROUBLESHOOTING.md) - Solve issues
- 👨‍💻 [Developer Guide](./DEVELOPER_GUIDE.md) - Extend AOC

---

[← Back to Documentation](./README.md)
