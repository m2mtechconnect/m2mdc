import { useEffect, useState } from "react";
import { toast } from "sonner";

// PR-0.1 Checkpoint B7: `VITE_BUILD_VERSION` / `VITE_BUILD_TIMESTAMP` are not
// part of the approved public-variable allowlist. The version stamp is now a
// constant produced at check-in time; a future release-tag pipeline may
// substitute it via a code-mod, but no `import.meta.env` read is permitted.
const BUILD_VERSION = "pilot";
const BUILD_TIMESTAMP = "1970-01-01T00:00:00.000Z";

export function BuildVersion() {
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);

  useEffect(() => {
    // Check for version mismatch on mount
    const storedVersion = localStorage.getItem("app_version");
    
    if (storedVersion && storedVersion !== BUILD_VERSION) {
      console.warn("Version mismatch detected:", { stored: storedVersion, current: BUILD_VERSION });
      setShowRefreshPrompt(true);
      
      toast.warning("New version available", {
        description: "Please refresh to get the latest updates",
        action: {
          label: "Refresh",
          onClick: () => window.location.reload()
        },
        duration: 10000
      });
    }
    
    // Store current version
    localStorage.setItem("app_version", BUILD_VERSION);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>v{BUILD_VERSION}</span>
      <span className="opacity-50">•</span>
      <span className="hidden sm:inline">
        {new Date(BUILD_TIMESTAMP).toLocaleDateString()}
      </span>
      {showRefreshPrompt && (
        <button
          onClick={() => window.location.reload()}
          className="ml-2 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition-colors"
        >
          Update Available
        </button>
      )}
    </div>
  );
}
