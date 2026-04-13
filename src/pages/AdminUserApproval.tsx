import { useTranslation } from "react-i18next";
/**
 * AdminUserApproval - Admin page to approve/reject new user signups
 * Accessible only to users with 'admin' role
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Users, Loader2 } from 'lucide-react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

interface ProfileRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_approved: boolean;
  approved_at: string | null;
  created_at: string | null;
}

function UserApprovalContent() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-user-approvals', filter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('user_id, email, full_name, is_approved, approved_at, created_at')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('is_approved', false);
      } else if (filter === 'approved') {
        query = query.eq('is_approved', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, approve }: { userId: string; approve: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          is_approved: approve,
          approved_at: approve ? new Date().toISOString() : null,
          approved_by: approve ? user?.id : null,
        })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-approvals'] });
      toast.success(approve ? 'User approved' : 'User approval revoked');
    },
    onError: (error) => {
      console.error('Approval error:', error);
      toast.error('Failed to update user approval');
    },
  });

  const pendingCount = profiles?.filter(p => !p.is_approved).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">User Approvals</h1>
          <p className="text-muted-foreground">
            Manage access for new user signups
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'all'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f === 'pending' && <Clock className="h-4 w-4 mr-1" />}
            {f === 'approved' && <CheckCircle className="h-4 w-4 mr-1" />}
            {f === 'all' && <Users className="h-4 w-4 mr-1" />}
            {f}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !profiles?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No {filter === 'all' ? '' : filter} users found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <Card key={profile.user_id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {profile.full_name || 'No name'}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {profile.email || 'No email'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Signed up: {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {profile.is_approved ? (
                  <>
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Approved
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => approveMutation.mutate({ userId: profile.user_id, approve: false })}
                      disabled={approveMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate({ userId: profile.user_id, approve: true })}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminUserApproval() {
  return (
    <ProtectedRoute allowedRoles={['executive', 'manager', 'admin' as any]}>
      <UserApprovalContent />
    </ProtectedRoute>
  );
}
