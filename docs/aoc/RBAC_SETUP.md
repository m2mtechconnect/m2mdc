# AOC RBAC Setup Guide

## Overview

The AURA Agent Operations Center (AOC) uses Role-Based Access Control (RBAC) to manage access to agents and their operational data. This guide covers the complete RBAC system implemented via the consolidated migration.

## User Roles

### Role Types

| Role | Description | Permissions |
|------|-------------|-------------|
| **owner** | Agent creator/owner | Full access to their agents (implicit) |
| **admin** | Administrator | Can view, operate, and manage all agents |
| **operator** | Operations engineer | Can view and control agent runtime |
| **viewer** | Read-only access | Can view agent status and logs |

### Role Hierarchy

```
admin (full access)
  ↓
operator (view + operate)
  ↓
viewer (view only)
  ↓
owner (full access to own agents only)
```

## Scope System

Roles can have different scopes:

- **`global`** - Access applies to all agents in the system
- **`agent:<uuid>`** - Access limited to a specific agent
- **`NULL`** - Equivalent to global

### Examples

```sql
-- Global admin (can access all agents)
role: 'admin', scope: 'global'

-- Agent-specific operator (can control one agent)
role: 'operator', scope: 'agent:123e4567-e89b-12d3-a456-426614174000'

-- Agent-specific viewer (can view one agent)
role: 'viewer', scope: 'agent:123e4567-e89b-12d3-a456-426614174000'
```

## Permission Levels

| Permission | Description | Grants Access To |
|------------|-------------|------------------|
| **view** | Read-only access | Logs, metrics, status, versions |
| **operate** | Runtime control | Start/stop/pause, deployments |
| **admin** | Full administrative | All of the above + role management |

## Database Schema

The complete RBAC schema is deployed via the consolidated migration:

```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'viewer', 'owner')),
  scope TEXT,
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role, scope)
);
```

## Granting Roles

### Make User a Global Admin

```sql
INSERT INTO public.user_roles (user_id, role, scope, granted_by)
VALUES (
  '<user_uuid>',
  'admin',
  'global',
  auth.uid()
);
```

### Grant Operator Access to Specific Agent

```sql
INSERT INTO public.user_roles (user_id, role, scope, granted_by)
VALUES (
  '<user_uuid>',
  'operator',
  'agent:<agent_uuid>',
  auth.uid()
);
```

### Grant Time-Limited Viewer Access

```sql
INSERT INTO public.user_roles (user_id, role, scope, granted_by, expires_at)
VALUES (
  '<user_uuid>',
  'viewer',
  'agent:<agent_uuid>',
  auth.uid(),
  now() + interval '7 days'
);
```

## RLS Enforcement

Row Level Security (RLS) policies enforce access control at the database level. All policies are automatically created by the consolidated migration.

### Agent Access Rules

1. **Owners** - Can always access their own agents
2. **Admins** - Can access all agents if scope is global
3. **Operators** - Can access agents if:
   - They have global operator role, OR
   - They have agent-specific operator role for that agent
4. **Viewers** - Can view agents if:
   - They have global viewer role, OR
   - They have agent-specific viewer role for that agent

### AOC Tables Protected by RLS

All of these tables respect user roles and scopes:

- `agent_runtime_status` - Runtime control data
- `agent_activity_logs` - Live activity stream
- `agent_workflows` - Workflow definitions
- `agent_runs` - Execution history
- `agent_versions` - Version history
- `cloud_deployments` - Cloud deployment info
- `audit_logs` - Audit trail

## Usage in Code

### Frontend (React)

```typescript
import { useUserPermissions } from '@/hooks/useUserPermissions';

function AgentControl({ agentId }: { agentId: string }) {
  const { canControlAgent, isGlobalAdmin } = useUserPermissions();
  
  const canControl = canControlAgent(agentId);
  
  return (
    <>
      {canControl && (
        <Button onClick={handleStart}>Start Agent</Button>
      )}
      {isGlobalAdmin && (
        <Button onClick={handleAdmin}>Admin Panel</Button>
      )}
    </>
  );
}
```

### Edge Functions (Backend)

```typescript
// Check if user can access agent with required permission
const { data: canOperate, error } = await supabase.rpc('user_can_access_agent', {
  check_user_id: userId,
  check_agent_id: agentId,
  required_permission: 'operate'
});

if (error || !canOperate) {
  return new Response('Forbidden', { status: 403 });
}
```

### Helper Functions (SQL)

Two helper functions are automatically created by the migration:

#### `user_has_role(user_id, role, scope)`

Check if a user has a specific role.

```sql
SELECT public.user_has_role(
  'user-uuid',
  'admin',
  'global'
); -- Returns boolean
```

#### `user_can_access_agent(user_id, agent_id, permission)`

Check if a user can access an agent with required permission.

```sql
SELECT public.user_can_access_agent(
  auth.uid(),
  'agent-uuid',
  'operate'
); -- Returns boolean
```

## Seed Demo Data

To populate your database with sample agents and data for testing:

```bash
psql $DATABASE_URL < supabase/seed/aoc_demo_data.sql
```

This creates:
- 3 demo agents with various statuses
- Runtime status across dev/test/prod environments
- Workflows with node/edge definitions
- Activity logs (info, error, warning, action, etc.)
- Agent runs with different statuses
- Cloud deployments on AWS/Azure/GCP
- Version history
- Audit logs

The seed script is idempotent and safe to run multiple times.

## Best Practices

### Security

1. **Always use scopes** - Prefer agent-specific roles over global
2. **Set expiration** - Use `expires_at` for temporary access
3. **Audit grants** - Log who granted what role to whom
4. **Principle of least privilege** - Grant minimum required permissions

### Performance

1. **Role cache** - Frontend hook caches roles for 5 minutes
2. **Indexed queries** - All role checks use database indexes
3. **Avoid N+1** - Batch role checks when possible

### Debugging

Check a user's roles:

```sql
SELECT * FROM public.user_roles
WHERE user_id = '<user_uuid>'
AND (expires_at IS NULL OR expires_at > now());
```

Check agent access:

```sql
SELECT public.user_can_access_agent(
  '<user_uuid>',
  '<agent_uuid>',
  'view'
);
```

## Migration Path

The consolidated migration handles everything automatically:

1. ✅ Drops and recreates `user_roles` table with canonical schema
2. ✅ Creates all AOC operational tables
3. ✅ Seeds default environments (dev/test/staging/prod)
4. ✅ Creates all necessary indexes
5. ✅ Defines RBAC helper functions
6. ✅ Sets up RLS policies on all tables
7. ✅ Configures realtime for activity logs
8. ✅ Adds update triggers

No manual SQL execution required!

## Examples

### Team Setup

```sql
-- Engineering team lead (global operator)
INSERT INTO public.user_roles (user_id, role, scope)
VALUES ('eng-lead-uuid', 'operator', 'global');

-- QA engineer (viewer for test environment agents)
INSERT INTO public.user_roles (user_id, role, scope)
VALUES ('qa-uuid', 'viewer', 'agent:test-agent-1');
INSERT INTO public.user_roles (user_id, role, scope)
VALUES ('qa-uuid', 'viewer', 'agent:test-agent-2');

-- External auditor (time-limited global viewer)
INSERT INTO public.user_roles (user_id, role, scope, expires_at)
VALUES ('auditor-uuid', 'viewer', 'global', now() + interval '30 days');
```

## Troubleshooting

### "Access denied" errors

- Check user has appropriate role
- Verify scope matches agent ID
- Check role hasn't expired
- Ensure RLS is enabled on table

### "Role not found" errors

- Verify consolidated migration has been run
- Check `user_roles` table exists
- Verify helper functions exist

### Performance issues

- Check indexes exist on `user_roles`
- Review query plans for RLS policies
- Consider caching role checks

## Testing Checklist

After implementing RBAC:

- [ ] Global admin can access all agents
- [ ] Agent owner can access their agents
- [ ] Agent-scoped operator can control specific agent
- [ ] Agent-scoped viewer can only view specific agent
- [ ] Expired roles are properly filtered
- [ ] Edge functions respect RBAC
- [ ] Frontend UI hides/shows controls based on permissions
- [ ] Audit logs capture role grants/changes
- [ ] Realtime logs stream correctly
- [ ] Runtime controls (run/pause/stop) work with RBAC

## Further Reading

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Agent Operations Center Guide](./AOC_GUIDE.md)
