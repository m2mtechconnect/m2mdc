import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Globe, Sparkles } from "lucide-react";

interface CaptureResult {
  url: string;
  status: 'success' | 'failed' | 'pending' | 'low_content' | 'cached';
  wordCount?: number;
  chunkCount?: number;
  summary?: string;
  error?: string;
}

interface SiteCaptureProgressProps {
  domain: string;
  pages: CaptureResult[];
  currentPage: number;
  totalPages: number;
  phase?: 'discovering' | 'capturing' | 'analyzing' | 'complete';
  stats?: {
    discovered: number;
    captured: number;
    analyzed: number;
  };
  message?: string;
  onViewData?: () => void;
  onViewSnippets?: (url: string) => void;
}

export function SiteCaptureProgressCard({ 
  domain, 
  pages, 
  currentPage, 
  totalPages, 
  phase = 'capturing',
  stats,
  message,
  onViewData,
  onViewSnippets
}: SiteCaptureProgressProps) {
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  const successCount = pages.filter(p => p.status === 'success' || p.status === 'cached').length;
  const lowContentCount = pages.filter(p => p.status === 'low_content').length;
  const cachedCount = pages.filter(p => p.status === 'cached').length;
  const failedCount = pages.filter(p => p.status === 'failed').length;
  const isComplete = phase === 'complete';
  
  // Show scanning state when we're discovering or when we have activity but totalPages is 0
  const isScanning = phase === 'discovering' || (totalPages === 0 && (stats?.discovered || 0) > 0);
  const displayProgress = isScanning ? 0 : progress;

  const getPageTitle = (url: string) => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      if (path === '/' || path === '') return 'Homepage';
      if (path.includes('about')) return 'About Page';
      if (path.includes('contact')) return 'Contact';
      if (path.includes('services')) return 'Services';
      if (path.includes('products')) return 'Products';
      
      return path.split('/').filter(Boolean).pop()?.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()) || 'Page';
    } catch {
      return 'Page';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto mt-8 border-2 rounded-2xl bg-gradient-to-br from-background via-background to-primary/5 shadow-xl animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 animate-pulse">
            <Globe className="h-6 w-6 text-primary animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              🌐 Capturing Website Content
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gathering pages from <span className="font-semibold text-foreground">{domain}</span> safely and securely…
            </p>
          </div>
          {!isComplete && (
            <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold">
              {isScanning ? 'Scanning...' : `${Math.round(displayProgress)}% Complete`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reassuring Message */}
        <div className="px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Turbo-charged capture with parallel processing and AI analysis
          </p>
        </div>

        {/* Multi-Phase Progress */}
        <div className="space-y-4">
          {/* Phase Indicators */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-3 rounded-lg border ${phase === 'discovering' || phase === 'capturing' || phase === 'analyzing' || phase === 'complete' ? 'bg-primary/10 border-primary/30' : 'bg-muted/50 border-border'}`}>
              <div className="flex items-center gap-2 mb-1">
                {phase === 'discovering' ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                <span className="text-xs font-semibold">Discovered</span>
              </div>
              <p className="text-lg font-bold text-foreground">{stats?.discovered || totalPages}</p>
            </div>

            <div className={`p-3 rounded-lg border ${phase === 'capturing' || phase === 'analyzing' || phase === 'complete' ? 'bg-primary/10 border-primary/30' : 'bg-muted/50 border-border'}`}>
              <div className="flex items-center gap-2 mb-1">
                {phase === 'capturing' ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : phase === 'analyzing' || phase === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="h-4 w-4" />
                )}
                <span className="text-xs font-semibold">Captured</span>
              </div>
              <p className="text-lg font-bold text-foreground">{stats?.captured || successCount}</p>
            </div>

            <div className={`p-3 rounded-lg border ${phase === 'analyzing' || phase === 'complete' ? 'bg-primary/10 border-primary/30' : 'bg-muted/50 border-border'}`}>
              <div className="flex items-center gap-2 mb-1">
                {phase === 'analyzing' ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : phase === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="h-4 w-4" />
                )}
                <span className="text-xs font-semibold">Analyzed</span>
              </div>
              <p className="text-lg font-bold text-foreground">{stats?.analyzed || 0}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-foreground capitalize">
                {phase === 'complete' ? 'Complete' : isScanning ? 'Scanning...' : `${phase}...`}
              </span>
              <span className="text-muted-foreground font-medium">
                {isScanning ? '—' : `${Math.round(displayProgress)}%`}
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={displayProgress} 
                className="h-3 bg-muted/50 shadow-inner"
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 via-primary/10 to-transparent pointer-events-none animate-pulse" />
            </div>
            <div className="flex gap-4 text-xs font-medium flex-wrap">
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                {successCount} Captured
              </span>
              {cachedCount > 0 && (
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Sparkles className="h-4 w-4" />
                  {cachedCount} Cached
                </span>
              )}
              {lowContentCount > 0 && (
                <span className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {lowContentCount} Low Content
                </span>
              )}
              {failedCount > 0 && (
                <span className="flex items-center gap-1.5 text-destructive">
                  <XCircle className="h-4 w-4" />
                  {failedCount} Failed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Page Status List */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          {pages.map((page, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:bg-accent/30 transition-all duration-200 animate-fade-in"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {page.status === 'success' && (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              )}
              {page.status === 'low_content' && (
                <CheckCircle2 className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              )}
              {page.status === 'cached' && (
                <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              )}
              {page.status === 'failed' && (
                <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              )}
              {page.status === 'pending' && (
                <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0 mt-0.5" />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground">
                    {getPageTitle(page.url)}
                  </p>
                  {page.status === 'pending' && (
                    <Badge variant="outline" className="text-xs">
                      Fetching...
                    </Badge>
                  )}
                  {page.status === 'cached' && (
                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                      ✓ Cached
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mb-1" title={page.url}>
                  {page.url}
                </p>
                {(page.status === 'success' || page.status === 'cached') && page.wordCount && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-medium text-primary">
                      {page.wordCount.toLocaleString()} words
                    </span>
                    {page.chunkCount && (
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {page.chunkCount} chunks
                      </span>
                    )}
                    {page.summary && (
                      <span className="text-muted-foreground italic">
                        {page.summary.slice(0, 100)}...
                      </span>
                    )}
                  </div>
                )}
                {page.status === 'low_content' && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                    Low content — skipped ({page.wordCount || 0} words)
                  </p>
                )}
                {page.status === 'failed' && page.error && (
                  <p className="text-xs text-destructive font-medium">
                    {page.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Completion State */}
        {isComplete && successCount > 0 && (
          <div className="pt-4 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-muted-foreground">
                  {message || 'Analyzing captured content with AI...'}
                </span>
              </div>
              {onViewData && (
                <Button 
                  onClick={onViewData}
                  size="sm"
                  variant="default"
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  View Captured Data
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Complete Celebration */}
        {isComplete && successCount === totalPages && (
          <div className="px-4 py-4 rounded-xl bg-gradient-to-r from-green-500/10 to-primary/10 border-2 border-green-500/30 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/20">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">🎉 Capture Complete!</h4>
                <p className="text-sm text-muted-foreground">
                  All {totalPages} pages have been processed successfully
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
