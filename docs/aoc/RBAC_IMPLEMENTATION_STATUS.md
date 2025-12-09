# AOC RBAC Implementation Status

## ✅ Completed

### Database Structure
- [x] Created `user_roles` table with proper schema
- [x] Enabled RLS on `user_roles` table
- [x] Added unique constraint on (user_id, role, scope)
- [x] Added expiration support for temporary access

### Edge Functions
- [x] `aoc-runtime-control` - Runtime control with permission checks
- [x] `aoc-environment-promotion` - Environment promotion with audit logs
- [x] Both functions log to `audit_logs` table

### Documentation
- [x] Complete RBAC setup guide (RBAC_SETUP.md)
- [x] Role definitions and permissions matrix
- [x] SQL scripts for all RLS policies
- [x] Helper function definitions
- [x] Usage examples

## ⚠️ Pending Manual Setup

### RLS Policies (Run in Supabase SQL Editor)

The following policies need to be created manually via the Supabase SQL Editor:

1. **user_roles table** (2 policies)
   - `user_roles_select_own`
   - `user_roles_admin_manage`

2. **agents table** (4 policies)
   - `agents_owner_full_access`
   - `agents_admin_view_all`
   - `agents_operator_update`
   - `agents_viewer_select`

3. **agent_action_logs table** (2 policies)
   - `action_logs_select_accessible`
   - `action_logs_system_insert`

4. **agent_runs table** (2 policies)
   - `agent_runs_select_accessible`
   - `agent_runs_insert_owned`

5. **deployments table** (2 policies)
   - `deployments_select_accessible`
   - `deployments_insert_operators`

6. **audit_logs table** (3 policies)
   - `audit_logs_admin_view_all`
   - `audit_logs_user_view_own`
   - `audit_logs_system_insert`

### Helper Functions (Run in Supabase SQL Editor)

1. **user_has_role** - Check if user has specific role
2. **user_can_access_agent** - Check agent access permissions

## 🔄 Integration Required

### Frontend Components
- [ ] Update `useRuntimeControl` hook to show permission-based UI
- [ ] Add role badges in AOC header
- [ ] Implement permission checks before showing action buttons
- [ ] Add "Request Access" flow for denied permissions

### Edge Functions Enhancement
- [ ] Add `user_can_access_agent()` checks in all edge functions
- [ ] Return 403 errors with clear permission messages
- [ ] Log permission denials in audit logs

## 📝 Next Steps

1. **Manual Setup** (15 minutes)
   - Open Supabase SQL Editor
   - Copy-paste all SQL from RBAC_SETUP.md
   - Execute policies and functions
   - Verify with `SELECT * FROM pg_policies WHERE tablename IN ('user_roles', 'agents', 'agent_action_logs')`

2. **Grant Initial Admin Role**
   ```sql
   INSERT INTO public.user_roles (user_id, role, scope)
   VALUES ('YOUR_USER_UUID', 'admin', 'global');
   ```

3. **Test RBAC**
   - Create test users with different roles
   - Test runtime control with each role
   - Verify logs show proper access control
   - Test expired roles

4. **Frontend Integration**
   - Add permission checks to AOC components
   - Show/hide buttons based on user role
   - Display meaningful error messages

## 🎯 Acceptance Criteria

- [x] Database schema created
- [ ] All RLS policies active
- [ ] Helper functions deployed
- [ ] Edge functions enforce RBAC
- [ ] Frontend respects permissions
- [ ] Audit logs track all actions
- [ ] Documentation complete

## 🔐 Security Notes

- RLS is enabled but **policies must be created manually**
- Without policies, users can only access data they own
- Admin role should be granted carefully (global scope = full access)
- Expired roles are automatically excluded by helper functions
- All runtime actions are logged to audit_logs

## 🚀 Quick Start for Admins

After running the manual SQL setup:

```sql
-- 1. Grant yourself admin
INSERT INTO public.user_roles (user_id, role, scope)
VALUES (auth.uid(), 'admin', 'global');

-- 2. Grant operator to team member
INSERT INTO public.user_roles (user_id, role, scope)
VALUES ('TEAMMATE_UUID', 'operator', 'global');

-- 3. Grant viewer to stakeholder (30 days)
INSERT INTO public.user_roles (user_id, role, scope, expires_at)
VALUES ('STAKEHOLDER_UUID', 'viewer', 'global', NOW() + INTERVAL '30 days');

-- 4. Verify roles
SELECT u.email, ur.role, ur.scope, ur.expires_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id;
```
