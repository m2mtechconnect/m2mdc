/**
 * Invite acceptance surface.
 *
 * The token is redeemed server-side by the `teams-accept-invite` function,
 * which verifies the signed JWT email against the invite recipient before
 * granting the role. This page only reports the outcome and routes the user
 * onward to the team page.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type State =
  | { status: 'working' }
  | { status: 'accepted'; role: string }
  | { status: 'error'; message: string };

export default function InviteAccept() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [state, setState] = useState<State>({ status: 'working' });
  const redeemed = useRef(false);

  useEffect(() => {
    if (redeemed.current) return;
    redeemed.current = true;

    if (!token) {
      setState({ status: 'error', message: 'This invite link is missing its token.' });
      return;
    }

    (async () => {
      const { data, error } = await supabase.functions.invoke('teams-accept-invite', {
        body: { token },
      });

      if (error) {
        setState({ status: 'error', message: error.message || 'We could not accept this invite.' });
        return;
      }
      if (data?.error) {
        setState({ status: 'error', message: String(data.error) });
        return;
      }
      setState({ status: 'accepted', role: String(data?.role ?? 'member') });
    })();
  }, [token]);

  // A granted role changes the authenticated shell the user is entitled to, so
  // the handoff is a full document load rather than a client-side navigation.
  const goToTeams = useCallback(() => {
    window.location.assign('/teams');
  }, []);

  useEffect(() => {
    if (state.status !== 'accepted') return;
    const timer = window.setTimeout(goToTeams, 1200);
    return () => window.clearTimeout(timer);
  }, [state.status, goToTeams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {state.status === 'working' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {state.status === 'accepted' && <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />}
            {state.status === 'error' && <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden />}
            {state.status === 'working' && 'Accepting your invite'}
            {state.status === 'accepted' && 'Invite accepted'}
            {state.status === 'error' && 'Invite not accepted'}
          </CardTitle>
          <CardDescription>
            {state.status === 'working' && 'Verifying the invite token against your account.'}
            {state.status === 'accepted' && `You now hold the ${state.role} role. Taking you to your team.`}
            {state.status === 'error' && state.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {state.status === 'accepted' && (
            <Button onClick={goToTeams}>Go to team</Button>
          )}
          {state.status === 'error' && (
            <Button variant="outline" asChild>
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
