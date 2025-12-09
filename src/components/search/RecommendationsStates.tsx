import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw, Search, Globe, FileText } from "lucide-react";
import { TelemetryBadge } from "./TelemetryBadge";
import type { CaptureResult } from "@/hooks/useRecommendations";

export function LoadingState({ domain, mode }: { domain?: string; mode?: 'normal' | 'force' }) {
  const message = mode === 'force' 
    ? `Force crawling ${domain || 'website'}...` 
    : `Analyzing ${domain || 'website'}...`;

  return (
    <div className="w-full max-w-6xl mx-auto mt-8 space-y-4">
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <p className="text-muted-foreground">{message}</p>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="py-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  message?: string;
  onRetry: () => void;
  onForce: () => void;
  onForceIngest: () => void;
  onDifferentUrl: () => void;
  onDiagnostics: () => void;
  onManualInput?: () => void;
  captureResults?: CaptureResult[];
  telemetry?: {
    crawl_pages_found?: number;
    force_ingest_pages_found?: number;
    context_chars: number;
    gemini_ok: boolean;
    gemini_error?: string;
    returned_items_count: number;
  };
}

export function EmptyState({ message, onRetry, onForce, onForceIngest, onDifferentUrl, onDiagnostics, onManualInput, captureResults, telemetry }: EmptyStateProps) {
  const successCount = captureResults?.filter(r => r.status === 'success').length ?? 0;
  const failedCount = captureResults?.filter(r => r.status === 'failed').length ?? 0;
  const totalWords = captureResults?.reduce((sum, r) => sum + (r.wordCount || 0), 0) ?? 0;
  
  // Determine the issue
  const hasCaptures = successCount > 0;
  const hasSufficientContent = totalWords > 500;
  
  let issueMessage = message || "We couldn't extract enough content from this site to generate recommendations.";
  
  if (hasCaptures && !hasSufficientContent) {
    issueMessage = "The pages captured contained mostly navigation and generic content. The AI needs detailed information about products, services, or business operations to generate recommendations.";
  } else if (hasCaptures && telemetry?.gemini_ok) {
    issueMessage = "While pages were captured successfully, the AI couldn't identify specific opportunities based on the available content. Try a different URL with more detailed business information.";
  }
  
  return (
    <Card className="w-full max-w-4xl mx-auto mt-8">
      <CardContent className="py-12 text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-3">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">No Recommendations Available</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {issueMessage}
          </p>
          <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-sm text-left max-w-md mx-auto">
            <p className="font-medium mb-2 text-blue-900 dark:text-blue-100">💡 Try these options:</p>
            <ul className="text-xs space-y-1 text-blue-800 dark:text-blue-200">
              <li><strong>Force Recrawl:</strong> Bypass cache and re-scan the site</li>
              <li><strong>Deep Recrawl:</strong> Capture more pages with aggressive strategies</li>
            </ul>
          </div>
          {captureResults && captureResults.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-muted/30 text-sm">
              <p className="font-medium mb-3">Capture Summary:</p>
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-green-600 dark:text-green-400">
                    ✓ {successCount} pages captured
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {totalWords} words extracted
                  </span>
                </div>
                {failedCount > 0 && (
                  <span className="text-destructive">
                    ✗ {failedCount} pages failed
                  </span>
                )}
                {!hasSufficientContent && (
                  <div className="mt-2 text-yellow-600 dark:text-yellow-400">
                    ⚠ Content too thin - try a different URL or force recrawl
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="mt-4">
            <Button 
              onClick={onDiagnostics}
              variant="outline" 
              size="sm"
              className="text-xs"
            >
              <AlertCircle className="mr-2 h-3 w-3" />
              Run Diagnostics
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={onRetry} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button onClick={onForce} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Force Recrawl
          </Button>
          <Button onClick={onForceIngest} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Deep Recrawl
          </Button>
          {onManualInput && (
            <Button onClick={onManualInput} variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Paste Content
            </Button>
          )}
          <Button onClick={onDifferentUrl} variant="ghost">
            Try Different URL
          </Button>
        </div>
        <TelemetryBadge telemetry={telemetry} />
      </CardContent>
    </Card>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
  onForce?: () => void;
  onForceIngest?: () => void;
  onDifferentUrl: () => void;
  onDiagnostics: () => void;
  onManualInput?: () => void;
}

export function ErrorState({ message, onRetry, onForce, onForceIngest, onDifferentUrl, onDiagnostics, onManualInput }: ErrorStateProps) {
  const isSSLError = message?.toLowerCase().includes('certificate') || 
                     message?.toLowerCase().includes('ssl') || 
                     message?.toLowerCase().includes('tls') ||
                     message?.toLowerCase().includes('unknownissuer');
  
  return (
    <Card className="w-full max-w-4xl mx-auto mt-8 border-destructive/50">
      <CardContent className="py-12 text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Something Went Wrong</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {message || 'An unexpected error occurred while generating recommendations.'}
          </p>
          {isSSLError && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
              ⚠ SSL Certificate Issue Detected - The site's security certificate cannot be verified. 
              This could be a temporary issue or the site may have an invalid certificate. 
              Try again later or use a different URL.
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={onRetry} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
          {onForce && (
            <Button onClick={onForce} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Force Recrawl
            </Button>
          )}
          {onForceIngest && !isSSLError && (
            <Button onClick={onForceIngest} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Deep Recrawl
            </Button>
          )}
          <Button onClick={onDiagnostics} variant="outline">
            <AlertCircle className="mr-2 h-4 w-4" />
            Run Diagnostics
          </Button>
          {onManualInput && (
            <Button onClick={onManualInput} variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Paste Content
            </Button>
          )}
          <Button onClick={onDifferentUrl} variant="outline">
            Try Different URL
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}