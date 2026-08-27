import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useActiveTwin } from '@/context/ActiveTwinContext';

/**
 * Resolves the canonical Blueprint entry point from authenticated facility
 * context. A missing facility is an explicit setup state; no sentinel ID is
 * passed into data hooks.
 */
export default function ActiveBlueprintResolver() {
  const { activeTwinId, isInitialized, isLoading } = useActiveTwin();

  if (!isInitialized || isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground" role="status" aria-live="polite">
        Resolving the current facility…
      </div>
    );
  }

  if (activeTwinId) {
    return <Navigate to={`/blueprint/${activeTwinId}`} replace />;
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4 p-6" aria-labelledby="blueprint-facility-required">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 id="blueprint-facility-required" className="text-xl font-semibold">
          Select a facility before opening Blueprint
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Blueprint is always tied to a facility in your active organization. Select an existing facility or create one to continue.
        </p>
        <Button asChild className="mt-4">
          <a href="/manage/facilities">Open Facilities</a>
        </Button>
      </div>
    </section>
  );
}
