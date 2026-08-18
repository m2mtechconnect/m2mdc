/**
 * Per-user notification preferences.
 *
 * Backed by `public.notification_preferences` (RLS: owner only). Writes are
 * upserts so a first-time user gets a row on their first toggle.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPreferences {
  systemAlerts: boolean;
  teamActivity: boolean;
}

const DEFAULTS: NotificationPreferences = {
  systemAlerts: true,
  teamActivity: true,
};

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error: readError } = await supabase
        .from('notification_preferences')
        .select('system_alerts, team_activity')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (readError) {
        setError(readError.message);
      } else if (data) {
        setPreferences({
          systemAlerts: data.system_alerts,
          teamActivity: data.team_activity,
        });
      }
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  const update = useCallback(async (patch: Partial<NotificationPreferences>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'You must be signed in to change notification settings.' };

    const next = { ...preferences, ...patch };
    setPreferences(next);
    setSaving(true);

    const { error: writeError } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        system_alerts: next.systemAlerts,
        team_activity: next.teamActivity,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    setSaving(false);

    if (writeError) {
      // Roll back the optimistic value: the stored state is authoritative.
      setPreferences(preferences);
      setError(writeError.message);
      return { error: writeError.message };
    }

    setError(null);
    return { error: null };
  }, [preferences]);

  return { preferences, loading, saving, error, update };
}
