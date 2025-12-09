import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useBuilderSelectionStore } from '@/stores/builderSelectionStore';

export function VersionUpgradeBanner() {
  const { isUpgradeAvailable, availableVersion, selection } = useBuilderSelectionStore();
  const [dismissed, setDismissed] = useState(false);

  if (!isUpgradeAvailable || dismissed) return null;

  const currentVersion = selection?.itemVersion || 'current';
  const newVersion = availableVersion || 'latest';

  return (
    <Alert className="border-primary/50 bg-primary/5">
      <ArrowUpCircle className="h-4 w-4 text-primary" />
      <div className="flex items-start justify-between flex-1">
        <div>
          <AlertTitle className="flex items-center gap-2">
            New Version Available
            <Badge variant="outline" className="text-xs">
              {currentVersion} → {newVersion}
            </Badge>
          </AlertTitle>
          <AlertDescription className="mt-2">
            A newer version of this item is available. Review the changes before upgrading to ensure compatibility.
          </AlertDescription>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="default">
              Compare & Apply
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>
              Keep Current
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
