/**
 * Terminal state for a route whose legacy implementation reads a synthetic
 * fixture the reference dataset cannot supply.
 *
 * The legacy page is deliberately not mounted: showing fixture numbers beneath
 * a reference-data banner would be the exact misrepresentation the canary
 * exists to prevent. This surface names the missing source and offers the
 * one-action rollback.
 */
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataset } from '@/data/dataset/DatasetProvider';
import type { SurfaceEntry } from '@/data/dataset/surfaceRegistry';

export function ReferenceUnavailableSurface({ surface }: { surface: SurfaceEntry }) {
  const { descriptor, rollback } = useDataset();

  return (
    <div
      className="py-6"
      data-testid="reference-unavailable-surface"
      data-surface={surface.path}
    >
      <Card className="max-w-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{surface.title} is unavailable in reference mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <p className="text-foreground">
            This page is not rendered while {descriptor.label} is active, and no value from it is
            shown. Nothing here was substituted, estimated or zero-filled.
          </p>
          <p>
            <span className="font-medium text-foreground">Blocking source: </span>
            {surface.currentSource}
          </p>
          <p>{surface.missingBehaviour}</p>
          <Button size="sm" variant="outline" onClick={rollback} data-testid="unavailable-rollback">
            Return to the production default dataset
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default ReferenceUnavailableSurface;
