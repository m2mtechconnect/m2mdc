import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getBuildFingerprint } from '@/lib/buildFingerprint';

interface PublishedReleaseFingerprint {
  schema: 'aura.release-fingerprint.v1';
  sha: string;
  buildId: string;
}

// Keep the customer-facing release channel stable. Exact stale-bundle detection
// uses the signed build fingerprint below rather than this presentation label.
const PUBLIC_RELEASE_CHANNEL = 'pilot';

function isPublishedReleaseFingerprint(value: unknown): value is PublishedReleaseFingerprint {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PublishedReleaseFingerprint>;
  return candidate.schema === 'aura.release-fingerprint.v1'
    && typeof candidate.sha === 'string'
    && candidate.sha.length > 0
    && typeof candidate.buildId === 'string'
    && candidate.buildId.length > 0;
}

export function BuildVersion() {
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);
  const currentBuild = getBuildFingerprint();

  useEffect(() => {
    let active = true;
    let notified = false;

    const checkPublishedRelease = async () => {
      try {
        const response = await fetch(
          `/release.json?build=${encodeURIComponent(currentBuild.buildId)}&check=${Date.now()}`,
          {
            cache: 'no-store',
            headers: { accept: 'application/json' },
          },
        );
        if (!response.ok) return;
        const published: unknown = await response.json();
        if (!active || !isPublishedReleaseFingerprint(published)) return;

        const stale = published.sha !== currentBuild.commitSha
          || published.buildId !== currentBuild.buildId;
        if (!stale) return;

        setShowRefreshPrompt(true);
        if (!notified) {
          notified = true;
          toast.warning('AURA has been updated', {
            description: 'Reload before changing workspaces to use the current release.',
            action: {
              label: 'Reload',
              onClick: () => window.location.reload(),
            },
            duration: 15000,
          });
        }
      } catch {
        // Release attestation being temporarily unreachable is not evidence
        // that the active bundle is stale. Keep the current page available.
      }
    };

    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') void checkPublishedRelease();
    };

    void checkPublishedRelease();
    const interval = window.setInterval(checkPublishedRelease, 5 * 60 * 1000);
    window.addEventListener('focus', checkPublishedRelease);
    document.addEventListener('visibilitychange', checkWhenVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', checkPublishedRelease);
      document.removeEventListener('visibilitychange', checkWhenVisible);
    };
  }, [currentBuild.buildId, currentBuild.commitSha]);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>v{PUBLIC_RELEASE_CHANNEL}</span>
      {showRefreshPrompt && (
        <button
          onClick={() => window.location.reload()}
          className="ml-2 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition-colors"
        >
          Reload to update
        </button>
      )}
    </div>
  );
}
