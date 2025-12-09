# AOC Deployment Guide

## Overview
The Agent Operations Center (AOC) is a production-ready, enterprise-grade management console for deployed AI agents and digital twins.

## Prerequisites

### Backend Requirements
1. **Supabase Project** configured with:
   - `agents` table
   - `agent_runs` table
   - `agent_action_logs` table
   - `deployments` table
   - `audit_logs` table

2. **Edge Functions** deployed:
   - `aoc-runtime-control` - Handles start/pause/stop/restart actions
   - `aoc-simulate-test` - Handles simulation and testing

3. **Real-time enabled** on:
   - `agent_action_logs` table
   - `agents` table

### Frontend Requirements
1. React 18+
2. TanStack Query v5+
3. React Router v6+
4. Tailwind CSS
5. Radix UI components

## Deployment Steps

### 1. Database Setup

Run the following SQL to enable realtime:

```sql
-- Enable realtime for action logs
ALTER PUBLICATION supabase_realtime ADD TABLE agent_action_logs;

-- Enable realtime for agents
ALTER PUBLICATION supabase_realtime ADD TABLE agents;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_action_logs_system_id 
ON agent_action_logs(system_id);

CREATE INDEX IF NOT EXISTS idx_agent_action_logs_created_at 
ON agent_action_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id 
ON agent_runs(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at 
ON agent_runs(created_at DESC);
```

### 2. Edge Functions Deployment

Deploy edge functions:

```bash
# Deploy runtime control
supabase functions deploy aoc-runtime-control

# Deploy simulation test
supabase functions deploy aoc-simulate-test

# Set required secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Frontend Configuration

Set environment variables:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

### 4. Build & Deploy

```bash
# Install dependencies
npm install

# Run tests
npm run test
npm run test:e2e

# Build for production
npm run build

# Deploy to your hosting platform
```

## Verification Checklist

After deployment, verify:

- [ ] AOC loads at `/app/agents/:agentId/operations`
- [ ] Quick stats display correctly
- [ ] Activity stream shows real-time logs
- [ ] Runtime controls (Run/Pause/Stop/Restart) work
- [ ] Command palette opens with ⌘K
- [ ] Workflow graph renders
- [ ] Metrics panel displays data
- [ ] Team collaboration features work
- [ ] Real-time updates are working
- [ ] Keyboard shortcuts function
- [ ] Search and filtering work
- [ ] Error boundaries handle errors gracefully
- [ ] Loading states display properly

## Performance Optimization

### Database Query Optimization
```sql
-- Vacuum and analyze tables
VACUUM ANALYZE agent_action_logs;
VACUUM ANALYZE agent_runs;
VACUUM ANALYZE agents;

-- Set autovacuum for high-traffic tables
ALTER TABLE agent_action_logs SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE agent_runs SET (autovacuum_vacuum_scale_factor = 0.05);
```

### Frontend Optimization
- Enable TanStack Query caching (already configured)
- Use React Query devtools in development only
- Enable code splitting for large components
- Implement virtual scrolling for long lists (if needed)

## Monitoring

### Key Metrics to Monitor
1. **API Response Times**
   - Edge function latency
   - Database query performance
   
2. **Real-time Performance**
   - WebSocket connection stability
   - Message delivery latency
   
3. **User Experience**
   - Time to first render
   - Time to interactive
   - Error rate

### Recommended Tools
- Supabase Dashboard for database metrics
- Vercel Analytics (if using Vercel)
- Sentry for error tracking
- LogRocket for session replay

## Troubleshooting

### Common Issues

**Issue: Real-time updates not working**
- Check that tables are added to `supabase_realtime` publication
- Verify RLS policies allow SELECT on action logs
- Check browser console for WebSocket errors

**Issue: Edge functions failing**
- Verify secrets are set correctly
- Check function logs in Supabase dashboard
- Ensure service role key has proper permissions

**Issue: Slow performance**
- Check database indexes are created
- Review query execution plans
- Consider adding more aggressive caching

**Issue: Authentication errors**
- Verify JWT token is being passed correctly
- Check RLS policies on tables
- Ensure user has proper permissions

## Security Considerations

1. **Authentication**: All routes require authentication
2. **Authorization**: RLS policies enforce user-level access
3. **API Keys**: Never expose service role key to frontend
4. **Rate Limiting**: Implement on edge functions if needed
5. **Data Validation**: All inputs validated on backend

## Rollback Procedure

If issues occur:

1. **Frontend**: Revert to previous Git commit and redeploy
2. **Database**: Use Supabase point-in-time recovery if needed
3. **Edge Functions**: Deploy previous working version
4. **Disable Real-time**: Remove tables from publication temporarily

## Support

For issues or questions:
- Check logs in Supabase Dashboard
- Review `src/components/aoc/README.md`
- Contact development team

## Changelog

### v1.0.0 (Current)
- Initial AOC release
- 6-panel resizable layout
- Real-time activity streaming
- Runtime control integration
- Command palette
- Team collaboration features
- Full keyboard shortcuts
- Comprehensive testing suite
