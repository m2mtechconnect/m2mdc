/**
 * Admin-only reference dataset registry and canary control.
 *
 * Shows record totals, source commit, checksum state, licence state, the NGC
 * blocker and the current canary status, and provides activate / rollback.
 * Non-admins never reach the records.
 */
import { useEffect, useMemo } from 'react';
import { useRBAC } from '@/contexts/RBACContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UnavailableState } from '@/components/dataset/UnavailableState';
import { useDataset } from '@/data/dataset/DatasetProvider';
import { DATASET_DESCRIPTORS, PRODUCTION_DEFAULT_DATASET } from '@/data/dataset/datasetRegistry';
import { recordCoverage } from '@/data/dataset/referenceSelectors';
import { readCanaryEvents } from '@/data/dataset/canaryEvents';
import { NGC_DEPENDENT_DATA_CLASSES } from '@/data/dataset/valueClassification';
import {
  CLASSIFIED_FACILITIES,
  DSX_REFERENCE_RECORDS,
  operationalFacilities,
} from '@/data/dsxReference';

export default function DatasetRegistryPage() {
  const { can, loading } = useRBAC();
  const authorized = can('platform.view_admin_console');
  const { mode, canaryActive, setDataset, rollback } = useDataset();
  const coverage = useMemo(() => recordCoverage(), []);
  const events = useMemo(() => readCanaryEvents().slice().reverse(), []);
  const reference = DATASET_DESCRIPTORS['nvidia-dsx-reference'];

  useEffect(() => {
    document.title = 'Reference dataset registry | AURA admin';
  }, []);

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Checking authorization...</p>;
  }

  if (!authorized) {
    return (
      <div className="p-6" data-testid="dataset-registry-forbidden">
        <h1 className="text-lg font-semibold text-foreground">Not authorized</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The NVIDIA DSX reference dataset canary is restricted to platform administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6" data-testid="dataset-registry">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Reference dataset registry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin-only canary. Production default remains{' '}
          <strong>{DATASET_DESCRIPTORS[PRODUCTION_DEFAULT_DATASET].label}</strong>.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Canary status</CardTitle>
          <Badge variant={canaryActive ? 'default' : 'outline'}>
            {canaryActive ? `Active: ${mode}` : 'Inactive (default dataset)'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setDataset('nvidia-dsx-reference')}
              disabled={mode === 'nvidia-dsx-reference'}
              data-testid="activate-reference-canary"
            >
              Activate NVIDIA DSX reference canary
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={rollback}
              disabled={!canaryActive}
              data-testid="deactivate-reference-canary"
            >
              Roll back to default dataset
            </Button>
          </div>
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Dataset id</dt>
            <dd className="text-foreground">{reference.datasetId}</dd>
            <dt className="text-muted-foreground">Dataset version</dt>
            <dd className="text-foreground">{reference.datasetVersion}</dd>
            <dt className="text-muted-foreground">Source commit</dt>
            <dd className="font-mono text-foreground">{reference.sourceCommit}</dd>
            <dt className="text-muted-foreground">Ingested at</dt>
            <dd className="text-foreground">{reference.ingestedAt}</dd>
            <dt className="text-muted-foreground">Checksum state</dt>
            <dd className="text-foreground">
              {DSX_REFERENCE_RECORDS.every((r) => r.source_checksum)
                ? 'All records checksum-verified'
                : 'Incomplete'}
            </dd>
            <dt className="text-muted-foreground">Legal status</dt>
            <dd className="text-foreground">
              Raw NVIDIA source: REQUIRES_LEGAL_REVIEW. Normalized records:
              APPROVED_AUTHENTICATED_DEMO.
            </dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          {Object.entries(coverage).map(([cls, count]) => (
            <div key={cls} className="flex justify-between border-b border-border/60 py-1">
              <span className="text-muted-foreground">{cls}</span>
              <span className="text-foreground">{count}</span>
            </div>
          ))}
          <div className="flex justify-between pt-1 font-medium">
            <span>Total</span>
            <span>{DSX_REFERENCE_RECORDS.length}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Facility classification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          {CLASSIFIED_FACILITIES.map((f) => (
            <div key={f.id} className="flex justify-between border-b border-border/60 py-1">
              <span className="text-foreground">{f.name}</span>
              <Badge variant="outline">{f.facilityClass}</Badge>
            </div>
          ))}
          <p className="pt-2 text-muted-foreground">
            Operational facilities: {operationalFacilities().length}. Reference and derived
            facilities never contribute to operational totals.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">NGC-dependent data classes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {NGC_DEPENDENT_DATA_CLASSES.map((cls) => (
            <UnavailableState key={cls} label={cls} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Canary activation log</CardTitle>
        </CardHeader>
        <CardContent className="text-xs">
          {events.length === 0 ? (
            <p className="text-muted-foreground">No canary events recorded on this device.</p>
          ) : (
            events.map((e, i) => (
              <div key={`${e.at}-${i}`} className="flex justify-between border-b border-border/60 py-1">
                <span className="text-muted-foreground">{e.at}</span>
                <span className="text-foreground">
                  {e.action} - {e.dataset}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
