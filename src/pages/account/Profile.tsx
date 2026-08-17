/**
 * Profile Page - User Account Settings
 * Full backend integration with profiles table
 */

import { DisabledActionExplanation } from '@/components/shared/DisabledActionExplanation';
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Upload, User, Info, Camera } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useProfileUpload } from "@/hooks/use-profile-upload";
import { DCCard, DCSectionHeader } from "@/components/dc-ui";

interface ProfileData {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  avatar_bg_color: string | null;
  avatar_initials: string | null;
  job_title: string | null;
  phone: string | null;
  locale: string | null;
  timezone: string | null;
  department_id: string | null;
  role: string | null;
}

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
];

const locales = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
];

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const { uploadProfileImage, uploading } = useProfileUpload();
  const [formData, setFormData] = useState({
    full_name: '',
    job_title: '',
    phone: '',
    locale: 'en',
    timezone: 'UTC',
  });

  useEffect(() => {
    loadProfile();
    loadDepartments();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        toast.error('Failed to load profile');
        setLoading(false);
        return;
      }

      // If no profile exists, create one
      if (!profileData) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          toast.error('Failed to create profile');
          setLoading(false);
          return;
        }

        // Use the newly created profile
        const fullProfile = {
          ...newProfile,
          role: null,
        };
        setProfile(fullProfile);
        setFormData({
          full_name: fullProfile.full_name || '',
          job_title: fullProfile.job_title || '',
          phone: fullProfile.phone || '',
          locale: fullProfile.locale || 'en',
          timezone: fullProfile.timezone || 'UTC',
        });
        setLoading(false);
        return;
      }

      // Load user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const fullProfile = {
        ...profileData,
        role: roleData?.role || null,
      };

      setProfile(fullProfile);
      setFormData({
        full_name: fullProfile.full_name || '',
        job_title: fullProfile.job_title || '',
        phone: fullProfile.phone || '',
        locale: fullProfile.locale || 'en',
        timezone: fullProfile.timezone || 'UTC',
      });
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          job_title: formData.job_title,
          phone: formData.phone,
          locale: formData.locale,
          timezone: formData.timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      await loadProfile(); // Reload to get updated data
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    const newAvatarUrl = await uploadProfileImage(file, profile.user_id);
    if (newAvatarUrl) {
      await loadProfile(); // Reload profile to get updated avatar
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <DCCard>
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-10 w-full" />
          </DCCard>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <DCCard>
          <p className="text-center text-muted-foreground">Profile not found</p>
        </DCCard>
      </div>
    );
  }

  const userInitials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile.email.split('@')[0].slice(0, 2).toUpperCase();

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <DCSectionHeader
          as="h1"
          title="Profile"
          subtitle="Manage your personal account settings and preferences"
          icon={<User className="h-5 w-5 text-primary" />}
        />

        {/* Profile Picture */}
        <DCCard title="Profile Picture" icon={<Camera className="h-4 w-4 text-primary" />}>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <UserAvatar
                profileImageUrl={profile.avatar_url}
                initials={profile.avatar_initials}
                bgColor={profile.avatar_bg_color}
                size="xl"
                className="h-24 w-24"
              />
              <button
                onClick={triggerFileInput}
                disabled={uploading}
                aria-label="Change profile photo"
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={triggerFileInput}
                disabled={uploading}
              >
                {uploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, GIF, or WebP. Max 2MB.
              </p>
            </div>
          </div>
        </DCCard>

        {/* Personal Information */}
        <DCCard title="Personal Information">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <DisabledActionExplanation
                id="profile-email-reason"
                permanent
                reason="Your sign-in email is managed by the authentication provider."
                recovery="Contact an administrator to change the address on your account."
              />
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  aria-describedby="profile-email-reason"
                  disabled
                  className="bg-muted"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Email is managed by your authentication provider</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="Senior Engineer"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </DCCard>

        {/* Role & Department (Read-only) */}
        <DCCard
          title="Organization"
          headerAction={
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Roles and departments are managed by your administrator</p>
              </TooltipContent>
            </Tooltip>
          }
        >
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="profile-role">Role</Label>
              <DisabledActionExplanation
                id="profile-role-reason"
                permanent
                reason="Roles are assigned by an administrator and cannot be edited here."
                recovery="Request a change from your workspace administrator in Teams."
              />
              <Input
                id="profile-role"
                value={profile.role ? profile.role.replace(/_/g, ' ').toUpperCase() : 'Not assigned'}
                aria-describedby="profile-role-reason"
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profile-department">Department</Label>
              <DisabledActionExplanation
                id="profile-department-reason"
                permanent
                reason="Department membership is managed by an administrator."
                recovery="Request a change from your workspace administrator in Teams."
              />
              <Input
                id="profile-department"
                aria-describedby="profile-department-reason"
                value={
                  profile.department_id
                    ? departments.find(d => d.id === profile.department_id)?.name || 'Unknown'
                    : 'Not assigned'
                }
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </DCCard>

        {/* Localization */}
        <DCCard title="Localization">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="locale">Language</Label>
              <Select
                value={formData.locale}
                onValueChange={(value) => setFormData({ ...formData, locale: value })}
              >
                <SelectTrigger id="locale" aria-label="Language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locales.map(locale => (
                    <SelectItem key={locale.value} value={locale.value}>
                      {locale.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => setFormData({ ...formData, timezone: value })}
              >
                <SelectTrigger id="timezone" aria-label="Timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DCCard>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
