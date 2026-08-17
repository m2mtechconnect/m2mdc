/**
 * Return route for the AURA Managed User Connection flow.
 *
 * Receives a one-time code, hands it to the authenticated completion
 * function, and reports a same-origin result to the opener. No credential is
 * held in this page, in the URL after completion, or in application state.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MANAGED_USER_MESSAGE } from '@/connections/managedUserBinding';

export default function ManagedUserReturn() {
  const [message, setMessage] = useState('Completing the connection…');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectorDefinitionId = sessionStorage.getItem('aura.managedUser.pendingConnector') ?? '';

    const report = (ok: boolean, reason?: string) => {
      window.opener?.postMessage({ type: MANAGED_USER_MESSAGE, ok, reason }, window.location.origin);
      if (ok) window.close();
    };

    if (params.get('success') !== 'true') {
      const reason = 'Authorization did not complete at the provider.';
      setMessage(reason);
      report(false, reason);
      return;
    }

    const code = params.get('code');
    if (!code) {
      const reason =
        params.get('offline_access_allowed') === 'false'
          ? 'This connector client cannot issue a durable connection. An administrator must enable offline access before any user can connect.'
          : 'Authorization completed without an exchange code, so no connection was created.';
      setMessage(reason);
      report(false, reason);
      return;
    }

    if (!connectorDefinitionId) {
      const reason = 'The originating connector could not be identified, so nothing was stored.';
      setMessage(reason);
      report(false, reason);
      return;
    }

    void supabase.functions
      .invoke('managed-user-oauth-complete', {
        body: { code, connector_definition_id: connectorDefinitionId },
      })
      .then(({ data, error }) => {
        if (error || !(data as { ok?: boolean })?.ok) {
          throw new Error((data as { safe_message?: string })?.safe_message ?? 'The connection could not be stored.');
        }
        sessionStorage.removeItem('aura.managedUser.pendingConnector');
        setMessage('Connection authorized. You can close this window.');
        report(true);
      })
      .catch((error: Error) => {
        setMessage(error.message);
        report(false, error.message);
      });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <p className="max-w-md text-center text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
