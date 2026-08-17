import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Globe, HelpCircle, LogOut, User as UserIcon, Settings, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useRBAC } from '@/contexts/RBACContext';
import { fetchProfileFields } from '@/lib/auth/profileQuery';

const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr-CA', label: 'Français (QC)', short: 'FR' },
] as const;

interface ProfileData {
  avatar_url: string | null;
  avatar_bg_color: string | null;
  avatar_initials: string | null;
}

export function UserMenu() {
  const navigate = useNavigate();
  const { can } = useRBAC();
  const { i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  // One authoritative session source. The auth listener only writes local
  // state - calling back into the auth client from inside the callback is
  // what produced the repeating, aborted /auth/v1/user loop (PW-P2-03).
  useEffect(() => {
    let cancelled = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      if (!session?.user) setProfile(null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Profile read is keyed on the resolved user id and never runs before it
  // exists, so no request can carry an empty `user_id` filter (PW-P2-02).
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    let stale = false;
    void fetchProfileFields(userId, 'avatar_url, avatar_bg_color, avatar_initials').then((result) => {
      if (stale) return;
      setProfile(result.status === 'success' ? (result.data as unknown as ProfileData) : null);
    });
    return () => {
      stale = true;
    };
  }, [userId]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
      navigate('/', { replace: true });
    }
  };

  if (!user) return null;

  const userEmail = user.email || '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full"
          aria-label="User menu"
        >
          <UserAvatar
            profileImageUrl={profile?.avatar_url}
            initials={profile?.avatar_initials}
            bgColor={profile?.avatar_bg_color}
            size="md"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Account</p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account/profile" className="cursor-pointer">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Preferences</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Language</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onSelect={() => i18n.changeLanguage(lang.code)}
                className={i18n.language === lang.code ? 'bg-accent/10 font-medium' : ''}
              >
                <span className="mr-2 inline-block w-6 text-xs font-semibold tracking-wide text-muted-foreground">
                  {lang.short}
                </span>
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem asChild>
          <Link to="/help" className="cursor-pointer">
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Learning Hub</span>
          </Link>
        </DropdownMenuItem>
        {can('tenant.view_members') && (
          <DropdownMenuItem asChild>
            <Link to="/teams" className="cursor-pointer">
              <Users className="mr-2 h-4 w-4" />
              <span>Teams and access</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
