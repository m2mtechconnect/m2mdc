import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Database, FileText, Sparkles } from "lucide-react";

interface TelemetryBadgeProps {
  telemetry?: {
    crawl_pages_found?: number;
    force_ingest_pages_found?: number;
    context_chars: number;
    gemini_ok: boolean;
    gemini_error?: string;
    returned_items_count: number;
  };
}

export function TelemetryBadge({ telemetry }: TelemetryBadgeProps) {
  if (!telemetry) return null;

  // Only show in development or preview
  if (import.meta.env.PROD) return null;

  return (
    <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Database className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">Debug Telemetry</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        {telemetry.crawl_pages_found !== undefined && (
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3 text-primary" />
            <span>Crawl: {telemetry.crawl_pages_found} pages</span>
          </div>
        )}
        
        {telemetry.force_ingest_pages_found !== undefined && (
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3 text-secondary" />
            <span>Ingest: {telemetry.force_ingest_pages_found} pages</span>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <FileText className="h-3 w-3 text-muted-foreground" />
          <span>Context: {(telemetry.context_chars / 1000).toFixed(1)}k chars</span>
        </div>
        
        <div className="flex items-center gap-1">
          {telemetry.gemini_ok ? (
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          ) : (
            <AlertCircle className="h-3 w-3 text-destructive" />
          )}
          <span>AI: {telemetry.gemini_ok ? 'OK' : 'Failed'}</span>
        </div>
        
        {telemetry.gemini_error && (
          <div className="col-span-2 flex items-start gap-1 text-destructive">
            <AlertCircle className="h-3 w-3 mt-0.5" />
            <span className="text-xs">{telemetry.gemini_error}</span>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>Generated: {telemetry.returned_items_count} items</span>
        </div>
      </div>
    </div>
  );
}
