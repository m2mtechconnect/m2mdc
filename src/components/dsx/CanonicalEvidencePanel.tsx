/**
 * Phase 3 - production evidence surface.
 *
 * This panel queries authorized persisted runs (`simulation_runs`) and renders
 * the canonical evidence record. It never reads a fixture. When no persisted
 * run is visible it shows an honest empty state instead of demonstration data.
 *
 * Every export is serialized from the exact record rendered here, so displayed
 * evidence and exported evidence resolve from the same object.
 */
import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import { useCanonicalRunStore, selectActiveCanonicalRun } from '@/truth/canonicalRunStore';
import {
  EVIDENCE_EMPTY_STATE,
  buildCanonicalEvidenceRecord,
  displayValue,
  evidenceToCsv,
  evidenceToHtml,
  evidenceToJson,
} from '@/truth/canonicalEvidence';
import { verificationLabel } from '@/truth/canonicalRun';

function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function CanonicalEvidencePanel({
  twinId,
  ownerKey,
}: {
  twinId?: string | null;
  ownerKey?: string | null;
}) {
  const hydrate = useCanonicalRunStore((s) => s.hydrate);
  const loading = useCanonicalRunStore((s) => s.loading);
  const error = useCanonicalRunStore((s) => s.error);
  const run = useCanonicalRunStore(selectActiveCanonicalRun);

  useEffect(() => {
    void hydrate(ownerKey ?? null, twinId ?? null);
  }, [hydrate, ownerKey, twinId]);

  const record = useMemo(() => buildCanonicalEvidenceRecord(run), [run]);

  return (
    <Card data-testid="canonical-evidence-panel">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-sm">Production evidence</CardTitle>
          {run && (
            <Badge variant="secondary" className="text-[11px]">
              {verificationLabel(run)}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Read from persisted run records. Demonstration fixtures never appear here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-xs text-muted-foreground">Reading persisted run records…</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {!loading && !run && (
          <p className="text-xs text-muted-foreground" data-testid="canonical-evidence-empty">
            {EVIDENCE_EMPTY_STATE}
          </p>
        )}
        {run && (
          <>
            <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {record.fields.map((field) => (
                <div key={field.key} className="flex justify-between gap-3 border-b border-border/50 py-1">
                  <dt className="text-[11px] text-muted-foreground">{field.label}</dt>
                  <dd
                    className="truncate font-mono text-[11px]"
                    data-field={field.key}
                    title={displayValue(field)}
                  >
                    {displayValue(field)}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={() =>
                  download(evidenceToCsv(record), `aura-evidence-${record.runId}.csv`, 'text/csv')
                }
              >
                <Download className="h-3 w-3" aria-hidden="true" />
                CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={() =>
                  download(
                    evidenceToJson(record),
                    `aura-evidence-${record.runId}.json`,
                    'application/json',
                  )
                }
              >
                <Download className="h-3 w-3" aria-hidden="true" />
                JSON
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={() =>
                  download(
                    evidenceToHtml(record),
                    `aura-evidence-${record.runId}.html`,
                    'text/html',
                  )
                }
              >
                <Download className="h-3 w-3" aria-hidden="true" />
                HTML / print
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Evidence schema {record.evidenceSchemaVersion}. Every export carries run id{' '}
              <span className="font-mono">{record.runId}</span>.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}