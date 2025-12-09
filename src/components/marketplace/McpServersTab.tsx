import { useState, useEffect } from 'react';
import { McpGrid } from '@/components/shared/McpGrid';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/telemetry';
import { useCatalogStore } from '@/stores/catalogStore';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface McpServersTabProps {
  searchQuery: string;
}

export function McpServersTab({ searchQuery }: McpServersTabProps) {
  const navigate = useNavigate();
  const { syncMcpServers, getLastSync } = useCatalogStore();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<any>(null);

  useEffect(() => {
    loadLastSync();
  }, []);

  const loadLastSync = async () => {
    const sync = await getLastSync();
    setLastSync(sync);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncMcpServers('delta');
      toast.success('Sync completed', {
        description: `Added ${result.added}, updated ${result.updated} servers`,
      });
      await loadLastSync();
    } catch (error) {
      toast.error('Sync failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSelect = async (server: any) => {
    try {
      // Track marketplace action
      trackEvent('marketplace.select', {
        tab: 'mcp',
        id: server.id,
        name: server.name,
      });

      // Create a new agent to connect this server to
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newAgent, error } = await supabase
        .from('agents')
        .insert({
          name: `New AI System (Draft)`,
          owner_id: user.id,
          status: 'draft',
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!newAgent) throw new Error('Failed to create system');

      toast.success('Opening builder', {
        description: 'Connect your MCP server in Configure Intelligence step',
      });

      // Track builder deep link
      trackEvent('builder.deep_link', {
        step: 3,
        source: 'marketplace',
        id: server.id,
      });

      // Navigate to builder step 3 with server prefill
      navigate(`/builder?id=${newAgent.id}&step=3&serverId=${server.id}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to open builder');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {lastSync && (
            <span>
              Last synced: {format(new Date(lastSync.started_at), 'MMM d, yyyy h:mm a')}
              {lastSync.status === 'success' && ` (+${lastSync.added} ~${lastSync.updated})`}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          Sync Now
        </Button>
      </div>
      <McpGrid mode="marketplace" searchQuery={searchQuery} onSelect={handleSelect} />
    </div>
  );
}
