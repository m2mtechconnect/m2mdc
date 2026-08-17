/**
 * Persistent, honest banner shown while a non-default dataset is in effect.
 * Provides the one-action rollback to the production default.
 */
import { Button } from '@/components/ui/button';
import { useDataset } from '@/data/dataset/DatasetProvider';

export function DatasetCanaryBanner() {
  const { canaryActive, descriptor, rollback, reason } = useDataset();
  if (!canaryActive) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-accent/15 px-4 py-2 text-xs text-accent-foreground"
      data-testid="dataset-canary-banner"
      role="status"
    >
      <span>
        <strong className="font-semibold">{descriptor.label}</strong> - administrator-only canary.
        Official-source normalized reference data, read-only. Not operational telemetry, not
        commissioned, not an NVIDIA DSX runtime service, not SimReady validation. NGC-dependent
        fields remain unavailable. Production default is unchanged.{' '}
        {descriptor.licenceStatement}
        {reason === 'unauthorized-fallback' ? ' Requested dataset was denied.' : ''}
      </span>
      <Button size="sm" variant="outline" onClick={rollback} data-testid="dataset-rollback">
        Return to default dataset
      </Button>
    </div>
  );
}

export default DatasetCanaryBanner;
