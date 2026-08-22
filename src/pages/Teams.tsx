import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  Wrench,
  Clock,
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Headphones,
  DollarSign,
  Filter,
  Search,
  Building2,
  HelpCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MemberProfileModal from "@/components/teams/MemberProfileModal";
import InviteTeamMemberModal from "@/components/teams/InviteTeamMemberModal";
import RoleBreakdownSection from "@/components/teams/RoleBreakdownSection";
import ActivityFeed from "@/components/teams/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast as sonnerToast } from "sonner";
import { useUserPermissions } from "@/hooks/useUserPermissions";

const roleIcons: Record<string, any> = {
  executive: Crown,
  manager: Users,
  engineer: Wrench,
  compliance: Shield,
  data_analyst: BarChart3,
  marketing: TrendingUp,
  sales: ShoppingCart,
  support: Headphones,
  finance: DollarSign,
};

const roleColors: Record<string, string> = {
  executive: "text-primary border-primary",
  manager: "text-secondary border-secondary",
  engineer: "text-muted-foreground border-muted-foreground",
  compliance: "text-green-600 border-green-600",
  data_analyst: "text-blue-600 border-blue-600",
  marketing: "text-info border-info",
  sales: "text-orange-600 border-orange-600",
  support: "text-cyan-600 border-cyan-600",
  finance: "text-emerald-600 border-emerald-600",
};

export default function Teams() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("members");
  const [approvalFilter, setApprovalFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const { hasRole } = useUserPermissions();
  const isAdmin = hasRole('admin');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.warn('Teams: Authentication check failed:', error?.message || 'No session');
        navigate('/auth', { replace: true });
        return;
      }
      
      setIsAuthenticated(true);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth', { replace: true });
      } else {
        setIsAuthenticated(!!session);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch team members with their roles (optimized with parallel queries)
  const { data: teamMembers, isLoading: loadingMembers } = useQuery({
    queryKey: ["team-members"],
    enabled: isAuthenticated,
    queryFn: async () => {
      // Run all queries in parallel for better performance
      const [profilesResult, rolesResult, agentsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, email, created_at, avatar_url, avatar_bg_color, avatar_initials, is_approved")
          .not("user_id", "is", null),
        supabase
          .from("user_roles")
          .select("user_id, role"),
        supabase
          .from("agents")
          .select("owner_id, status")
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (rolesResult.error) throw rolesResult.error;
      if (agentsResult.error) throw agentsResult.error;

      const profiles = profilesResult.data || [];
      const roles = rolesResult.data || [];
      const agents = agentsResult.data || [];

      return profiles.map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        const userSystems = agents?.filter(
          (a) => a.owner_id === profile.user_id && a.status === "active"
        ).length || 0;

        return {
          name: profile.full_name || profile.email?.split("@")[0] || "Unknown",
          role: userRole?.role || "engineer",
          email: profile.email || "",
          // Approval is stored evidence. Presence/activity is not tracked and
          // must not be inferred from membership.
          status: profile.is_approved ? "approved" : "pending",
          lastActive: "Not tracked",
          systems: userSystems,
          userId: profile.user_id,
          joinedDate: new Date(profile.created_at).toLocaleDateString(),
          department: "Not tracked",
          avatarUrl: profile.avatar_url,
          avatarBgColor: profile.avatar_bg_color,
          avatarInitials: profile.avatar_initials,
        };
      });
    },
  });

  // Fetch team invites. The acceptance token is deliberately not exposed over
  // the Data API, so columns are listed explicitly rather than selecting "*".
  const { data: invites, isLoading: loadingInvites } = useQuery({
    queryKey: ["team-invites"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("id, email, role, status, invited_by, expires_at, created_at")
        .order("created_at", { ascending: false });

      // Gracefully handle if table doesn't exist or has permission issues
      if (error) {
        console.warn('Failed to load team invites:', error.message);
        return [];
      }
      return data || [];
    },
  });

  // Fetch recent team activity (optimized to fetch profiles in parallel)
  const { data: activityLog, isLoading: loadingActivity } = useQuery({
    queryKey: ["team-activity"],
    enabled: isAuthenticated,
    queryFn: async () => {
      // Fetch logs and profiles in parallel
      const [logsResult, profilesResult] = await Promise.all([
        supabase
          .from("audit_logs")
          .select("user_id, action, details, created_at, entity_type")
          .or("action.like.%team%,action.like.%role%,action.like.%deploy%,action.like.%created%")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("profiles")
          .select("user_id, full_name, email")
      ]);

      if (logsResult.error) {
        console.warn('Failed to load activity logs:', logsResult.error.message);
        return [];
      }

      const logs = logsResult.data || [];
      const profiles = profilesResult.data || [];

      return logs.map((log) => {
        const profile = profiles.find((p) => p.user_id === log.user_id);
        const userName = profile?.full_name || profile?.email?.split("@")[0] || "Unknown User";

        const actionText = log.action
          .replace(/_/g, " ")
          .replace(/team invite sent/i, "invited")
          .replace(/team member added/i, "added")
          .replace(/role assigned/i, "updated role for")
          .replace(/deployed/i, "deployed");

        const details = log.details as Record<string, any> | null;
        const target = details?.invited_email || 
                      details?.member_name || 
                      details?.system_name ||
                      log.entity_type ||
                      "system";

        const timeDiff = new Date().getTime() - new Date(log.created_at).getTime();
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const timeText = hours < 1 ? "Less than an hour ago" : 
                        hours === 1 ? "1 hour ago" : 
                        `${hours} hours ago`;

        return {
          user: userName,
          action: actionText,
          target: target,
          time: timeText,
        };
      });
    },
  });

  // User approvals query (admin only)
  const { data: pendingUsers, isLoading: loadingApprovals } = useQuery({
    queryKey: ['admin-user-approvals', approvalFilter],
    enabled: isAuthenticated && isAdmin,
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('user_id, email, full_name, is_approved, approved_at, created_at')
        .order('created_at', { ascending: false });
      if (approvalFilter === 'pending') query = query.eq('is_approved', false);
      else if (approvalFilter === 'approved') query = query.eq('is_approved', true);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Track recommended role per user
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  // Load existing roles for users
  const { data: existingRoles } = useQuery({
    queryKey: ['all-user-roles'],
    enabled: isAuthenticated && isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('user_id, role');
      return data || [];
    },
  });

  // Sync existing roles into selectedRoles
  useEffect(() => {
    if (existingRoles?.length) {
      setSelectedRoles(prev => {
        const merged = { ...prev };
        existingRoles.forEach((r: any) => {
          if (!merged[r.user_id]) merged[r.user_id] = r.role;
        });
        return merged;
      });
    }
  }, [existingRoles]);

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

      // Assign role when approving
      if (approve) {
        const role = (selectedRoles[userId] || 'engineer') as AppRole;
        // Privileged write: audited server-side RPC, never a direct table write.
        const { error: roleError } = await supabase.rpc('admin_set_user_role', {
          _target_user_id: userId,
          _role: role,
          _reason: 'approval role assignment',
        });
        if (roleError) throw roleError;
      }
    },
    onSuccess: (_, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      sonnerToast.success(approve ? 'User approved & role assigned' : 'User approval revoked');
    },
    onError: () => sonnerToast.error('Failed to update user approval'),
  });

  // Edit role mutation
  const editRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase.rpc('admin_set_user_role', {
        _target_user_id: userId,
        _role: newRole as AppRole,
        _reason: 'role edited from Teams',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      setProfileModalOpen(false);
      sonnerToast.success('Role updated successfully');
    },
    onError: () => sonnerToast.error('Failed to update role'),
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Remove roles via the audited server-side RPC.
      const { error: rolesError } = await supabase.rpc('admin_clear_user_roles', {
        _target_user_id: userId,
        _reason: 'member removed from Teams',
      });
      if (rolesError) throw rolesError;
      // Revoke approval
      await supabase.from('profiles').update({ is_approved: false, approved_at: null, approved_by: null }).eq('user_id', userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-approvals'] });
      setProfileModalOpen(false);
      sonnerToast.success('Member removed and access revoked');
    },
    onError: () => sonnerToast.error('Failed to remove member'),
  });
  const pendingApprovalCount = pendingUsers?.filter(p => !p.is_approved).length ?? 0;

  const memberCount = teamMembers?.length || 0;
  const pendingInvitesCount = invites?.filter((i) => i.status === "pending").length || 0;
  const totalSystems = teamMembers?.reduce((sum, m) => sum + m.systems, 0) || 0;

  // Calculate role breakdown
  const roleBreakdown = teamMembers?.reduce((acc, member) => {
    const role = member.role;
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const rolesCount = Object.keys(roleBreakdown).length;

  // Filtered members
  const filteredMembers = useMemo(() => {
    if (!teamMembers) return [];
    
    return teamMembers.filter((member) => {
      const matchesSearch = 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const matchesStatus = statusFilter === "all" || member.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [teamMembers, searchQuery, roleFilter, statusFilter]);

  const handleInviteSent = () => {
    queryClient.invalidateQueries({ queryKey: ["team-invites"] });
  };

  const handleMemberClick = (member: any) => {
    setSelectedMember(member);
    setProfileModalOpen(true);
  };

  const handleRoleClick = (role: string) => {
    setRoleFilter(role);
  };

  // Show loading only if members are loading (main content)
  const isInitialLoading = loadingMembers;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 min-w-0">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight mb-2">
                {t('teams.title')}
              </h1>
              <p className="text-muted-foreground text-base">
                {t('teams.subtitle')}
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  className="gap-2 font-semibold"
                  onClick={() => setInviteModalOpen(true)}
                >
                  <UserPlus className="h-4 w-4" aria-hidden />
                  {t('teams.inviteMember')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('teams.addMembers')}</TooltipContent>
            </Tooltip>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="members" className="gap-2">
                <Users className="h-4 w-4" aria-hidden />
                {t('teams.teamMembers')}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="approvals" className="gap-2">
                  <Shield className="h-4 w-4" aria-hidden />
                  {t('teams.userApprovals')}
                  {pendingApprovalCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                      {pendingApprovalCount}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="members" className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: t('teams.totalMembers'), value: memberCount, icon: Users },
                  { label: t('teams.activeNow'), value: 'Not tracked', icon: HelpCircle },
                  { label: t('teams.systems'), value: totalSystems, icon: Wrench },
                  { label: t('teams.pending'), value: pendingInvitesCount, icon: Clock, warning: pendingInvitesCount > 0 },
                  { label: t('teams.roles'), value: rolesCount, icon: Shield },
                  { label: t('teams.departments'), value: 'Not tracked', icon: Building2 },
                ].map((stat) => (
                  <Card key={stat.label} className={stat.warning ? "border-l-4 border-l-warning" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{stat.label}</span>
                        <stat.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                      </div>
                      <div className={typeof stat.value === 'number' ? 'text-2xl font-bold' : 'text-sm font-medium text-muted-foreground'}>
                        {stat.value}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Team Members Table */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
                          <CardTitle className="text-lg">Team Members</CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-sm shrink-0">
                          {isInitialLoading ? "..." : `${filteredMembers.length} of ${memberCount}`}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Filters */}
                      <div className="flex flex-wrap gap-3 mb-6">
                        <div className="flex-1 min-w-[200px]">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                            <Input
                              placeholder="Search members..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[180px]" aria-label="Filter by role">
                          <Filter className="h-4 w-4 mr-2" aria-hidden />
                          <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="engineer">Engineer</SelectItem>
                          <SelectItem value="compliance">Compliance</SelectItem>
                          <SelectItem value="data_analyst">Data Analyst</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px]" aria-label="Filter by approval status">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                      {/* Members List */}
                      <div className="space-y-3">
                        {isInitialLoading ? (
                          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                        ) : filteredMembers.length > 0 ? (
                          filteredMembers.map((member) => {
                          const RoleIcon = roleIcons[member.role] || Wrench;
                          return (
                            <Tooltip key={member.email}>
                              <TooltipTrigger asChild>
                                <div
                                  className="p-4 rounded-lg border border-border hover:border-secondary/50 transition-smooth cursor-pointer"
                                  onClick={() => handleMemberClick(member)}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
                                     <div className="flex items-center gap-3 min-w-0">
                                      <UserAvatar
                                        profileImageUrl={member.avatarUrl}
                                        initials={member.avatarInitials}
                                        bgColor={member.avatarBgColor}
                                        size="md"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h3 className="font-semibold text-sm">{member.name}</h3>
                                          <Badge
                                            variant="outline"
                                            className={`text-xs capitalize ${
                                              roleColors[member.role] || "text-muted-foreground"
                                            }`}
                                          >
                                            <RoleIcon className="h-3 w-3 mr-1" aria-hidden />
                                            {member.role.replace(/_/g, " ")}
                                          </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                          <span>{member.lastActive}</span>
                                          <span>{member.status === 'approved' ? 'Approved access' : 'Pending approval'}</span>
                                          <span>{member.systems} systems</span>
                                        </div>
                                      </div>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      View Profile
                                    </Badge>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Click to view full member profile and permissions</TooltipContent>
                            </Tooltip>
                          );
                          })
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden />
                            <p>No members found matching filters</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Role Breakdown and real audit activity */}
                <div className="space-y-6">
                  <RoleBreakdownSection 
                    roleBreakdown={roleBreakdown} 
                    onRoleClick={handleRoleClick}
                  />
                  <ActivityFeed 
                    activities={activityLog || []} 
                    onViewAll={() => navigate("/dsx/evidence-beta/decisions/log")}
                  />
                </div>
              </div>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="approvals" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-display font-bold">User Approvals</h2>
                    <p className="text-muted-foreground">Approve or revoke access for new signups</p>
                  </div>
                  {pendingApprovalCount > 0 && (
                    <Badge variant="destructive" className="text-sm px-3 py-1">
                      {pendingApprovalCount} pending
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  {(['pending', 'approved', 'all'] as const).map((f) => (
                    <Button
                      key={f}
                      variant={approvalFilter === f ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setApprovalFilter(f)}
                      className="capitalize"
                    >
                      {f === 'pending' && <Clock className="h-4 w-4 mr-1" aria-hidden />}
                      {f === 'approved' && <CheckCircle className="h-4 w-4 mr-1" aria-hidden />}
                      {f === 'all' && <Users className="h-4 w-4 mr-1" aria-hidden />}
                      {f}
                    </Button>
                  ))}
                </div>

                {loadingApprovals ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : !pendingUsers?.length ? (
                  <Card className="p-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden />
                    <p>No {approvalFilter === 'all' ? '' : approvalFilter} users found</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {pendingUsers.map((profile) => (
                      <Card key={profile.user_id} className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{profile.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground truncate">{profile.email || 'No email'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Signed up: {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Select
                            value={selectedRoles[profile.user_id] || 'engineer'}
                            onValueChange={(val) => setSelectedRoles(prev => ({ ...prev, [profile.user_id]: val }))}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs" aria-label="Assign role">
                              <SelectValue placeholder="Assign role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="engineer">
                                <span className="flex items-center gap-1.5"><Wrench className="h-3 w-3" aria-hidden /> Engineer</span>
                              </SelectItem>
                              <SelectItem value="manager">
                                <span className="flex items-center gap-1.5"><Users className="h-3 w-3" aria-hidden /> Manager</span>
                              </SelectItem>
                              <SelectItem value="executive">
                                <span className="flex items-center gap-1.5"><Crown className="h-3 w-3" aria-hidden /> Executive</span>
                              </SelectItem>
                              <SelectItem value="security_admin">
                                <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" aria-hidden /> Security Admin</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {profile.is_approved ? (
                            <>
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle className="h-3 w-3" aria-hidden />
                                Approved
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => approveMutation.mutate({ userId: profile.user_id, approve: false })}
                                disabled={approveMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" aria-hidden />
                                Revoke
                              </Button>
                            </>
                          ) : (
                            <>
                              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                                <Clock className="h-3 w-3" aria-hidden />
                                Pending
                              </Badge>
                              <Button
                                size="sm"
                                onClick={() => approveMutation.mutate({ userId: profile.user_id, approve: true })}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" aria-hidden />
                                Approve
                              </Button>
                            </>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <InviteTeamMemberModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onInviteSent={handleInviteSent}
      />
      
      {selectedMember && (
        <MemberProfileModal
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
          member={selectedMember}
          isSaving={editRoleMutation.isPending || removeMemberMutation.isPending}
          onEditRole={(userId, newRole) => {
            editRoleMutation.mutate({ userId, newRole });
          }}
          onManageAccess={(userId) => {
            // Navigate to the user approvals tab where access is managed
            setActiveTab('approvals');
            setProfileModalOpen(false);
            sonnerToast.info('Use the role selector and approval controls to manage access');
          }}
          onRemoveMember={(userId) => {
            removeMemberMutation.mutate(userId);
          }}
        />
      )}
    </TooltipProvider>
  );
}
