import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Link as LinkIcon, Loader2, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { formatRelativeTime } from "@/lib/formatters";
import { handleError } from "@/lib/errorHandlers";
import { StatusBadge } from "@/components/ui/status-badge";

interface KnowledgeSource {
  id: string;
  name: string;
  type: 'file' | 'url';
  status: 'queued' | 'ingesting' | 'indexed' | 'failed';
  created_at: string;
  error_message?: string;
}

export function KnowledgeSourcesList() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchKnowledgeSources();
    
    // Poll for status updates every 2 seconds
    const interval = setInterval(fetchKnowledgeSources, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchKnowledgeSources = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        logger.error('Auth error', userError, { component: 'KnowledgeSourcesList', action: 'fetchKnowledgeSources' });
        return;
      }

      const { data, error } = await supabase
        .from('knowledge_sources')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSources(data?.map(d => ({
        id: d.id,
        name: d.name,
        type: d.page_id ? 'url' : 'file',
        status: d.indexed_at ? 'indexed' : 'ingesting',
        created_at: d.created_at,
      })) || []);
    } catch (error) {
      handleError(error, {
        component: 'KnowledgeSourcesList',
        action: 'fetchKnowledgeSources',
        fallbackMessage: 'Failed to load knowledge sources'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('knowledge_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSources(sources.filter(s => s.id !== id));
      toast({
        title: "Deleted",
        description: "Knowledge source removed successfully",
      });
    } catch (error) {
      handleError(error, {
        component: 'KnowledgeSourcesList',
        action: 'handleDelete',
        fallbackMessage: 'Failed to delete knowledge source'
      });
    }
  };

  const getStatusIcon = (status: KnowledgeSource['status']) => {
    switch (status) {
      case 'queued':
      case 'ingesting':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'indexed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: KnowledgeSource['status']) => {
    switch (status) {
      case 'queued':
        return <Badge variant="outline">Queued</Badge>;
      case 'ingesting':
        return <Badge variant="outline" className="bg-primary/10">Ingesting</Badge>;
      case 'indexed':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Indexed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const getProgress = (status: KnowledgeSource['status']) => {
    switch (status) {
      case 'queued':
        return 0;
      case 'ingesting':
        return 50;
      case 'indexed':
        return 100;
      case 'failed':
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-body">No knowledge sources yet</p>
        <p className="text-caption mt-1">Upload files or capture URLs to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-h4 font-display">Indexed Sources ({sources.length})</h4>
      
      <div className="space-y-2">
        {sources.map((source) => (
          <Card key={source.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {source.type === 'file' ? (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <LinkIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium truncate">{source.name}</p>
                    <p className="text-caption">
                      {formatRelativeTime(source.created_at)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusIcon(source.status)}
                    <StatusBadge status={source.status} />
                  </div>
                </div>

                {(source.status === 'queued' || source.status === 'ingesting') && (
                  <Progress value={getProgress(source.status)} className="h-1" />
                )}

                {source.status === 'failed' && source.error_message && (
                  <p className="text-caption text-destructive mt-1">{source.error_message}</p>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(source.id)}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
