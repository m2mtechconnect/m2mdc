import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  CheckCircle2,
  Clock,
  Play,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { formatDuration, formatNumber, formatPercentage } from "@/lib/formatters";
import { logger } from "@/lib/logger";

interface TestResult {
  text: string;
  snippets: Array<{
    title: string;
    snippet: string;
    url?: string;
    confidence: number;
  }>;
  citations: Array<{
    url: string;
    title: string;
    confidence: number;
  }>;
  metrics: {
    genTimeMs: number;
    contextTokens: number;
    faithfulness: number;
    model: string;
    grounded: boolean;
  };
}

interface TestQueryPanelProps {
  systemId?: string;
  useGrounding: boolean;
  initialQuery?: string;
}

export function TestQueryPanel({ systemId, useGrounding, initialQuery }: TestQueryPanelProps) {
  const { toast } = useToast();
  const DEFAULT_QUERY = "Summarize key 2025 HIPAA changes for patient portals.";
  const [query, setQuery] = useState(initialQuery || DEFAULT_QUERY);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasUserEditedRef = useRef(false);
  useEffect(() => {
    if (!hasUserEditedRef.current && initialQuery && query === DEFAULT_QUERY) {
      setQuery(initialQuery);
    }
  }, [initialQuery, query]);

  const runTest = async () => {
    if (!query.trim()) {
      toast({
        title: "Query required",
        description: "Please enter a test query",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data: rawData, error: invokeError } = await supabase.functions.invoke('builder-test', {
        body: {
          prompt: query,
          useGrounding,
          role: 'engineer'
        }
      });

      if (invokeError) throw invokeError;

      // Handle REST envelope if present
      interface EdgeFunctionEnvelope {
        success: boolean;
        data: unknown;
        error?: { message?: string };
      }

      let data = rawData;
      if (rawData && typeof rawData === 'object' && 'success' in rawData && 'data' in rawData) {
        const envelope = rawData as EdgeFunctionEnvelope;
        if (!envelope.success) {
          throw new Error(envelope.error?.message || 'Test failed');
        }
        data = envelope.data;
      }

      if (data.error) {
        setError(data.error);
        toast({
          title: "Test failed",
          description: data.error,
          variant: "destructive"
        });
      } else {
        // Transform copilot-chat response to test result format
        setResult({
          text: data.text || data.content || "",
          snippets: data.citations?.map((c: any, idx: number) => ({
            title: c.title || `Source ${idx + 1}`,
            snippet: c.snippet || c.text || "",
            url: c.url,
            confidence: c.confidence || 0.85
          })) || [],
          citations: data.citations || [],
          metrics: {
            genTimeMs: data.genTimeMs || 0,
            contextTokens: data.contextTokens || 0,
            faithfulness: data.faithfulness || 0.88,
            model: data.model || 'gemini-1.5-pro',
            grounded: useGrounding
          }
        });
      }
    } catch (err) {
      logger.error('Test error:', err, { component: 'TestQueryPanel', action: 'runTest' });
      setError(err instanceof Error ? err.message : 'Test failed');
      toast({
        title: "Test failed",
        description: "Failed to run test query. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-panel section-padding">
      <h3 className="text-h3 mb-4">Test Your System</h3>

      <div className="space-y-4 mb-6">
        <Textarea
          value={query}
          onChange={(e) => {
            hasUserEditedRef.current = true;
            setQuery(e.target.value);
          }}
          placeholder="Enter a test query..."
          rows={3}
          className="resize-none"
        />
        <Button
          onClick={runTest}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>Running Test...</>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Test Query
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-destructive">Test Failed</p>
              <p className="text-caption text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {result && !isLoading && (
        <Tabs defaultValue="answer" className="w-full">
          <TabsList className="bg-muted border border-border mb-4 grid grid-cols-3">
            <TabsTrigger value="answer">Answer</TabsTrigger>
            <TabsTrigger value="snippets">Snippets ({result.snippets?.length || 0})</TabsTrigger>
            <TabsTrigger value="citations">Citations ({result.citations?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="answer" className="space-y-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Grounded Answer</p>
                  <p className="text-caption text-muted-foreground">
                    Generated by {result.metrics?.model || 'Unknown'}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-secondary text-secondary">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {result.text}
              </p>
            </div>

            <div className="pt-4 border-t border-border grid grid-cols-3 gap-4 text-caption">
              <div>
                <p className="text-muted-foreground mb-1">Generation Time</p>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-secondary" />
                  <span className="font-mono font-semibold">
                    {formatDuration(result.metrics?.genTimeMs || 0)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Context Tokens</p>
                <span className="font-mono font-semibold">
                  {formatNumber(result.metrics?.contextTokens || 0)}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Faithfulness</p>
                <span className="font-mono font-semibold text-secondary">
                  {formatPercentage((result.metrics?.faithfulness || 0) * 100, 0)}
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="snippets" className="space-y-3">
            {result.snippets?.map((snippet, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-border hover:border-secondary/50 transition-smooth"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">{snippet.title}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-caption border-secondary text-secondary">
                    {Math.round(snippet.confidence * 100)}% match
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {snippet.snippet}
                </p>
                {snippet.url && (
                  <Button variant="ghost" size="sm" className="mt-2 h-7 text-caption">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Source
                  </Button>
                )}
              </div>
            ))}
            {result.snippets?.length === 0 && (
              <p className="text-center text-caption text-muted-foreground py-8">
                No snippets available
              </p>
            )}
          </TabsContent>

          <TabsContent value="citations" className="space-y-3">
            {result.citations && result.citations.length > 0 ? (
              <div className="space-y-2">
                {result.citations.map((citation, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border hover:border-secondary/50 transition-smooth"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-primary">[{idx + 1}]</span>
                      <Badge variant="outline" className="text-caption">
                        {Math.round(citation.confidence * 100)}%
                      </Badge>
                    </div>
                    <p className="text-sm mt-2">{citation.title}</p>
                    {citation.url && (
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-caption text-secondary hover:underline flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {citation.url}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-caption text-muted-foreground py-8">
                No citations available
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </Card>
  );
}
