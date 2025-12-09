import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, Shield, Wrench, BarChart3, TrendingUp, 
  Users, ShoppingCart, Headphones, DollarSign,
  Send, HelpCircle
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface InviteTeamMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent?: () => void;
}

const roles = [
  { value: "executive", label: "Executive", icon: Crown, description: "Full platform access" },
  { value: "manager", label: "Manager", icon: Users, description: "Team oversight & deployment" },
  { value: "engineer", label: "Engineer / DevOps", icon: Wrench, description: "Build & maintain systems" },
  { value: "compliance", label: "Compliance Officer", icon: Shield, description: "Audit & governance access" },
  { value: "data_analyst", label: "Data Analyst", icon: BarChart3, description: "Analytics & reporting" },
  { value: "marketing", label: "Marketing", icon: TrendingUp, description: "Campaign & content management" },
  { value: "sales", label: "Sales", icon: ShoppingCart, description: "CRM & sales automation" },
  { value: "support", label: "Support", icon: Headphones, description: "Customer assistance systems" },
  { value: "finance", label: "Finance", icon: DollarSign, description: "Financial operations access" },
];

const departments = [
  "Operations", "Marketing", "IT/DevOps", "Risk & Audit", 
  "Sales", "Support", "Finance", "HR", "Data Analytics"
];

export default function InviteTeamMemberModal({
  open,
  onOpenChange,
  onInviteSent,
}: InviteTeamMemberModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRole = roles.find(r => r.value === role);

  const handleInvite = async () => {
    if (!email || !role) {
      toast({
        title: "Missing Information",
        description: "Please provide an email and select a role.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("teams-invite", {
        body: { email, role, department, message },
      });

      if (error) throw error;

      toast({
        title: "Invitation Sent",
        description: `Invite sent to ${email}`,
      });

      // Reset form
      setEmail("");
      setRole("");
      setDepartment("");
      setMessage("");
      onOpenChange(false);
      onInviteSent?.();
    } catch (error: any) {
      toast({
        title: "Failed to Send Invite",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">Invite Team Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="role">Role</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Roles define what members can view, edit, or execute across agents, twins, workflows, and integrations.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => {
                    const Icon = r.icon;
                    return (
                      <SelectItem key={r.value} value={r.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{r.label}</div>
                            <div className="text-xs text-muted-foreground">{r.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Role Preview */}
            {selectedRole && (
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const Icon = selectedRole.icon;
                    return <Icon className="h-5 w-5 text-primary" />;
                  })()}
                  <span className="font-semibold">{selectedRole.label}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedRole.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">View Access</Badge>
                  {(role === "executive" || role === "manager" || role === "engineer") && (
                    <Badge variant="secondary">Edit Access</Badge>
                  )}
                  {(role === "executive" || role === "manager") && (
                    <Badge variant="secondary">Deploy Access</Badge>
                  )}
                  {role === "compliance" && (
                    <Badge variant="secondary">Audit Access</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Department (Optional)</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Invitation Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message to your invitation..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="flex-1 glow-yellow"
                    onClick={handleInvite}
                    disabled={!email || !role || isSubmitting}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Sending..." : "Send Invite"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Send an invitation email with access instructions
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
