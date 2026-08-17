/**
 * Runtime diagnostics view.
 *
 * Explains, from live rows only, why a tenant has 0 active signal-to-twin
 * mappings and 0 vaulted credentials: disabled connections, missing or
 * incomplete inbound contract fields, mappings that cannot validate, and vault
 * integrations that failed or were never attempted.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, RefreshCw, Stethoscope } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  diagnoseTenant,
  type DiagnosticFinding,
  type TenantDiagnosis,
} from '@/connections/runtimeDiagnostics';

const SEVERITY_STYLES: Record<DiagnosticFinding['severity'], string> = {
  BLOCKER: 'border-destructive/40 bg-destructive/5',
  WARNING: 'border-amber-500/40 bg-amber-500/5',
  INFO: 'border-border bg-muted/30',
};

function SeverityIcon({ severity }: { severity: DiagnosticFinding['severity'] }) {
  if (severity === 'BLOCKER') return <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />;
  if (severity === 'WARNING') return <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />;
  return <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}

function FindingRow({ finding }: { finding: DiagnosticFinding }) {
  return (
    <li className={`rounded-md border p-3 ${SEVERITY_STYLES[finding.severity]}`}>
      <div className="flex items-start gap-2">
        <SeverityIcon severity={finding.severity} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{finding.title}</p>
            <Badge variant="outline" className="text-[11px]">{finding.code}</Badge>
            <Badge variant="outline" className="text-[11px] uppercase">{finding.area}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{finding.detail}</p>
          {finding.missingFields && finding.missingFields.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
              {finding.missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs font-medium">Next step: {finding.remedy}</p>
        </div>
      </div>
    </li>
  );
}

export function RuntimeDiagnosticsPanel() {
  const [diagnosis, setDiagnosis] = useState<TenantDiagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [connections, contracts, mappings, credentials, events] = await Promise.all([
        supabase.from('connection_instances').select('id, connector_id, display_name, tenant_id, status, enabled, status_reason, last_error'),
        supabase.from('connection_data_contracts').select('id, connector_id, direction, schema_type, schema_version, validation_status, unit_rules, timestamp_rules, official_source, checksum'),
        supabase.from('connection_twin_mappings').select('*'),
        supabase.from('connection_credentials').select('id, connection_id, status, auth_method, version, expires_at'),
        supabase.from('connection_credential_events').select('connection_id, action, version, created_at').order('created_at', { ascending: false }).limit(200),
      ]);

      const firstError = [connections, contracts, mappings, credentials, events].find((r) => r.error)?.error;
      if (firstError) throw new Error(firstError.message);

      const rows = (connections.data ?? []) as never[];
      setDiagnosis(
        diagnoseTenant({
          tenantId: (connections.data?.[0]?.tenant_id as string | null) ?? null,
          connections: rows,
          contracts: (contracts.data ?? []) as never[],
          mappings: (mappings.data ?? []) as never[],
          credentials: (credentials.data ?? []) as never[],
          credentialEvents: (events.data ?? []) as never[],
        }),
      );
    } catch (e) {
      setError((e as Error).message);
      setDiagnosis(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const blockerCount = useMemo(
    () =>
      diagnosis
        ? diagnosis.tenantFindings.filter((f) => f.severity === 'BLOCKER').length +
          diagnosis.connections.reduce(
            (sum, c) => sum + c.findings.filter((f) => f.severity === 'BLOCKER').length,
            0,
          )
        : 0,
    [diagnosis],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Stethoscope className="h-4 w-4" aria-hidden="true" />
          Runtime diagnostics
        </CardTitle>
        <Button variant="outline" size="sm" className="min-h-[32px]" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Re-run
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-xs text-muted-foreground">
          Why this tenant has no active mappings and no vaulted credentials. Every line below is derived from rows
          visible to your tenant; nothing is simulated.
        </p>

        {loading && <p className="text-xs text-muted-foreground">Reading connection, contract, mapping and vault records.</p>}
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
            Diagnostics could not read the control plane: {error}
          </p>
        )}

        {diagnosis && (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-border p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Connections visible</p>
                <p className="text-lg font-semibold">{diagnosis.connectionCount}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Active mappings</p>
                <p className="text-lg font-semibold">{diagnosis.activeMappingCount}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Active vaulted credentials</p>
                <p className="text-lg font-semibold">{diagnosis.activeCredentialCount}</p>
              </div>
            </div>

            {blockerCount === 0 ? (
              <p className="flex items-center gap-2 rounded-md border border-border p-3 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                No blockers found: mappings and credentials are in place for every visible connection.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{blockerCount} blocker(s) found.</p>
            )}

            {diagnosis.tenantFindings.length > 0 && (
              <ul className="space-y-2">
                {diagnosis.tenantFindings.map((f) => (
                  <FindingRow key={f.code} finding={f} />
                ))}
              </ul>
            )}

            {diagnosis.connections.map((connection) => (
              <div key={connection.connectionId} className="space-y-2 rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{connection.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {connection.connectorId} · mappings {connection.activeMappingCount}/{connection.mappingCount} active
                      · credentials {connection.activeCredentialCount}/{connection.credentialCount} active
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    {connection.findings.filter((f) => f.severity === 'BLOCKER').length} blockers
                  </Badge>
                </div>
                {connection.findings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No findings: this connection is fully wired.</p>
                ) : (
                  <ul className="space-y-2">
                    {connection.findings.map((f, i) => (
                      <FindingRow key={`${connection.connectionId}-${f.code}-${i}`} finding={f} />
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
