import { useTranslation } from "react-i18next";
/**
 * AdminSignupsDashboard - Real-time dashboard for user registrations & approval status
 * Combines profiles data with onboarding submissions for a unified view
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, Clock, Users, Loader2,
  UserPlus, ShieldCheck, TrendingUp, Activity
} from 'lucide-react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { format, subDays, isAfter } from 'date-fns';

interface ProfileRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_approved: boolean;
  approved_at: string | null;
  created_at: string | null;
  job_title: string | null;
  avatar_initials: string | null;
  avatar_bg_color: string | null;
}

function SignupsDashboardContent() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'all' | 'pending' | 'approved'>('all');

  // Fetch profiles
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-signups-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, is_approved, approved_at, created_at, job_title, avatar_initials, avatar_bg_color')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ProfileRow[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-signups-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-signups-dashboard'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Approve / revoke mutation
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
      queryClient.invalidateQueries({ queryKey: ['admin-signups-dashboard'] });
      toast.success(approve ? 'User approved successfully' : 'User approval revoked');
    },
    onError: () => toast.error('Failed to update approval status'),
  });

  // Computed stats
  const totalUsers = profiles?.length ?? 0;
  const pendingCount = profiles?.filter(p => !p.is_approved).length ?? 0;
  const approvedCount = profiles?.filter(p => p.is_approved).length ?? 0;
  const recentSignups = profiles?.filter(p =>
    p.created_at && isAfter(new Date(p.created_at), subDays(new Date(), 7))
  ).length ?? 0;

  const filtered = profiles?.filter(p => {
    if (tab === 'pending') return !p.is_approved;
    if (tab === 'approved') return p.is_approved;
    return true;
  }) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">{t("adminSignups.title")}</h1>
            <p className="text-sm text-muted-foreground">
              Real-time user registrations and approval status
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t('adminSignups.totalUsers')}</span>
          </div>
          <div className="text-2xl font-bold">{totalUsers}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">{t('adminSignups.pendingApproval')}</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">{t('adminSignups.approved')}</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Last 7 Days</span>
          </div>
          <div className="text-2xl font-bold">{recentSignups}</div>
        </Card>
      </div>

      {/* Tabs + Table */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="flex w-full flex-wrap h-auto justify-start">
          <TabsTrigger value="all" className="gap-1">
            <Users className="h-3.5 w-3.5" /> All ({totalUsers})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1">
            <Clock className="h-3.5 w-3.5" /> Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Approved ({approvedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No {tab === 'all' ? '' : tab} users found</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Signed Up</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((profile) => (
                      <TableRow key={profile.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ backgroundColor: profile.avatar_bg_color || 'hsl(var(--primary))' }}
                            >
                              {profile.avatar_initials || '?'}
                            </div>
                            <span className="font-medium truncate max-w-[160px]">
                              {profile.full_name || 'No name'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">
                          {profile.email || '—'}
                        </TableCell>
                        <TableCell>
                          {profile.job_title ? (
                            <Badge variant="outline" className="text-xs">{profile.job_title}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {profile.created_at
                            ? format(new Date(profile.created_at), 'MMM d, yyyy HH:mm')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {profile.is_approved ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="h-3 w-3" /> Approved
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <Clock className="h-3 w-3" /> Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {profile.is_approved ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => approveMutation.mutate({ userId: profile.user_id, approve: false })}
                              disabled={approveMutation.isPending}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Revoke
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate({ userId: profile.user_id, approve: true })}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminSignupsDashboard() {
  const { t } = useTranslation();
  return (
    <ProtectedRoute allowedRoles={['executive', 'manager', 'admin' as any]}>
      <SignupsDashboardContent />
    </ProtectedRoute>
  );
}
