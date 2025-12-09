# Agent Operations Center (AOC) - Architecture Documentation

## Overview
The Agent Operations Center (AOC) is an enterprise-grade management console for monitoring and controlling deployed AI agents and digital twins. It provides real-time visibility, control, and collaboration capabilities.

## Route
`/app/agents/:agentId/operations`

## Core Features

### 1. Real-time Monitoring
- **Live Activity Stream**: Real-time execution logs with WebSocket subscriptions
- **Performance Metrics**: Success rates, latency, throughput, token usage
- **Workflow Visualization**: Interactive DAG showing execution flow
- **Health Dashboard**: System status, uptime, resource utilization

### 2. Runtime Controls
- Start, Pause, Stop, Restart agent operations
- Version rollback capabilities
- Environment management (dev, staging, production)
- Deployment tracking and audit logs

### 3. Collaboration Features
- **Presence Tracking**: See who's viewing the AOC in real-time
- **Activity Feed**: Team member actions and changes
- **Version History**: Complete deployment timeline with rollback
- **Notifications**: Real-time alerts for critical events

### 4. Productivity Tools
- **Command Palette**: Quick access to all actions (⌘K)
- **Keyboard Shortcuts**: Speed up workflows
- **Search & Filter**: Advanced filtering across all panels
- **Export Tools**: CSV, JSON, PDF exports for reports

### 5. AI-Powered Optimization
- Performance recommendations
- Token usage optimization
- Cost reduction suggestions
- Automated health checks

## Architecture

### Component Structure
```
AgentOperationsCenter (Main Page)
├── AOCErrorBoundary (Error handling)
├── AOCLoadingState (Loading skeleton)
├── AOCOnboardingTour (First-time user guide)
├── AOCCommandPalette (⌘K quick actions)
├── AOCKeyboardShortcuts (? shortcut reference)
├── AOCQuickStats (Header stats bar)
├── 6-Panel Layout (ResizablePanelGroup)
│   ├── Left Panel: Agent Summary
│   │   ├── AOCAgentSidebar
│   │   └── AOCEnvironmentManager
│   ├── Middle Top: Live Activity
│   │   └── AOCActivityStream
│   ├── Middle Bottom: Workflow Graph
│   │   └── AOCWorkflowGraphAdvanced
│   └── Right Panel: Tabbed Tools
│       ├── Metrics Tab
│       │   └── AOCMetricsAdvanced
│       ├── Team Tab
│       │   ├── AOCCollaborationPanel (Presence)
│       │   ├── AOCNotificationsPanel
│       │   └── AOCVersionHistory
│       ├── Tools Tab
│       │   ├── AOCAlertsPanel
│       │   ├── AOCSimulationSandbox
│       │   ├── AOCPerformancePanel
│       │   └── AOCExportPanel
│       └── Governance Tab
│           └── AOCGovernancePanel
```

### Data Flow
1. **Authentication Check**: Verifies user session on mount
2. **Agent Data Fetch**: Loads agent details from `agents` table
3. **Real-time Updates**: 
   - Polling every 5s for metrics
   - WebSocket subscriptions for logs
   - Supabase Realtime for presence
4. **Runtime Control**: Edge function calls for agent control
5. **State Management**: React Query for caching and invalidation

## Database Tables Used

### Primary Tables
- `agents`: Core agent configuration and metadata
- `agent_runs`: Execution history and metrics
- `agent_action_logs`: Detailed action logs
- `deployments`: Deployment status and runtime info
- `audit_logs`: Compliance and governance logs

### Supporting Tables
- `intelligence_settings`: AI configuration
- `agent_integrations`: Connected services
- `environments`: Environment definitions

## Edge Functions

### `aoc-runtime-control`
**Purpose**: Handle runtime control actions (run, pause, stop, restart)
**Auth**: Required (Bearer token)
**Operations**:
- Updates `agents.status`
- Creates/updates `deployments` records
- Logs to `audit_logs` and `agent_action_logs`

### `aoc-simulate-test`
**Purpose**: Run simulation tests for validation
**Auth**: Required
**Operations**:
- Creates test run in `agent_runs`
- Logs simulation results
- Returns test output

## Real-time Features

### Supabase Realtime Subscriptions
```typescript
// Activity Stream
channel('aoc-logs-{agentId}')
  .on('postgres_changes', { table: 'agent_action_logs' })

// Collaboration Presence
channel('aoc_presence_{agentId}')
  .track({ user_id, user_name, viewing_section })
```

### Polling Intervals
- Agent data: 5000ms
- Runtime status: 5000ms
- Recent runs: 5000ms
- Metrics: Auto (via React Query)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open command palette |
| `?` | Show keyboard shortcuts |
| `R` | Run agent |
| `P` | Pause agent |
| `S` | Stop agent |
| `M` | Jump to metrics |
| `L` | Jump to activity logs |
| `T` | Jump to team collaboration |

## Performance Considerations

### Optimization Strategies
1. **Query Caching**: React Query caches with 5s stale time
2. **Lazy Loading**: Panels load data only when visible
3. **Pagination**: Logs limited to 100 most recent
4. **Debounced Search**: 300ms delay on search inputs
5. **Memoization**: Heavy computations memoized with useMemo

### Bundle Size
- Core AOC components: ~120KB (gzipped)
- Dependencies: React Query, Radix UI, Recharts
- Code splitting: Dynamic imports for heavy visualizations

## Security

### RLS Policies
- All queries filtered by `auth.uid() = owner_id`
- Agent actions require ownership verification
- Audit logs restricted to authorized users

### Authentication
- JWT bearer tokens via Supabase Auth
- Session validation on mount
- Automatic redirect to /auth if unauthorized

## Error Handling

### Error Boundary
`AOCErrorBoundary` catches React errors and shows:
- User-friendly error message
- Refresh page option
- Return to agents list
- Development mode stack trace

### API Error Handling
- Toast notifications for user actions
- Automatic retry with exponential backoff
- Graceful degradation for missing data

## Testing Strategy

### Unit Tests
- Component rendering
- Hook logic
- Utility functions

### Integration Tests
- API calls with MSW
- User flows (E2E)
- Real-time subscriptions

### Performance Tests
- Large dataset rendering
- Memory leak detection
- Bundle size monitoring

## Future Enhancements

### Roadmap
1. **v2.0**: Custom dashboards with drag-drop widgets
2. **v2.1**: AI chat assistant for AOC operations
3. **v2.2**: Multi-agent orchestration view
4. **v2.3**: Advanced analytics with custom queries
5. **v2.4**: Mobile responsive layout

### Planned Features
- [ ] Custom metric definitions
- [ ] Webhook integrations
- [ ] Scheduled reports
- [ ] Role-based access control
- [ ] Agent comparison views
- [ ] Cost forecasting

## Development Guidelines

### Adding New Panels
1. Create component in `src/components/aoc/AOC{Name}.tsx`
2. Add to appropriate tab in `AgentOperationsCenter.tsx`
3. Implement loading/error states
4. Add keyboard shortcut if applicable
5. Update this README

### Best Practices
- Use semantic HTML and ARIA labels
- Implement skeleton loading states
- Add help tooltips for complex features
- Follow existing naming conventions
- Write JSDoc comments for props

## Support & Maintenance

### Contact
- Technical Lead: [Add contact]
- Product Owner: [Add contact]
- Documentation: This file + inline JSDoc

### Resources
- [API Documentation](#)
- [Design System](#)
- [Troubleshooting Guide](#)
