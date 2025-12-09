import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Crown, Shield, Wrench, BarChart3, TrendingUp, 
  Users, ShoppingCart, Headphones, DollarSign, 
  Mail, Calendar, Activity, Settings, Trash2,
  CheckCircle2, Clock
} from "lucide-react";
import { AppRole } from "@/contexts/RBACContext";

interface MemberProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    name: string;
    email: string;
    role: string;
    department?: string;
    status: string;
    lastActive: string;
    systems: number;
    userId?: string;
    joinedDate?: string;
    avatarUrl?: string | null;
    avatarBgColor?: string | null;
    avatarInitials?: string | null;
  };
  onEditRole?: () => void;
  onManageAccess?: () => void;
  onRemoveMember?: () => void;
}

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
  marketing: "text-purple-600 border-purple-600",
  sales: "text-orange-600 border-orange-600",
  support: "text-cyan-600 border-cyan-600",
  finance: "text-emerald-600 border-emerald-600",
};

export default function MemberProfileModal({
  open,
  onOpenChange,
  member,
  onEditRole,
  onManageAccess,
  onRemoveMember,
}: MemberProfileModalProps) {
  const RoleIcon = roleIcons[member.role] || Wrench;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">Member Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-start gap-4">
              <UserAvatar
                profileImageUrl={member.avatarUrl}
                initials={member.avatarInitials}
                bgColor={member.avatarBgColor}
                size="xl"
                className="h-20 w-20"
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={`capitalize ${roleColors[member.role]}`}>
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {member.role.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant={member.status === "active" ? "secondary" : "outline"}>
                    {member.status === "active" ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <Clock className="h-3 w-3 mr-1" />
                    )}
                    {member.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {member.email}
                </div>
              </div>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      Joined Date
                    </div>
                    <p className="font-semibold">
                      {member.joinedDate || new Date().toLocaleDateString()}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>When this member joined your workspace</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Activity className="h-4 w-4" />
                      Last Active
                    </div>
                    <p className="font-semibold">{member.lastActive}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Most recent activity timestamp</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Settings className="h-4 w-4" />
                      Systems Managed
                    </div>
                    <p className="font-semibold text-xl">{member.systems}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Number of digital twins or agents this member oversees</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Users className="h-4 w-4" />
                      Department
                    </div>
                    <p className="font-semibold capitalize">
                      {member.department || member.role.replace(/_/g, " ")}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Member's department or functional area</TooltipContent>
              </Tooltip>
            </div>

            <Separator />

            {/* Permissions Summary */}
            <div>
              <h4 className="font-semibold mb-3">Permissions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span>Digital Twins & Agents</span>
                  <Badge variant="secondary">View, Edit</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span>Workflows</span>
                  <Badge variant="secondary">
                    {member.role === "executive" || member.role === "manager" ? "Full Access" : "View Only"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span>Compliance & Audit</span>
                  <Badge variant="secondary">
                    {member.role === "executive" || member.role === "compliance" ? "Full Access" : "Limited"}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={onEditRole}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Role
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Change this member's role and permissions</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={onManageAccess}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Manage Access
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Configure system-level access permissions</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="destructive" 
                    onClick={onRemoveMember}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove this member from your workspace</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
