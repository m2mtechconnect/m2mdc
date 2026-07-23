import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Quick access button for AOC - shows recently accessed agents
 */
export function AOCQuickAccessButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch user's active agents
  const { data: agents } = useQuery({
    queryKey: ['aoc-quick-access'],
    queryFn: async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, name, status')
        .in('status', ['active', 'deployed', 'running'])
        .order('last_heartbeat', { ascending: false })
        .limit(5);
      
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Don't show if already on AOC
  if (location.pathname.includes('/manage') || location.pathname.includes('/operations')) {
    return null;
  }

  // Don't show if no active agents
  if (!agents || agents.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Activity className="h-4 w-4" />
          Operations
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Active Agents</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {agents.map((agent) => (
          <DropdownMenuItem
            key={agent.id}
            onClick={() => navigate(`/app/agents/${agent.id}/manage`)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2 w-full">
              <div
                aria-hidden="true"
                className={`w-2 h-2 rounded-full ${
                  agent.status === 'active' ? 'bg-emerald-500' : 'bg-primary'
                }`}
              />
              <span className="truncate">{agent.name}</span>
            </div>
          </DropdownMenuItem>
        ))}
        {agents.length === 0 && (
          <DropdownMenuItem disabled>
            No active agents
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
