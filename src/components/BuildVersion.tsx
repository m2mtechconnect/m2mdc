import { useEffect, useState } from "react";
import { toast } from "sonner";

const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION || "dev";
const BUILD_TIMESTAMP = import.meta.env.VITE_BUILD_TIMESTAMP || new Date().toISOString();

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
