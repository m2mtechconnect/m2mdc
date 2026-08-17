import { Badge } from '@/components/ui/badge';
import type { WorkspaceRun } from './scenarioEngine';

/**
 * States where a run record lives, stated honestly.
 *
 * `local-legacy` runs predate durable persistence: they exist in one browser
 * profile only and must never be presented as operational records.
 */
export function RunProvenanceBadge({ run }: { run: WorkspaceRun }) {
  if (run.persistence === 'fixture') {
    return (
      <Badge variant="outline" className="h-4 px-1 text-[10px]">
        Demonstration fixture
      </Badge>
    );
  }
  if (run.persistence === 'server' || run.serverId) {
    return (
      <Badge variant="outline" className="h-4 px-1 text-[10px]">
        Saved record - client-computed
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="h-4 px-1 text-[10px]">
      Legacy browser-only simulation - not a durable operational record
    </Badge>
  );
}
