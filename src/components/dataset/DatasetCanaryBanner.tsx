/**
 * The single authoritative canary-identification treatment.
 *
 * Owned by the authenticated application shell, so no page component has to
 * remember to add it. It is sticky (the audit found the label scrolled out of
 * view on 15 of 17 sampled routes), it is compact so it never covers page
 * controls or the 3D canvas, and it announces the dataset change exactly once
 * per activation rather than on every rerender.
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDataset } from '@/data/dataset/DatasetProvider';

/** Guards against a duplicate label when nested layouts both render the shell. */
let mountedInstances = 0;
export function DatasetCanaryBanner() {
  const { canaryActive, descriptor, rollback, reason, mode } = useDataset();
  const [isPrimary, setIsPrimary] = useState(false);
  const announced = useRef<string | null>(null);

  useEffect(() => {
    mountedInstances += 1;
    const primary = mountedInstances === 1;
    setIsPrimary(primary);
    return () => {
      mountedInstances -= 1;
    };
  }, []);

  // Announce once per activation, not on every rerender.
  const shouldAnnounce = canaryActive && announced.current !== mode;
  useEffect(() => {
    if (canaryActive) announced.current = mode;
    else announced.current = null;
  }, [canaryActive, mode]);

  if (!canaryActive || !isPrimary) return null;

  return (
    <div
      className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-accent/15 px-4 py-1.5 text-xs text-accent-foreground"
      data-testid="dataset-canary-banner"
      data-dataset={mode}
      role="status"
      aria-live={shouldAnnounce ? 'polite' : 'off'}
    >
      <span className="min-w-0">
        <strong className="font-semibold" data-testid="dataset-canary-label">
          {descriptor.label}
        </strong>{' '}
        <span className="text-[12px]">
          Administrator-only canary. Official-source normalized reference data, read-only. Not
          commissioned, not connected, not operational telemetry, not an NVIDIA DSX runtime service,
          not SimReady validation. NGC-dependent fields remain unavailable. The production default
          is unchanged. {descriptor.licenceStatement}
          {reason === 'unauthorized-fallback' ? ' Requested dataset was denied.' : ''}
        </span>
      </span>
      <Button
        size="sm"
        variant="outline"
        className="min-h-6 shrink-0"
        onClick={rollback}
        data-testid="dataset-rollback"
      >
        Return to default dataset
      </Button>
    </div>
  );
}

export default DatasetCanaryBanner;