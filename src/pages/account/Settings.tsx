/**
 * Settings Page - Workspace/Organization Settings
 * Admin-only features for workspace configuration
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Shield, Bell, CreditCard, Info, Lock, Settings as SettingsIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DCCard, DCSectionHeader } from "@/components/dc-ui";

interface OrganizationData {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  default_role: string;
  mfa_enabled: boolean;
  sso_enabled: boolean;
}

const industries = [
  'Technology',
  'Finance',
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Education',
  'Government',
  'Other',
];

const defaultRoles = [
  { value: 'engineer', label: 'Engineer' },
  { value: 'data_analyst', label: 'Data Analyst' },
  { value: 'manager', label: 'Manager' },
];

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    industry: '',
    default_role: 'engineer',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user is admin/executive
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const isExec = roleData?.role === 'executive';
      setIsAdmin(isExec);

      // Load user's profile to get org_id
      const { data: profileData } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData?.org_id) {
        // Load organization data
        const { data: orgData, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profileData.org_id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading organization:', error);
          toast.error('Failed to load organization');
        }

        if (orgData) {
          setOrganization(orgData);
          setFormData({
            name: orgData.name || '',
            domain: orgData.domain || '',
            industry: orgData.industry || '',
            default_role: orgData.default_role || 'engineer',
          });
        }
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organization || !isAdmin) {
      toast.error('You must be an administrator to update workspace settings');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          domain: formData.domain,
          industry: formData.industry,
          default_role: formData.default_role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      if (error) throw error;

      toast.success('Workspace settings updated successfully');
      await loadSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <DCCard>
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-10 w-full" />
          </DCCard>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <DCSectionHeader
          title="Workspace Settings"
          subtitle="Manage workspace configuration and team defaults"
          icon={<SettingsIcon className="h-5 w-5 text-dc-cyan" />}
          action={
            !isAdmin ? (
              <Badge variant="secondary">
                <Lock className="mr-1 h-3 w-3" />
                Admin access required
              </Badge>
            ) : undefined
          }
        />

        {!organization ? (
          <DCCard status="neutral">
            <div className="text-center space-y-4 py-8">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No Workspace Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your account is not associated with a workspace yet.
                </p>
                <Button variant="outline" onClick={() => navigate('/teams')}>
                  View Teams
                </Button>
              </div>
            </div>
          </DCCard>
        ) : (
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">
                <Building2 className="mr-2 h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="mr-2 h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-6">
              <DCCard title="Workspace Information" icon={<Building2 className="h-4 w-4 text-dc-cyan" />}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="workspace_name">Workspace Name</Label>
                    <Input
                      id="workspace_name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!isAdmin}
                      placeholder="My Organization"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="domain">Primary Domain</Label>
                    <Input
                      id="domain"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      disabled={!isAdmin}
                      placeholder="company.com"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) => setFormData({ ...formData, industry: value })}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map(industry => (
                          <SelectItem key={industry} value={industry.toLowerCase()}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DCCard>

              <DCCard
                title="Team Defaults"
                headerAction={
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>These settings apply to new team members</p>
                    </TooltipContent>
                  </Tooltip>
                }
              >
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="default_role">Default Role for New Members</Label>
                    <Select
                      value={formData.default_role}
                      onValueChange={(value) => setFormData({ ...formData, default_role: value })}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {defaultRoles.map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DCCard>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <DCCard title="Access & Security" icon={<Shield className="h-4 w-4 text-dc-cyan" />}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Multi-Factor Authentication (MFA)</Label>
                      <p className="text-sm text-muted-foreground">
                        Require MFA for all team members
                      </p>
                    </div>
                    <Switch
                      checked={organization.mfa_enabled}
                      disabled
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Single Sign-On (SSO)</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable SSO authentication
                      </p>
                    </div>
                    <Switch
                      checked={organization.sso_enabled}
                      disabled
                    />
                  </div>

                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-4">
                    <Info className="h-4 w-4" />
                    <span>Contact your administrator to modify security settings</span>
                  </div>
                </div>
              </DCCard>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <DCCard title="Notification Preferences" icon={<Bell className="h-4 w-4 text-dc-cyan" />}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>System Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about system updates
                      </p>
                    </div>
                    <Switch disabled />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Team Activity</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about team member activity
                      </p>
                    </div>
                    <Switch disabled />
                  </div>

                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-4">
                    <Info className="h-4 w-4" />
                    <span>Notification settings coming soon</span>
                  </div>
                </div>
              </DCCard>
            </TabsContent>
          </Tabs>
        )}

        {/* Actions */}
        {organization && isAdmin && (
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !isAdmin}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
