/**
 * Browser-side driver for the AURA Managed User Connection flow.
 *
 * The browser never sees a token, gateway key or connection handle: it opens
 * the authorization window, receives a one-time code on the return route and
 * forwards it to an authenticated server function that stores the handle.
 */
import { supabase } from '@/integrations/supabase/client';

export const MANAGED_USER_RETURN_PATH = '/oauth/managed-user/return';
export const MANAGED_USER_MESSAGE = 'auraManagedUserConnectionResult';

export interface ManagedUserOAuthMessage {
  type: typeof MANAGED_USER_MESSAGE;
  ok: boolean;
  reason?: string;
}

function waitForCompletion(popup: Window): Promise<void> {
  return new Promise((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data as ManagedUserOAuthMessage | undefined;
      if (event.origin !== window.location.origin || event.source !== popup || data?.type !== MANAGED_USER_MESSAGE) {
        return;
      }
      cleanup();
      if (data.ok) {
        resolve();
        return;
      }
      popup.close();
      reject(new Error(data.reason ?? 'The connection was not authorized.'));
    };
    window.addEventListener('message', onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error('The authorization window was closed before the connection completed.'));
    }, 500);
  });
}

export async function connectManagedUserConnector(connectorDefinitionId: string): Promise<void> {
  const popup = window.open('', 'aura-managed-user-oauth', 'width=600,height=760');
  if (!popup) throw new Error('The authorization window was blocked. Allow pop-ups for AURA and try again.');
  try {
    sessionStorage.setItem('aura.managedUser.pendingConnector', connectorDefinitionId);
    const { data, error } = await supabase.functions.invoke('managed-user-oauth-start', {
      body: { connector_definition_id: connectorDefinitionId, origin: window.location.origin },
    });
    if (error) throw new Error('Authorization could not be started.');
    const authorizationUrl = (data as { authorization_url?: string })?.authorization_url;
    if (!authorizationUrl) {
      throw new Error(
        (data as { safe_message?: string })?.safe_message ?? 'No managed connector client is configured yet.',
      );
    }
    const completion = waitForCompletion(popup);
    popup.location.href = authorizationUrl;
    await completion;
  } catch (error) {
    popup.close();
    throw error;
  }
}

export async function disconnectManagedUserConnector(connectorDefinitionId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('managed-user-disconnect', {
    body: { connector_definition_id: connectorDefinitionId },
  });
  if (error) throw new Error('The connection could not be revoked.');
  if (!(data as { ok?: boolean })?.ok) {
    throw new Error((data as { safe_message?: string })?.safe_message ?? 'The connection could not be revoked.');
  }
}
