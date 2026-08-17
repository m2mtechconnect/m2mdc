/**
 * Managed access history for a connection: invocation decisions, correlation IDs,
 * granted scopes for per-user bindings, write approvals and fail-closed reasons.
 */
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useManagedAccessHistory } from '@/connections/managedConnectorApi';
import { formatDateTime } from '@/connections/presentation';

const REASON_EXPLANATIONS: Record<string, string> = {
  not_managed_shared: 'This connection is not an AURA Managed Shared Connector.',
  binding_not_linked: 'This connector is not linked for runtime use.',
  connection_revoked: 'This connection is disabled or revoked.',
  tenant_scope_violation: 'This connection belongs to another tenant.',
  facility_scope_violation: 'This connection is scoped to a different facility.',
  operation_not_allowlisted: 'This operation is not on the connector allowlist.',
  role_not_permitted: 'The caller role cannot perform this operation.',
  approval_required: 'A write operation requires an approved request.',
  approval_expired: 'The approval for this operation had expired.',
  rate_limited: 'The hourly limit for this operation was reached.',
};

function DecisionBadge({ decision }: { decision: string }) {
  const allowed = decision.toLowerCase() === 'allow' || decision.toLowerCase() === 'allowed';
  return (
    <Badge variant={allowed ? 'secondary' : 'destructive'} className="text-[11px]">
      {allowed ? 'Allowed' : 'Denied'}
    </Badge>
  );
}

export function ManagedAccessPanel({
  connectionId,
  connectorDefinitionId,
}: {
  connectionId: string;
  connectorDefinitionId?: string | null;
}) {
  const { data, isLoading } = useManagedAccessHistory(connectionId, connectorDefinitionId ?? null);

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading managed access history
      </p>
    );
  }

  const invocations = data?.invocations ?? [];
  const approvals = data?.approvals ?? [];
  const bindings = data?.userBindings ?? [];

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Invocation history</h3>
        {invocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No managed connector invocation has been recorded for this connection.
          </p>
        ) : (
          invocations.map((i) => (
            <div key={i.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <DecisionBadge decision={i.decision} />
                <span className="font-medium">{i.operation_id}</span>
                <span className="text-muted-foreground">{formatDateTime(i.created_at)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground break-all">
                Correlation {i.correlation_id ?? 'not recorded'} · {i.latency_ms ?? '-'} ms
              </p>
              {i.reason_code ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Fail-closed reason <span className="font-mono">{i.reason_code}</span> ·{' '}
                  {REASON_EXPLANATIONS[i.reason_code] ?? 'Reason recorded by the server.'}
                </p>
              ) : null}
            </div>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Write approvals</h3>
        {approvals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No write approval has been requested for this connection.</p>
        ) : (
          approvals.map((a) => (
            <div key={a.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[11px]">{a.status}</Badge>
                <span className="font-medium">{a.operation_id}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground break-all">
                Requested {formatDateTime(a.created_at)} · expires {formatDateTime(a.expires_at)} · correlation{' '}
                {a.correlation_id ?? 'not recorded'}
              </p>
            </div>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Granted scopes</h3>
        {bindings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No per-user managed binding is authorized for this connector under your account.
          </p>
        ) : (
          bindings.map((b) => (
            <div key={b.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[11px]">{b.status}</Badge>
                <span className="font-medium">{b.provider_account_label ?? b.connector_definition_id}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(b.granted_scopes ?? []).length === 0 ? (
                  <span className="text-xs text-muted-foreground">No scope recorded.</span>
                ) : (
                  (b.granted_scopes ?? []).map((s) => (
                    <Badge key={s} variant="secondary" className="text-[11px] font-mono">{s}</Badge>
                  ))
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Consented {formatDateTime(b.consented_at)} · last success {formatDateTime(b.last_success_at)}
                {b.revoked_at ? ` · revoked ${formatDateTime(b.revoked_at)}` : ''}
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
