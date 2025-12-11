import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
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
  role: 'admin' | 'operator' | 'viewer' | 'owner';
  scope: string | null;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
};

type Profile = {
  user_id: string;
  email: string;
  full_name: string | null;
};

export default function AccessControl() {
  const { isGlobalAdmin, isLoading: permissionsLoading } = useUserPermissions();
  const queryClient = useQueryClient();
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Form state
  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'operator' | 'viewer'>('viewer');
  const [scope, setScope] = useState<'global' | 'agent'>('global');
  const [agentId, setAgentId] = useState('');

  // Fetch all user roles with user info
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['all-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*, profiles!user_roles_user_id_fkey(user_id, email, full_name)')
        .order('granted_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isGlobalAdmin,
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
    enabled: isGlobalAdmin,
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

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: profile.user_id,
          role,
          scope: scopeValue,
          granted_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      toast.success('Role granted successfully');
      setIsGrantDialogOpen(false);
      setUserEmail('');
      setRole('viewer');
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
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

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

  if (!isGlobalAdmin) {
    return (
      <div className="container mx-auto p-6">
        <DCCard 
          title="Access Denied" 
          subtitle="You need global admin permissions to access this page."
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
        title="Access Control & RBAC"
        subtitle="Manage user roles and permissions across the platform"
        icon={<Shield className="h-5 w-5 text-info" />}
        action={
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
                  Assign a role to a user with optional scope restrictions
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
                  <Select value={role} onValueChange={(v) => setRole(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer (Read-only)</SelectItem>
                      <SelectItem value="operator">Operator (Run agents)</SelectItem>
                      <SelectItem value="admin">Admin (Full control)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scope">Scope</Label>
                  <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global (All agents)</SelectItem>
                      <SelectItem value="agent">Specific Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scope === 'agent' && (
                  <div className="space-y-2">
                    <Label htmlFor="agent">Agent</Label>
                    <Select value={agentId} onValueChange={setAgentId}>
                      <SelectTrigger>
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
        }
      />

      {/* Role Descriptions */}
      <DCCard title="Role Permissions" icon={<Info className="h-4 w-4 text-info" />}>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Badge variant="secondary">Viewer</Badge>
              <p className="text-sm text-muted-foreground">
                • View agents and their status<br />
                • Access logs and metrics<br />
                • Cannot run or modify agents
              </p>
            </div>
            <div className="space-y-2">
              <Badge variant="secondary">Operator</Badge>
              <p className="text-sm text-muted-foreground">
                • All viewer permissions<br />
                • Start/stop/restart agents<br />
                • Run simulations<br />
                • Cannot delete or manage permissions
              </p>
            </div>
            <div className="space-y-2">
              <Badge variant="secondary">Admin</Badge>
              <p className="text-sm text-muted-foreground">
                • All operator permissions<br />
                • Delete agents<br />
                • Manage user roles<br />
                • Full system control
              </p>
            </div>
          </div>
      </DCCard>

      {/* User Roles Table */}
      <DCCard 
        title="Current User Roles" 
        subtitle={`${userRoles?.length || 0} role assignments across the platform`}
      >
          {rolesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
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
                  <TableRow key={userRole.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {userRole.profiles?.full_name || 'Unknown User'}
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
                              {userRole.scope === 'global' || !userRole.scope ? 'Global' : 'Scoped'}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {userRole.scope || 'All agents'}
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
                      <Dialog open={isRevokeDialogOpen && selectedRole?.id === userRole.id} onOpenChange={(open) => {
                        setIsRevokeDialogOpen(open);
                        if (!open) setSelectedRole(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </DCCard>
    </div>
  );
}
