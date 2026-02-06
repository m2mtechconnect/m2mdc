import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  Wrench,
  CheckCircle2,
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
  Activity,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MemberProfileModal from "@/components/teams/MemberProfileModal";
import InviteTeamMemberModal from "@/components/teams/InviteTeamMemberModal";
import RoleBreakdownSection from "@/components/teams/RoleBreakdownSection";
import ActivityFeed from "@/components/teams/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
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
          .select("user_id, full_name, email, created_at, avatar_url, avatar_bg_color, avatar_initials")
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
          status: "active",
          lastActive: Math.random() > 0.5 ? "Online" : `${Math.floor(Math.random() * 5 + 1)} hours ago`,
          systems: userSystems,
          userId: profile.user_id,
          joinedDate: new Date(profile.created_at).toLocaleDateString(),
          department: userRole?.role?.replace(/_/g, " ") || "Engineering",
          avatarUrl: profile.avatar_url,
          avatarBgColor: profile.avatar_bg_color,
          avatarInitials: profile.avatar_initials,
        };
      });
    },
  });

  // Fetch team invites (with error handling for missing table)
  const { data: invites, isLoading: loadingInvites } = useQuery({
    queryKey: ["team-invites"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("*")
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

  // Calculate stats
  const activeMembersCount = teamMembers?.length || 0;
  const pendingInvitesCount = invites?.filter((i) => i.status === "pending").length || 0;
  const totalMembers = activeMembersCount + pendingInvitesCount;
  const activeNow = teamMembers?.filter((m) => m.lastActive === "Online").length || 0;
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-display font-bold mb-2 text-gradient-hero">
                Teams & Collaboration
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage team members, roles, and access controls
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  className="gap-2 glow-yellow font-semibold"
                  onClick={() => setInviteModalOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  Invite Team Member
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add new members to your workspace</TooltipContent>
            </Tooltip>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { label: "Total Members", value: totalMembers, icon: Users },
              { label: "Active Now", value: activeNow, icon: CheckCircle2 },
              { label: "Systems", value: totalSystems, icon: Wrench },
              { label: "Pending", value: pendingInvitesCount, icon: Clock, warning: pendingInvitesCount > 0 },
              { label: "Roles", value: rolesCount, icon: Shield },
              { label: "Departments", value: rolesCount, icon: Building2 },
            ].map((stat) => (
              <Card key={stat.label} className={stat.warning ? "border-l-4 border-l-warning" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{stat.value}</div>
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">Team Members</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      {isInitialLoading ? "..." : `${filteredMembers.length} of ${activeMembersCount}`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search members..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
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
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
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
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
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
                                        <RoleIcon className="h-3 w-3 mr-1" />
                                        {member.role.replace(/_/g, " ")}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <div
                                          className={`h-2 w-2 rounded-full ${
                                            member.lastActive === "Online"
                                              ? "bg-secondary"
                                              : "bg-muted-foreground"
                                          }`}
                                        />
                                        {member.lastActive}
                                      </span>
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
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No members found matching filters</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Role Breakdown, Activity & Simulation Runs */}
            <div className="space-y-6">
              <RoleBreakdownSection 
                roleBreakdown={roleBreakdown} 
                onRoleClick={handleRoleClick}
              />
              <ActivityFeed 
                activities={activityLog || []} 
                onViewAll={() => navigate("/compliance")}
              />
              
              {/* Recent Simulation Runs */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Recent Simulation Runs</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { scenario: 'GPU Spike - Training Job', user: 'Sarah Chen', time: '2 hours ago', runId: 'run-001' },
                      { scenario: 'CRAH Failure - Hot Aisle', user: 'Michael Wong', time: '5 hours ago', runId: 'run-002' },
                      { scenario: 'Cross-Border Data Violation', user: 'Alex Johnson', time: '1 day ago', runId: 'run-003' },
                    ].map((run, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/data-centre-twin?view=simulation&runId=${run.runId}`)}
                      >
                        <div className="font-medium text-sm">{run.scenario}</div>
                        <div className="text-xs text-muted-foreground">
                          Run by {run.user} – {run.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
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
          onEditRole={() => {
            toast({ title: "Edit Role", description: "Role editing coming soon" });
          }}
          onManageAccess={() => {
            toast({ title: "Manage Access", description: "Access management coming soon" });
          }}
          onRemoveMember={() => {
            toast({ title: "Remove Member", description: "Member removal coming soon" });
          }}
        />
      )}
    </TooltipProvider>
  );
}
