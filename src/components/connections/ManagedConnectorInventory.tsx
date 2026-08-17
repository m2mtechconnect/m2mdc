/**
 * Verified connector capability inventory.
 *
 * Shows the implementation class and proven runtime eligibility for every
 * connector AURA knows about. A catalogue entry is not a configured
 * connection, and a linked connector is not evidence of data ingestion, so
 * this panel states eligibility and its evidence, never availability implied
 * by a provider name.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  connectManagedUserConnector,
  disconnectManagedUserConnector,
} from '@/connections/managedUserBinding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useManagedConnectorCapabilities } from '@/connections/managedConnectorApi';
import {
  EXTERNAL_AUTHORIZATION_NOTICE,
  CONNECTION_CLASS_DESCRIPTION,
  CONNECTION_CLASS_LABEL,
  ELIGIBILITY_LABEL,
  ELIGIBILITY_TONE,
  type ConnectionClass,
  type ManagedCapabilityEntry,
} from '@/connections/managedConnectors';

const TONE_CLASS: Record<string, string> = {
  positive: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  caution: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  critical: 'border-destructive/40 bg-destructive/10 text-destructive',
  neutral: 'border-border bg-muted text-muted-foreground',
};

const CLASS_ORDER: ConnectionClass[] = ['MANAGED_SHARED', 'MANAGED_USER', 'AURA_NATIVE', 'EXTERNAL_DSX_RUNTIME'];

/**
 * Per-user binding controls. Authorization happens in the provider's own
 * window; AURA stores only a server-side, encrypted handle plus a non-secret
 * evidence record.
 */
function ManagedUserBindingControls({ entry }: { entry: ManagedCapabilityEntry }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const connected = entry.user_binding?.status === 'CONNECTED_NO_DATA' && !entry.user_binding.revoked_at;

  if (!entry.user_bindable) return null;

  if (!entry.user_client_configured) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        No managed connector client is configured for this project, so no user can authorize it yet.
      </p>
    );
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['managed-connector-capabilities'] });

  const onConnect = async () => {
    setBusy(true);
    try {
      await connectManagedUserConnector(entry.connector_definition_id);
      toast.success('Connection authorized. No data has been read yet.');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The connection was not authorized.');
    } finally {
      setBusy(false);
    }
  };

  const onDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectManagedUserConnector(entry.connector_definition_id);
      toast.success('Connection revoked.');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The connection could not be revoked.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <p className="text-xs text-muted-foreground">
        {connected
          ? `Your account is connected${entry.user_binding?.consented_at ? ` since ${new Date(entry.user_binding.consented_at).toLocaleDateString()}` : ''}. Scope granted: ${(entry.user_binding?.granted_scopes ?? []).join(', ') || 'none recorded'}. No data has been ingested by AURA.`
          : EXTERNAL_AUTHORIZATION_NOTICE}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={connected ? 'outline' : 'default'} disabled={busy} onClick={onConnect}>
          {connected ? 'Reauthorize your account' : 'Connect your account'}
        </Button>
        {connected && (
          <Button size="sm" variant="outline" disabled={busy} onClick={onDisconnect}>
            Revoke connection
          </Button>
        )}
      </div>
    </div>
  );
}

export function ManagedConnectorInventory() {
  const { data, isLoading } = useManagedConnectorCapabilities();

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (!data || data.entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          The capability inventory could not be read. No connector is treated as runtime-available until the server
          confirms its binding.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Connector capability inventory</CardTitle>
        <CardDescription className="text-sm">
          Implementation class and proven runtime eligibility, verified server-side. Build-time assistant connectors are
          excluded: they are never operational AURA integrations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {CLASS_ORDER.map((cls) => {
          const entries = data.entries.filter((e) => e.connection_class === cls);
          if (entries.length === 0) return null;
          return (
            <section key={cls} className="space-y-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{CONNECTION_CLASS_LABEL[cls]}</h3>
                <p className="text-xs text-muted-foreground">{CONNECTION_CLASS_DESCRIPTION[cls]}</p>
              </div>
              <ul className="space-y-2">
                {entries.map((entry) => (
                  <li key={entry.connector_definition_id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{entry.provider}</span>
                      <Badge variant="outline" className={`text-xs ${TONE_CLASS[ELIGIBILITY_TONE[entry.eligibility]]}`}>
                        {ELIGIBILITY_LABEL[entry.eligibility]}
                      </Badge>
                      {entry.runtime_selectable && (
                        <Badge variant="outline" className="text-xs">
                          Runtime verified {entry.verified_at ?? ''}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{entry.evidence_note}</p>
                    {entry.native_required_reason && (
                      <p className="mt-1.5 text-xs text-muted-foreground">{entry.native_required_reason}</p>
                    )}
                    {entry.operations.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {entry.operations.map((op) => (
                          <li key={op.id} className="text-xs text-muted-foreground">
                            {op.label} - {op.classification === 'WRITE' ? 'write, approval required' : 'read only'},
                            {` up to ${op.rate_limit_per_hour}/hour`}
                            {op.permitted_for_caller ? '' : ', not permitted for your role'}
                          </li>
                        ))}
                      </ul>
                    )}
                    {entry.connection_class === 'MANAGED_USER' && <ManagedUserBindingControls entry={entry} />}
                    {entry.disclosure_limitations.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium">Disclosure limitations</summary>
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                          {entry.disclosure_limitations.map((limitation, i) => (
                            <li key={i}>{limitation}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}