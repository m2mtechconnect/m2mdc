import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface HealthStatus {
  healthy: boolean;
  error?: string;
  latency_ms?: number;
  model?: string;
  stage?: string;
}

export function HealthCheckBadge() {
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const { toast } = useToast();

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("url-capture", {
        body: { healthCheck: true },
      });

      if (error) throw error;
      setStatus(data);
      
      if (data.healthy) {
        toast({
          title: "✓ AI Connected",
          description: `Gemini responding in ${data.latency_ms}ms`,
        });
      } else {
        toast({
          title: "AI Not Configured",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Health check failed";
      setStatus({ healthy: false, error: errorMsg });
      toast({
        title: "Health Check Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2">
          {isChecking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status?.healthy ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : status ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : null}
          <span className="text-xs">AI Status</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Gemini AI Health</h4>
            <Button size="sm" onClick={checkHealth} disabled={isChecking}>
              {isChecking ? "Checking..." : "Test Now"}
            </Button>
          </div>

          {status && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={status.healthy ? "default" : "destructive"}>
                  {status.healthy ? "Connected" : "Not Connected"}
                </Badge>
              </div>

              {status.healthy && status.latency_ms && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Latency:</span>
                  <span className="font-mono">{status.latency_ms}ms</span>
                </div>
              )}

              {status.healthy && status.model && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-mono text-xs">{status.model}</span>
                </div>
              )}

              {!status.healthy && status.error && (
                <div className="p-2 bg-destructive/10 rounded text-xs text-destructive">
                  {status.error}
                </div>
              )}

              {!status.healthy && status.stage && (
                <div className="text-xs text-muted-foreground">
                  Failed at stage: <span className="font-mono">{status.stage}</span>
                </div>
              )}
            </div>
          )}

          {!status && (
            <p className="text-sm text-muted-foreground">
              Click "Test Now" to check if Gemini AI is properly configured.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
