import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRBAC } from '@/contexts/RBACContext';
import { GLOBAL_ROLE_PERMISSIONS, type AnyRole, type Permission } from '@/auth/permissions';
import { DCCard, DCSectionHeader } from '@/components/dc-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Shield, UserPlus, Trash2, Info, AlertTriangle } from 'lucide-react';

type UserRole = {
  id: string;
  user_id: string;
  role: AnyRole;
  scope: string | null;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
};

type Profile = {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_initials: string | null;
};

export function profileDisplayName(profile: Profile | null | undefined): string {
  const fullName = profile?.full_name?.trim();
  if (fullName) return fullName;

  const email = profile?.email?.trim();
  if (email) return email.split('@')[0];

  const initials = profile?.avatar_initials?.trim();
  return initials || 'Profile unavailable';
}

/*
 * The grant dropdown previously offered only admin/operator/viewer while the
 * invite flow could assign nine further platform personas. The two surfaces now
 * offer the same set, so a persona granted by invitation can also be granted,
 * inspected and corrected here. `owner` and `security_admin` are deliberately
 * excluded: they are provisioned out of band, not from this screen.
 */
type GrantableRole = Extract<
  AnyRole,
  | 'viewer' | 'operator' | 'admin'
  | 'executive' | 'manager' | 'engineer' | 'compliance'
  | 'data_analyst' | 'marketing' | 'sales' | 'support' | 'finance'
>;

const PLATFORM_GRANTABLE_ROLES: ReadonlyArray<{ value: GrantableRole; label: string }> = [
  { value: 'admin', label: 'Admin (Full control)' },
  { value: 'executive', label: 'Executive (Read-only oversight)' },
  { value: 'manager', label: 'Manager (Operate and view members)' },
  { value: 'engineer', label: 'Engineer / DevOps (Operate)' },
  { value: 'compliance', label: 'Compliance (Read-only and audit)' },
  { value: 'data_analyst', label: 'Data analyst (Read-only and export)' },
  { value: 'finance', label: 'Finance (Read-only and export)' },
  { value: 'marketing', label: 'Marketing (Read-only)' },
  { value: 'sales', label: 'Sales (Read-only)' },
  { value: 'support', label: 'Support (Read-only)' },
];

const AGENT_GRANTABLE_ROLES: ReadonlyArray<{ value: GrantableRole; label: string }> = [
  { value: 'viewer', label: 'Viewer (Read-only)' },
  { value: 'operator', label: 'Operator (Run agent)' },
  { value: 'admin', label: 'Admin (Manage agent)' },
];

const PERMISSION_LABELS: Partial<Record<Permission, string>> = {
  'platform.view_admin_console': 'admin console',
  'authz.view_assignments': 'view role grants',
  'authz.manage_assignments': 'manage role grants',
  'tenant.view_members': 'view organization members',
  'twin.view': 'view twins',
  'twin.edit': 'edit twins',
  'twin.delete': 'delete twins',
  'agent.view': 'view agents',
  'agent.operate': 'operate agents',
  'agent.administer': 'administer agents',
  'deployment.view': 'view deployments',
  'deployment.execute': 'execute deployments',
  'analytics.view': 'view analytics',
  'analytics.export': 'export analytics',
};

function platformRoleSummary(role: GrantableRole): string {
  const permissions = GLOBAL_ROLE_PERMISSIONS[role];
  if (permissions.length === 0) return 'Shell admission only; no platform product permissions';
  return permissions
    .map((permission) => PERMISSION_LABELS[permission])
    .filter((label): label is string => Boolean(label))
    .join(' · ');
}

export default function AccessControl() {
  /*
   * Nav visibility and page authority are now the same question asked twice at
   * the right granularity. `authz.view_assignments` (held by `compliance`)
   * admits a read-only roster view - the nav link previously led to a hard
   * "Access Denied". `authz.manage_assignments` remains required for every
   * grant and revoke.
   */
  const { can, resolution } = useRBAC();
  const permissionsLoading = resolution.status === 'loading';
  const canViewAssignments = can('authz.view_assignments');
  const canManageAssignments = can('authz.manage_assignments');
  const queryClient = useQueryClient();
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Form state
  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState<GrantableRole>('admin');
  const [scope, setScope] = useState<'global' | 'agent'>('global');
  const [agentId, setAgentId] = useState('');

  // Fetch all user roles with user info
  // Stage 6G: the previous implementation used a PostgREST embed
  // (`profiles!user_roles_user_id_fkey`). No such foreign key exists between
  // public.user_roles and public.profiles, so PostgREST rejected the request
  // with HTTP 400 ("could not find a relationship"). The roster is now built
  // from two explicit reads and joined in the client; a genuine failure is
  // surfaced as an error state instead of an empty roster.
  const { data: userRoles, isLoading: rolesLoading, isError: rolesError, refetch: refetchRoles } = useQuery({
    queryKey: ['all-user-roles'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('granted_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((roles ?? []).map((r) => r.user_id))];
      if (userIds.length === 0) return [];

      const { data: profileRows, error: profilesErr } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, avatar_initials')
        .in('user_id', userIds);
      if (profilesErr) throw profilesErr;

      const byUser = new Map((profileRows ?? []).map((p) => [p.user_id, p]));
      return (roles ?? []).map((r) => ({ ...r, profiles: byUser.get(r.user_id) ?? null }));
    },
    enabled: canViewAssignments,
  });

  // Fetch agents for scope selection
  const { data: agents } = useQuery({
    queryKey: ['agents-for-rbac'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: canViewAssignments,
  });

  // Grant role mutation
  const grantRoleMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user ID from email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', userEmail)
        .single();

      if (profileError || !profile) {
        throw new Error('User not found with that email');
      }

      const scopeValue = scope === 'global' ? 'global' : `agent:${agentId}`;

      // Privileged write: audited server-side RPC, never a direct table write.
      const { error } = await supabase.rpc('admin_grant_role', {
        _target_user_id: profile.user_id,
        _role: role,
        _scope: scopeValue,
        _reason: 'granted from Access Control',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      toast.success('Role granted successfully');
      setIsGrantDialogOpen(false);
      setUserEmail('');
      setRole('admin');
      setScope('global');
      setAgentId('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to grant role: ${error.message}`);
    },
  });

  // Revoke role mutation
  const revokeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.rpc('admin_revoke_role_grant', {
        _role_id: roleId,
        _reason: 'revoked from Access Control',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      toast.success('Role revoked successfully');
      setIsRevokeDialogOpen(false);
      setSelectedRole(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke role: ${error.message}`);
    },
  });

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canViewAssignments) {
    return (
      <div className="container mx-auto p-6">
        <DCCard 
          title="Access Denied" 
          subtitle="You need role-assignment visibility to access this page."
          icon={<Shield className="h-5 w-5 text-info" />}
        >
          <div />
        </DCCard>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <DCSectionHeader
        as="h1"
        title="Access control"
        subtitle="Manage audited platform and agent-scoped role grants. Organization membership is managed separately under People and Access."
        icon={<Shield className="h-5 w-5 text-info" />}
        action={!canManageAssignments ? (
          <Badge variant="outline">Read-only</Badge>
        ) : (
          <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Grant Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Grant User Role</DialogTitle>
                <DialogDescription>
                  Assign an audited platform-wide or agent-scoped role grant. This does not change organization membership.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">User Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as GrantableRole)}>
                    <SelectTrigger id="role" aria-label="Role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(scope === 'global' ? PLATFORM_GRANTABLE_ROLES : AGENT_GRANTABLE_ROLES).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scope">Scope</Label>
                  <Select
                    value={scope}
                    onValueChange={(value) => {
                      const nextScope = value as 'global' | 'agent';
                      setScope(nextScope);
                      const nextOptions = nextScope === 'global' ? PLATFORM_GRANTABLE_ROLES : AGENT_GRANTABLE_ROLES;
                      if (!nextOptions.some((option) => option.value === role)) {
                        setRole(nextOptions[0].value);
                      }
                    }}
                  >
                    <SelectTrigger id="scope" aria-label="Scope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Platform-wide</SelectItem>
                      <SelectItem value="agent">Specific agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scope === 'agent' && (
                  <div className="space-y-2">
                    <Label htmlFor="agent">Agent</Label>
                    <Select value={agentId} onValueChange={setAgentId}>
                      <SelectTrigger id="agent" aria-label="Agent">
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents?.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGrantDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => grantRoleMutation.mutate()}
                  disabled={!userEmail || (scope === 'agent' && !agentId) || grantRoleMutation.isPending}
                >
                  {grantRoleMutation.isPending ? 'Granting...' : 'Grant Role'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      {/* The guide is derived from the same platform permission authority as the shell. */}
      <DCCard title="Platform role permissions" icon={<Info className="h-4 w-4 text-info" />}>
        <div className="grid gap-2 md:grid-cols-2">
          {PLATFORM_GRANTABLE_ROLES.map((option) => (
            <div key={option.value} className="rounded-md border border-border p-3">
              <Badge variant="secondary">{option.label}</Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                {platformRoleSummary(option.value)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Agent-scoped Viewer, Operator, and Admin grants are evaluated only for the selected agent.
        </p>
      </DCCard>

      {/* User Roles Table */}
      <DCCard 
        title="Current User Roles" 
        subtitle={`${userRoles?.length || 0} audited platform or agent-scoped assignments`}
      >
          {rolesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : rolesError ? (
            <div role="alert" className="space-y-3 py-6 text-sm">
              <p className="font-medium text-destructive">Role assignments unavailable</p>
              <p className="text-muted-foreground">
                The role roster could not be read. This is not an empty roster - the
                request failed and no assignments can be shown.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchRoles()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Granted</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRoles?.map((userRole: any) => (
                  // `id` is the natural key, but a row that arrives without one
                  // (partial projection, older API shape) must still render a
                  // stable, unique key rather than `undefined` for every row.
                  <TableRow key={userRole.id ?? `${userRole.user_id}:${userRole.role}:${userRole.scope ?? 'global'}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {profileDisplayName(userRole.profiles)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {userRole.profiles?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        userRole.role === 'admin' ? 'default' :
                        userRole.role === 'operator' ? 'secondary' :
                        'outline'
                      }>
                        {userRole.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline">
                              {userRole.scope === 'global' || !userRole.scope ? 'Platform-wide' : 'Agent-scoped'}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {userRole.scope === 'global' || !userRole.scope ? 'Applies across the platform according to the role permission registry' : userRole.scope}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(userRole.granted_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {userRole.expires_at ? new Date(userRole.expires_at).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageAssignments && userRole.role === 'owner' ? (
                      <span className="text-xs text-muted-foreground">Owner protected</span>
                      ) : canManageAssignments && (
                      <Dialog open={isRevokeDialogOpen && selectedRole?.id === userRole.id} onOpenChange={(open) => {
                        setIsRevokeDialogOpen(open);
                        if (!open) setSelectedRole(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            aria-label={`Revoke ${userRole.role} role from ${userRole.profiles?.email ?? 'user'}`}
                            onClick={() => setSelectedRole(userRole)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              Revoke Role
                            </DialogTitle>
                            <DialogDescription>
                              Are you sure you want to revoke the <Badge variant="outline">{userRole.role}</Badge> role from <strong>{userRole.profiles?.email}</strong>?
                              This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => {
                              setIsRevokeDialogOpen(false);
                              setSelectedRole(null);
                            }}>
                              Cancel
                            </Button>
                            <Button 
                              variant="destructive"
                              onClick={() => revokeRoleMutation.mutate(userRole.id)}
                              disabled={revokeRoleMutation.isPending}
                            >
                              {revokeRoleMutation.isPending ? 'Revoking...' : 'Revoke Role'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
      </DCCard>
    </div>
  );
}
