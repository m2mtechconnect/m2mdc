import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, RefreshCw, Shield, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useRBAC } from '@/contexts/RBACContext';
import { ORGANIZATION_ROLE_PERMISSIONS, type OrganizationRole } from '@/auth/organizationAuthorization';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CommandHeader, OperationalTable, Panel, StateView } from '@/components/v2';

interface TenantMember {
  userId: string;
  name: string;
  email: string | null;
  role: OrganizationRole;
  status: string;
  joinedAt: string;
  avatarUrl: string | null;
  avatarBgColor: string | null;
  avatarInitials: string | null;
}

interface TenantInvite {
  id: string;
  email: string;
  role: OrganizationRole;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface TenantPeopleSnapshot {
  organization: { id: string; name: string };
  members: TenantMember[];
  invites: TenantInvite[];
}

const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  operator: 'Operator',
  engineer: 'Engineer',
  manager: 'Manager',
  executive: 'Executive',
  security_admin: 'Security Admin',
  compliance: 'Compliance',
  data_analyst: 'Data Analyst',
  support: 'Support',
  viewer: 'Viewer',
};

const INVITABLE_ROLES: OrganizationRole[] = [
  'admin',
  'security_admin',
  'manager',
  'engineer',
  'operator',
  'executive',
  'compliance',
  'data_analyst',
  'support',
  'viewer',
];

function roleSummary(role: OrganizationRole): string {
  if (role === 'owner') return 'Organization ownership and tenant administration';
  const permissions = ORGANIZATION_ROLE_PERMISSIONS[role];
  const capabilities: string[] = [];
  if (permissions.includes('tenant.manage_members')) capabilities.push('manage members');
  else if (permissions.includes('tenant.view_members')) capabilities.push('view members');
  if (permissions.includes('twin.edit')) capabilities.push('edit twins');
  else if (permissions.includes('twin.view')) capabilities.push('view twins');
  if (permissions.includes('deployment.execute')) capabilities.push('execute operations');
  if (permissions.includes('analytics.export')) capabilities.push('export analytics');
  return capabilities.length > 0 ? capabilities.join(' · ') : 'Scoped organization access';
}

function inviteState(invite: TenantInvite) {
  const expired = new Date(invite.expiresAt).getTime() <= Date.now();
  return expired ? 'Expired' : 'Pending';
}

export default function TenantPeopleAccess() {
  const { can, organizationRole, activeOrganization } = useRBAC();
  const canManage = can('tenant.manage_members');
  const [snapshot, setSnapshot] = useState<TenantPeopleSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('viewer');
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [editing, setEditing] = useState<TenantMember | null>(null);
  const [editingRole, setEditingRole] = useState<OrganizationRole>('viewer');
  const [savingRole, setSavingRole] = useState(false);
  const [removing, setRemoving] = useState<TenantMember | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

  const tenantDb = supabase as unknown as {
    rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
  };

  const availableRoles = useMemo(() => {
    if (organizationRole === 'owner') return INVITABLE_ROLES;
    return INVITABLE_ROLES.filter((role) => role !== 'admin' && role !== 'security_admin');
  }, [organizationRole]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: snapshotError } = await tenantDb.rpc('tenant_people_access_snapshot');
      if (snapshotError) throw new Error(snapshotError.message || 'Failed to load organization members');
      const next = data as TenantPeopleSnapshot | null;
      if (!next?.organization || !Array.isArray(next.members) || !Array.isArray(next.invites)) {
        throw new Error('Organization member snapshot was incomplete');
      }
      setSnapshot(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load organization members');
    } finally {
      setLoading(false);
    }
  }, [tenantDb]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) return;
    setSubmittingInvite(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('teams-invite', {
        body: { email: inviteEmail.trim().toLowerCase(), role: inviteRole },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(String(data.error));

      const deliveryStatus = String(data?.delivery?.status ?? 'disabled');
      if (deliveryStatus === 'sent') {
        toast.success(`Invitation sent to ${inviteEmail.trim().toLowerCase()}`);
      } else {
        toast.warning(`Invitation created, but email delivery is ${deliveryStatus.replace(/_/g, ' ')}.`);
      }

      setInviteEmail('');
      setInviteRole('viewer');
      setInviteOpen(false);
      await refresh();
    } catch (inviteError) {
      toast.error(inviteError instanceof Error ? inviteError.message : 'Failed to create invitation');
    } finally {
      setSubmittingInvite(false);
    }
  };

  const beginEdit = (member: TenantMember) => {
    setEditing(member);
    setEditingRole(member.role === 'owner' ? 'viewer' : member.role);
  };

  const saveRole = async () => {
    if (!editing || !canManage) return;
    setSavingRole(true);
    try {
      const { error: roleError } = await tenantDb.rpc('set_active_org_member_role', {
        _user_id: editing.userId,
        _role: editingRole,
      });
      if (roleError) throw new Error(roleError.message || 'Failed to update member role');
      toast.success('Organization role updated');
      setEditing(null);
      await refresh();
    } catch (roleError) {
      toast.error(roleError instanceof Error ? roleError.message : 'Failed to update member role');
    } finally {
      setSavingRole(false);
    }
  };

  const removeMember = async () => {
    if (!removing || !canManage) return;
    setRemovingMember(true);
    try {
      const { error: removeError } = await tenantDb.rpc('remove_active_org_member', {
        _user_id: removing.userId,
      });
      if (removeError) throw new Error(removeError.message || 'Failed to remove member');
      toast.success('Organization access removed');
      setRemoving(null);
      await refresh();
    } catch (removeError) {
      toast.error(removeError instanceof Error ? removeError.message : 'Failed to remove member');
    } finally {
      setRemovingMember(false);
    }
  };

  const members = snapshot?.members ?? [];
  const invites = snapshot?.invites ?? [];
  const pendingInvites = invites.filter((invite) => inviteState(invite) === 'Pending').length;

  return (
    <div className="v2-canvas min-h-full p-4 sm:p-6">
      <div className="mx-auto w-full max-w-screen-2xl space-y-5">
        <CommandHeader
          eyebrow="Organization Governance"
          title="People & Access"
          subtitle={`Manage organization-scoped membership for ${snapshot?.organization.name ?? activeOrganization?.orgName ?? 'the active organization'}. Platform administration is separate.`}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                Refresh
              </Button>
              {canManage && (
                <Button onClick={() => setInviteOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Invite member
                </Button>
              )}
            </div>
          )}
        />

        <Panel className="flex flex-wrap items-center gap-6">
          <div>
            <div className="v2-label">Organization</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
              <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {snapshot?.organization.name ?? activeOrganization?.orgName ?? 'Active organization'}
            </div>
          </div>
          <div>
            <div className="v2-label">Active members</div>
            <div className="v2-metric-secondary">{members.length}</div>
          </div>
          <div>
            <div className="v2-label">Pending invites</div>
            <div className="v2-metric-secondary">{pendingInvites}</div>
          </div>
          <div>
            <div className="v2-label">Your tenant role</div>
            <div className="mt-1 text-sm font-medium text-foreground">
              {organizationRole ? ROLE_LABELS[organizationRole] : 'Platform context'}
            </div>
          </div>
        </Panel>

        {loading ? (
          <StateView kind="loading" title="Loading members" description="Reading the active organization membership boundary." />
        ) : error ? (
          <StateView
            kind="error"
            title="People & Access unavailable"
            description={error}
            action={<Button variant="outline" onClick={() => void refresh()}>Retry</Button>}
          />
        ) : (
          <>
            <OperationalTable aria-label="Organization members">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Access summary</th>
                  <th>Joined</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.userId}>
                    <td>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{member.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{member.email ?? 'Email unavailable'}</div>
                      </div>
                    </td>
                    <td><Badge variant={member.role === 'owner' ? 'default' : 'outline'}>{ROLE_LABELS[member.role]}</Badge></td>
                    <td className="text-sm text-muted-foreground">{roleSummary(member.role)}</td>
                    <td className="text-sm text-muted-foreground">{new Date(member.joinedAt).toLocaleDateString()}</td>
                    {canManage && (
                      <td>
                        {member.role === 'owner' ? (
                          <span className="text-xs text-muted-foreground">Owner protected</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => beginEdit(member)}>Edit role</Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRemoving(member)}>Remove</Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </OperationalTable>

            <Panel>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="v2-label">Invitations</div>
                  <p className="text-sm text-muted-foreground">Pending organization invitations. Expired links are reported as expired rather than active.</p>
                </div>
                <Badge variant="outline">{invites.length} open records</Badge>
              </div>
              {invites.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  No pending invitation records.
                </div>
              ) : (
                <div className="space-y-2">
                  {invites.map((invite) => {
                    const state = inviteState(invite);
                    return (
                      <div key={invite.id} className="v2-subpanel flex flex-wrap items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{invite.email}</div>
                          <div className="text-xs text-muted-foreground">{ROLE_LABELS[invite.role]} · expires {new Date(invite.expiresAt).toLocaleString()}</div>
                        </div>
                        <Badge variant={state === 'Expired' ? 'secondary' : 'outline'}>{state}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </>
        )}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <form onSubmit={handleInvite}>
            <DialogHeader>
              <DialogTitle>Invite organization member</DialogTitle>
              <DialogDescription>
                The invitation grants only organization-scoped access. It never creates platform administration authority.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tenant-invite-email">Email address</Label>
                <Input
                  id="tenant-invite-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="member@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenant-invite-role">Organization role</Label>
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as OrganizationRole)}>
                  <SelectTrigger id="tenant-invite-role" aria-label="Organization role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        <div>
                          <div>{ROLE_LABELS[role]}</div>
                          <div className="text-xs text-muted-foreground">{roleSummary(role)}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)} disabled={submittingInvite}>Cancel</Button>
              <Button type="submit" disabled={submittingInvite || !inviteEmail.trim()}>
                {submittingInvite ? 'Creating invitation…' : 'Create invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit organization role</DialogTitle>
            <DialogDescription>{editing ? `Change ${editing.name}'s tenant-scoped role.` : 'Change tenant role.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="tenant-member-role">Role</Label>
            <Select value={editingRole} onValueChange={(value) => setEditingRole(value as OrganizationRole)}>
              <SelectTrigger id="tenant-member-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    <div>
                      <div>{ROLE_LABELS[role]}</div>
                      <div className="text-xs text-muted-foreground">{roleSummary(role)}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={savingRole}>Cancel</Button>
            <Button onClick={() => void saveRole()} disabled={savingRole}>{savingRole ? 'Saving…' : 'Save role'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove organization access?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing ? `${removing.name} will be suspended from the active organization. Their platform identity is not modified.` : 'This membership will be suspended.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingMember}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void removeMember()} disabled={removingMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removingMember ? 'Removing…' : 'Remove access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
