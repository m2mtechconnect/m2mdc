import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Crown, Shield, Wrench, BarChart3, TrendingUp, 
  Users, ShoppingCart, Headphones, DollarSign, 
  Mail, Calendar, Activity, Settings, Trash2,
  CheckCircle2, Clock, Save
} from "lucide-react";
import { useState } from "react";

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
  onEditRole?: (userId: string, newRole: string) => void;
  onManageAccess?: (userId: string) => void;
  onRemoveMember?: (userId: string) => void;
  isSaving?: boolean;
}

const roleIcons: Record<string, any> = {
  executive: Crown,
  manager: Users,
  engineer: Wrench,
  compliance: Shield,
  security_admin: Shield,
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
  security_admin: "text-red-600 border-red-600",
  data_analyst: "text-blue-600 border-blue-600",
  marketing: "text-purple-600 border-purple-600",
  sales: "text-orange-600 border-orange-600",
  support: "text-cyan-600 border-cyan-600",
  finance: "text-emerald-600 border-emerald-600",
};

const availableRoles = [
  { value: "engineer", label: "Engineer", icon: Wrench },
  { value: "manager", label: "Manager", icon: Users },
  { value: "executive", label: "Executive", icon: Crown },
  { value: "security_admin", label: "Security Admin", icon: Shield },
];

// Permission matrix by role
const permissionsByRole: Record<string, { twins: string; workflows: string; compliance: string }> = {
  engineer: { twins: "View, Edit", workflows: "View Only", compliance: "Limited" },
  manager: { twins: "Full Access", workflows: "Full Access", compliance: "View Only" },
  executive: { twins: "Full Access", workflows: "Full Access", compliance: "Full Access" },
  security_admin: { twins: "View Only", workflows: "View, Audit", compliance: "Full Access" },
  compliance: { twins: "View Only", workflows: "View Only", compliance: "Full Access" },
};

export default function MemberProfileModal({
  open,
  onOpenChange,
  member,
  onEditRole,
  onManageAccess,
  onRemoveMember,
  isSaving = false,
}: MemberProfileModalProps) {
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState(member.role);
  const RoleIcon = roleIcons[member.role] || Wrench;

  const permissions = permissionsByRole[selectedRole] || permissionsByRole.engineer;

  const handleSaveRole = () => {
    if (member.userId && onEditRole) {
      onEditRole(member.userId, selectedRole);
    }
    setIsEditingRole(false);
  };

  const handleRemove = () => {
    if (member.userId && onRemoveMember) {
      onRemoveMember(member.userId);
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setIsEditingRole(false); }}>
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
                  {isEditingRole ? (
                    <div className="flex items-center gap-2">
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              <span className="flex items-center gap-1.5">
                                <r.icon className="h-3 w-3" />
                                {r.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="default" onClick={handleSaveRole} disabled={isSaving} className="h-8 gap-1">
                        <Save className="h-3 w-3" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setIsEditingRole(false); setSelectedRole(member.role); }} className="h-8">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="outline" className={`capitalize ${roleColors[member.role]}`}>
                      <RoleIcon className="h-3 w-3 mr-1" />
                      {member.role.replace(/_/g, " ")}
                    </Badge>
                  )}
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

            {/* Permissions Summary — updates dynamically when editing role */}
            <div>
              <h4 className="font-semibold mb-3">Permissions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span>Digital Twins & Agents</span>
                  <Badge variant="secondary">{permissions.twins}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span>Workflows</span>
                  <Badge variant="secondary">{permissions.workflows}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span>Compliance & Audit</span>
                  <Badge variant="secondary">{permissions.compliance}</Badge>
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
                    onClick={() => setIsEditingRole(true)}
                    disabled={isEditingRole}
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
                    onClick={() => member.userId && onManageAccess?.(member.userId)}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Manage Access
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Configure system-level access permissions</TooltipContent>
              </Tooltip>

              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Remove this member from your workspace</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will revoke their access and remove their role. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Remove Member
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
