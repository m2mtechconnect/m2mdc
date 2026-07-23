import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from "@/components/ui/empty-state";
import { Loader2, Play, Search, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AgentPlayground } from './AgentPlayground';
import { QuickRecommendations } from './shared/QuickRecommendations';
import { toast } from 'sonner';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  status: string;
  template_id: string | null;
  model_id: string | null;
  total_runs: number | null;
  success_rate: number | null;
  deployed_at: string | null;
  updated_at: string;
}

export function AgentsList() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [playgroundAgent, setPlaygroundAgent] = useState<{ id: string; name: string } | null>(null);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['agents-list', search, status, page],
    queryFn: async () => {
      // Build query params for GET request
      const params: Record<string, string> = {
        page: page.toString(),
        pageSize: pageSize.toString(),
      };
      
      if (search) params.search = search;
      if (status && status !== 'all') params.status = status;

      // Construct URL with query params
      const queryString = new URLSearchParams(params).toString();
      const url = `/agents-list?${queryString}`;

      const { data, error } = await supabase.functions.invoke('agents-list', {
        method: 'GET',
      });

      if (error) throw error;
      return data as { items: Agent[]; total: number; page: number; pageSize: number };
    },
    retry: 2,
  });

  const navigate = useNavigate();

  const handleRunAgent = (agent: Agent) => {
    navigate(`/agents/${agent.id}/chat`);
  };

  if (error) {
    toast.error('Failed to load agents');
    return (
      <Card className="p-6 text-center">
        <p className="text-destructive">Failed to load agents</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]" aria-label="Filter agents by status">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!data?.items || data.items.length === 0) && (
        <EmptyState
          icon={Bot}
          title="No agents found"
          description={
            search || status !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first agent to get started'
          }
        />
      )}

      {/* Agents Grid */}
      {!isLoading && data?.items && data.items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.items.map((agent) => (
            <Card key={agent.id} className="p-4 hover:shadow-lg transition-smooth space-y-3">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold truncate">{agent.name}</h3>
                    {agent.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {agent.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                    {agent.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {agent.total_runs !== null && (
                    <span>{agent.total_runs} runs</span>
                  )}
                  {agent.success_rate !== null && (
                    <span>{Math.round(agent.success_rate)}% success</span>
                  )}
                </div>

                <Button
                  onClick={() => handleRunAgent(agent)}
                  className="w-full gap-2"
                  variant="outline"
                  size="sm"
                >
                  <Play className="h-3.5 w-3.5" />
                  Run Agent
                </Button>
              </div>

              {/* AI Recommendations */}
              <QuickRecommendations systemId={agent.id} compact={true} />
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total > pageSize && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(data.total / pageSize)}
          </span>
          <Button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(data.total / pageSize)}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        </div>
      )}

      {/* Playground Modal */}
      {playgroundAgent && (
        <AgentPlayground
          agentId={playgroundAgent.id}
          agentName={playgroundAgent.name}
          open={true}
          onClose={() => setPlaygroundAgent(null)}
        />
      )}
    </div>
  );
}
