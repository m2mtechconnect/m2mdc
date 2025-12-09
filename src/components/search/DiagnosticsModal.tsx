import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/hooks/useEdgeFunction";
import { toast } from "sonner";

interface DiagnosticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DiagnosticReport {
  ok: boolean;
  timestamp: string;
  checks: {
    env?: Record<string, boolean | string>;
    origin?: {
      host: string;
      origin: string;
      userAgent: string;
    };
    db_sites?: {
      ok: boolean;
      rowFound: boolean;
      error?: string;
    };
    db_pages?: {
      ok: boolean;
      rowFound: boolean;
      error?: string;
    };
    db_recommendations?: {
      ok: boolean;
      rowFound: boolean;
      error?: string;
    };
    ai?: {
      ok: boolean;
      model?: string;
      latency?: number;
      error?: string;
      details?: string;
      parsed?: any;
    };
    functions?: {
      current: string;
      related: string[];
    };
  };
  summary?: {
    allChecksPass: boolean;
    failedChecks: string[];
    recommendations: string;
  };
  error?: string;
}

export function DiagnosticsModal({ open, onOpenChange }: DiagnosticsModalProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setReport(null);

    try {
      const data = await invokeEdgeFunction('reco-selftest');

      setReport(data as DiagnosticReport);
      
      if (data?.ok) {
        toast.success('All diagnostics passed!');
      } else {
        toast.warning('Some diagnostics failed - see details below');
      }
    } catch (e: any) {
      toast.error('Failed to run diagnostics: ' + e?.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (ok: boolean) => {
    if (ok) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  const getStatusBadge = (ok: boolean) => {
    if (ok) return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Pass</Badge>;
    return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Fail</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Recommendations Diagnostics
          </DialogTitle>
          <DialogDescription>
            Run comprehensive checks to diagnose why recommendations might not be working
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button 
            onClick={runDiagnostics} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running diagnostics...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Diagnostics
              </>
            )}
          </Button>

          {report && (
            <>
              {/* Overall Status */}
              <Card className={report.ok ? 'border-green-500/50' : 'border-destructive/50'}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(report.ok)}
                    Overall Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">
                      {report.summary?.recommendations || 'Diagnostics completed'}
                    </p>
                    {report.summary?.failedChecks && report.summary.failedChecks.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-destructive">Failed Checks:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                          {report.summary.failedChecks.map((check) => (
                            <li key={check}>{check.replace('_', ' ')}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Timestamp: {new Date(report.timestamp).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Environment Variables */}
              {report.checks.env && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Environment Variables</CardTitle>
                      {getStatusBadge(!Object.values(report.checks.env).includes(false))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(report.checks.env).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <code className="text-xs bg-muted px-2 py-1 rounded">{key}</code>
                          {typeof value === 'boolean' ? getStatusIcon(value) : (
                            <span className="text-xs text-destructive">{value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Database Checks */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Database Connectivity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {report.checks.db_sites && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Sites Table</span>
                        {getStatusBadge(report.checks.db_sites.ok)}
                      </div>
                      {report.checks.db_sites.error && (
                        <p className="text-xs text-destructive">{report.checks.db_sites.error}</p>
                      )}
                      {report.checks.db_sites.ok && (
                        <p className="text-xs text-muted-foreground">
                          {report.checks.db_sites.rowFound ? 'Data found' : 'No data yet (empty table)'}
                        </p>
                      )}
                    </div>
                  )}

                  {report.checks.db_pages && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Site Pages Table</span>
                        {getStatusBadge(report.checks.db_pages.ok)}
                      </div>
                      {report.checks.db_pages.error && (
                        <p className="text-xs text-destructive">{report.checks.db_pages.error}</p>
                      )}
                      {report.checks.db_pages.ok && (
                        <p className="text-xs text-muted-foreground">
                          {report.checks.db_pages.rowFound ? 'Data found' : 'No pages crawled yet'}
                        </p>
                      )}
                    </div>
                  )}

                  {report.checks.db_recommendations && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Recommendations Table</span>
                        {getStatusBadge(report.checks.db_recommendations.ok)}
                      </div>
                      {report.checks.db_recommendations.error && (
                        <p className="text-xs text-destructive">{report.checks.db_recommendations.error}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Gateway Check */}
              {report.checks.ai && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Lovable AI Gateway</CardTitle>
                      {getStatusBadge(report.checks.ai.ok)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {report.checks.ai.model && (
                        <div className="flex items-center justify-between text-sm">
                          <span>Model:</span>
                          <code className="text-xs">{report.checks.ai.model}</code>
                        </div>
                      )}
                      {report.checks.ai.latency && (
                        <div className="flex items-center justify-between text-sm">
                          <span>Latency:</span>
                          <span className="text-xs">{report.checks.ai.latency}ms</span>
                        </div>
                      )}
                      {report.checks.ai.error && (
                        <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/30">
                          <p className="text-xs text-destructive">{report.checks.ai.error}</p>
                          {report.checks.ai.details && (
                            <p className="text-xs text-muted-foreground mt-1">{report.checks.ai.details}</p>
                          )}
                        </div>
                      )}
                      {report.checks.ai.parsed && (
                        <div className="mt-2 p-2 rounded bg-muted">
                          <p className="text-xs font-medium mb-1">AI Response:</p>
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(report.checks.ai.parsed, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Edge Functions */}
              {report.checks.functions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Edge Functions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Current Function:</span>
                        <code className="text-xs">{report.checks.functions.current}</code>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Related Functions:</p>
                        <div className="flex flex-wrap gap-2">
                          {report.checks.functions.related.map((func) => (
                            <Badge key={func} variant="outline">{func}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error Details */}
              {report.error && (
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-base text-destructive">Error Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-destructive">{report.error}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
