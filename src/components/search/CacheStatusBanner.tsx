import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CacheStatusBannerProps {
  domain: string;
  onScanAgain: () => void;
}

interface CacheStatus {
  cached: boolean;
  expired?: boolean;
  pageCount?: number;
  totalWords?: number;
  lastExtracted?: string;
  version?: number;
  expiresAt?: string;
  ttlHours?: number;
}

export function CacheStatusBanner({ domain, onScanAgain }: CacheStatusBannerProps) {
  const [status, setStatus] = useState<CacheStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const checkCacheStatus = async () => {
    // Validate domain format before making API call
    if (!domain || /^\d{4}-\d{2}-\d{2}T/.test(domain)) {
      console.error('[CacheStatusBanner] Invalid domain format:', domain);
      setStatus({ cached: false });
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("website-cache-status", {
        body: { domain },
      });

      if (error) throw error;

      if (data?.error) {
        console.error("Cache status error:", data.error);
        setStatus({ cached: false });
        return;
      }

      setStatus(data);
    } catch (error) {
      console.error("Error checking cache status:", error);
      setStatus({ cached: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      const { data, error } = await supabase.functions.invoke("website-cache-clear", {
        body: { domain },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Cache cleared",
        description: `Removed ${data.deletedCount} cached pages. Ready for fresh scan.`,
      });

      // Trigger scan again
      onScanAgain();
    } catch (error) {
      console.error("Error clearing cache:", error);
      toast({
        title: "Failed to clear cache",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    if (domain) {
      checkCacheStatus();
    }
  }, [domain]);

  if (isLoading) {
    return (
      <Card className="p-4 bg-muted/30 border-muted">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking cache status...</span>
        </div>
      </Card>
    );
  }

  if (!status || !status.cached) {
    return null;
  }

  const isExpired = status.expired;
  const lastExtracted = status.lastExtracted ? new Date(status.lastExtracted) : null;

  return (
    <Card className={`p-4 ${isExpired ? 'bg-warning/10 border-warning/30' : 'bg-success/10 border-success/30'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {isExpired ? (
              <AlertCircle className="h-5 w-5 text-warning" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-success" />
            )}
            <h4 className="text-sm font-display font-semibold">
              {isExpired ? "Cached Data Available (Expired)" : "Cached Website Data"}
            </h4>
            <Badge variant={isExpired ? "outline" : "secondary"} className="gap-1">
              <Clock className="h-3 w-3" />
              v{status.version}
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              ✓ {status.pageCount} pages cached • {status.totalWords?.toLocaleString()} words extracted
            </p>
            {lastExtracted && (
              <p>
                Last captured: {lastExtracted.toLocaleDateString()} at {lastExtracted.toLocaleTimeString()}
                {status.expiresAt && !isExpired && (
                  <span> • Expires: {new Date(status.expiresAt).toLocaleDateString()}</span>
                )}
              </p>
            )}
            <p className="text-xs opacity-80">
              {isExpired 
                ? "⚠ Cache has expired. Click 'Scan Again' to refresh website data."
                : "Your website data is stored securely and reused for future AI recommendations."
              }
            </p>
          </div>
        </div>

        <Button
          variant={isExpired ? "default" : "outline"}
          size="sm"
          onClick={handleClearCache}
          disabled={isClearing}
          className="shrink-0"
        >
          {isClearing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Clearing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Scan Again
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
