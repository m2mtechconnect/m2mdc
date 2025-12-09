# AOC RBAC Manual Testing Checklist

This document provides a comprehensive manual testing checklist for verifying RBAC implementation across AURA.

## Prerequisites

1. Database reset and migrations applied:
   ```bash
   supabase db reset
   ```

2. Seed data loaded:
   ```bash
   psql $DATABASE_URL < supabase/seed/aoc_demo_data.sql
   ```

3. Three test user accounts created:
   - **Admin User**: Has `admin` role with `global` scope
   - **Operator User**: Has `operator` role with `global` or agent-specific scope
   - **Viewer User**: Has `viewer` role with agent-specific scope

## Test Scenarios

### 1. Authentication & Role Assignment

- [ ] **1.1**: Log in as each test user and verify their role is correctly fetched
  - Navigate to any page
  - Open browser DevTools → Network
  - Look for `user_roles` query
  - Verify correct roles returned

- [ ] **1.2**: Verify `isGlobalAdmin` flag works
  - Log in as admin user
  - Check that admin-only UI elements are visible (e.g., Access Control menu)
  - Log in as operator/viewer
  - Verify admin-only elements are hidden

### 2. Admin UI - Access Control Page

#### As Global Admin:

- [ ] **2.1**: Access the Access Control page
  - Navigate to Settings → Access Control
  - Verify page loads without errors
  - Verify user roles table displays all current role assignments

- [ ] **2.2**: Grant a new role
  - Click "Grant Role" button
  - Enter a valid user email (from profiles table)
  - Select role: `viewer`
  - Select scope: `global`
  - Click "Grant Role"
  - Verify success toast
  - Verify new role appears in table

- [ ] **2.3**: Grant a scoped role
  - Click "Grant Role"
  - Enter user email
  - Select role: `operator`
  - Select scope: `Specific Agent`
  - Choose an agent from dropdown
  - Grant role
  - Verify scope shows as "Scoped" in table
  - Hover over scope badge to see `agent:<id>`

- [ ] **2.4**: Revoke a role
  - Click trash icon next to a role assignment
  - Confirm revocation in dialog
  - Verify role disappears from table
  - Verify success toast

#### As Non-Admin:

- [ ] **2.5**: Attempt to access Access Control page
  - Log in as operator or viewer
  - Navigate to `/app/settings/access-control`
  - Verify "Access Denied" message displayed
  - Verify no sensitive data visible

### 3. Agent Operations - Permission Enforcement

#### As Agent Owner:

- [ ] **3.1**: Verify full access to owned agents
  - Navigate to Agents list
  - Select an agent you own
  - Verify you can:
    - View agent details
    - Access all tabs (Live, Workflow, Blueprint, etc.)
    - See runtime status
    - View logs and metrics

- [ ] **3.2**: Test runtime controls
  - Go to agent's Live Activity tab
  - Click "Run" button
  - Verify agent starts successfully
  - Click "Pause" → verify success
  - Click "Stop" → verify success
  - Click "Restart" → verify success

#### As Global Admin:

- [ ] **3.3**: Verify access to all agents
  - Navigate to Agents list
  - Verify you see all agents (not just your own)
  - Select an agent owned by another user
  - Verify full access to all tabs and controls

- [ ] **3.4**: Test admin operations
  - Navigate to an agent detail page
  - Verify "Delete Agent" button is visible
  - Verify you can access deployment settings
  - Verify you can manage workflows

#### As Operator (Global Scope):

- [ ] **3.5**: Verify operate permissions
  - Navigate to Agents list
  - Select any agent
  - Verify you can:
    - View agent details and logs
    - Start/stop/restart agent
    - Run simulations
  - Verify you cannot:
    - Delete agent
    - Manage user permissions

#### As Operator (Agent-Scoped):

- [ ] **3.6**: Verify scoped access
  - Navigate to Agents list
  - Verify you only see the scoped agent
  - Select the scoped agent
  - Verify you can operate it
  - Try to access another agent via direct URL
  - Verify access denied or empty data

#### As Viewer:

- [ ] **3.7**: Verify read-only access
  - Navigate to Agents list
  - Select an agent you have viewer access to
  - Verify you can:
    - View agent details
    - See runtime status
    - View logs and metrics
  - Verify runtime control buttons are:
    - Either hidden
    - Or disabled with tooltip explaining insufficient permissions

- [ ] **3.8**: Test operation denial
  - Attempt to trigger any runtime action (if button visible)
  - Verify error toast: "You do not have permission to control this agent"
  - Verify agent status unchanged

### 4. RLS (Row-Level Security) Verification

#### Database-Level Checks:

- [ ] **4.1**: Test `agent_runtime_status` RLS
  - Log in as User A
  - Open DevTools → Network
  - Navigate to an agent owned by User B
  - Look for `agent_runtime_status` query
  - Verify:
    - Query returns 0 rows for User B's agent
    - OR query returns error 401/403

- [ ] **4.2**: Test `agent_activity_logs` RLS
  - Same as above for activity logs table
  - Verify no data leakage across users

- [ ] **4.3**: Test `cloud_deployments` RLS
  - Try to query deployments for an agent you don't own
  - Verify access denied or empty result

#### Manual SQL Checks (via Supabase Dashboard or psql):

```sql
-- As authenticated user (not service_role)
SELECT * FROM public.agent_runtime_status WHERE agent_id = '<other-user-agent-id>';
-- Expected: 0 rows or permission denied

SELECT * FROM public.agent_activity_logs WHERE agent_id = '<other-user-agent-id>';
-- Expected: 0 rows or permission denied

SELECT * FROM public.user_roles WHERE user_id != auth.uid();
-- Expected: 0 rows (can only see own roles unless admin)
```

### 5. Edge Function RBAC

- [ ] **5.1**: Test `aoc-runtime-action` permission check
  - Log in as a user with no access to an agent
  - Get agent ID from URL
  - Open browser console
  - Try to invoke runtime action:
    ```javascript
    const { data, error } = await supabase.functions.invoke('aoc-runtime-action', {
      body: { agentId: '<no-access-agent-id>', action: 'run' }
    });
    console.log(data, error);
    ```
  - Verify error returned: "Permission denied" or similar

- [ ] **5.2**: Test successful permission check
  - Log in as agent owner
  - Invoke same function for owned agent
  - Verify success response

### 6. UI Elements Based on Permissions

- [ ] **6.1**: Admin-only UI elements
  - Log in as admin
  - Verify these are visible:
    - "Access Control" in Settings menu
    - "Delete Agent" button on agent pages
    - "Manage Roles" or similar admin controls
  - Log in as non-admin
  - Verify all above elements are hidden

- [ ] **6.2**: Operator UI elements
  - Log in as operator
  - Verify runtime control buttons visible:
    - Run, Pause, Stop, Restart
  - Log in as viewer
  - Verify these buttons are hidden or disabled

- [ ] **6.3**: Viewer UI elements
  - Log in as viewer
  - Verify:
    - All read-only tabs accessible
    - No edit/delete/control buttons visible
    - Tooltips explain "Read-only access" where applicable

### 7. Error Handling & User Feedback

- [ ] **7.1**: Permission denied errors
  - Trigger a permission-denied scenario
  - Verify:
    - Clear error message shown in toast/alert
    - No technical stack traces visible to user
    - User redirected or state remains stable (no crash)

- [ ] **7.2**: Missing role assignment
  - Create a new user account (no roles assigned yet)
  - Log in
  - Navigate to Agents
  - Verify:
    - Empty state message: "No agents available"
    - Or prompt to contact admin for access

### 8. Regression Tests

- [ ] **8.1**: Verify existing functionality still works
  - Create a new agent
  - Deploy agent
  - Run agent
  - View logs
  - Verify all core workflows unaffected by RBAC

- [ ] **8.2**: Check for performance issues
  - Navigate to Agents list with 50+ agents
  - Verify page loads in <3 seconds
  - Verify RBAC checks don't cause noticeable lag

## Expected Results Summary

| User Role | Can View Agents | Can Operate | Can Delete | Can Manage Roles |
|-----------|----------------|-------------|------------|------------------|
| Owner     | Own agents     | Own agents  | Own agents | No               |
| Viewer    | Allowed agents | No          | No         | No               |
| Operator  | Allowed agents | Allowed agents | No      | No               |
| Admin     | All agents     | All agents  | All agents | Yes              |

## Test Completion

- [ ] All tests passed
- [ ] Issues documented in GitHub/issue tracker
- [ ] RBAC verified in dev environment
- [ ] RBAC verified in staging (if applicable)
- [ ] Documentation updated if behavior differs from spec

## Notes

- If any test fails, document:
  - User role and scope
  - Expected vs actual behavior
  - Error messages or stack traces
  - Steps to reproduce

## Demo Credentials (from seed script)

After running seed script, you should have:

- **Admin**: First user in `auth.users` table with global admin role
- **Agents**: `Credit Risk Assessment Twin`, `Compliance Monitoring System`, `Customer Service AI Agent`
- **Roles**: Pre-seeded in `user_roles` table

To create additional test users:
1. Sign up via `/auth` page
2. Use Access Control UI to grant roles
3. Or insert directly into `user_roles` table (as admin)
