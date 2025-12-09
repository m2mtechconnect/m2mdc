import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, Bot } from 'lucide-react';
import { StandardCard, StandardCardData } from '@/components/shared/StandardCard';
import { StandardFilters, StandardFiltersState } from '@/components/shared/StandardFilters';

export interface Agent {
  id: string;
  name: string;
  description: string;
  department: string;
  category: string;
  status: string;
  grounding: boolean;
  roi: number;
  lastActivity: string;
  totalRuns: number;
  successRate: number;
  version: string;
  type: 'system' | 'agent';
  templateId?: string;
  industry?: string;
  twinType?: string;
}

interface AgentsGridProps {
  agents: Agent[];
  isLoading?: boolean;
  error?: string | null;
  onRun: (agent: Agent) => void;
  onManage: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
  onRetry?: () => void;
  mode?: 'manage' | 'dashboard';
}

export function AgentsGrid({
  agents,
  isLoading = false,
  error = null,
  onRun,
  onManage,
  onDelete,
  onRetry,
  mode = 'manage',
}: AgentsGridProps) {
  const [filters, setFilters] = useState<StandardFiltersState>({
    searchQuery: '',
    industryFilter: 'all',
    departmentFilter: 'all',
    typeFilter: 'all',
    levelFilter: 'all',
    statusFilter: 'all',
    showRecommended: false,
  });

  // Apply filters
  const filteredAgents = agents.filter(agent => {
    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchableText = [
        agent.name,
        agent.description,
        agent.department,
        agent.category,
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) return false;
    }

    // Department filter
    if (filters.departmentFilter !== 'all' && agent.department !== filters.departmentFilter) {
      return false;
    }

    // Status filter
    if (filters.statusFilter !== 'all' && agent.status.toLowerCase() !== filters.statusFilter) {
      return false;
    }

    return true;
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">Error Loading Agents</h3>
        <p className="text-body max-w-md mx-auto">{error}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        )}
      </div>
    );
  }

  // Empty state
  if (agents.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <Bot className="h-16 w-16 mx-auto text-muted-foreground/50" />
        <h3 className="text-xl font-semibold text-foreground">No agents created yet</h3>
        <p className="text-body max-w-md mx-auto">
          Create your first AI agent or digital twin to get started with automation.
        </p>
      </div>
    );
  }

  // No results after filtering
  if (filteredAgents.length === 0 && agents.length > 0) {
    return (
      <div className="space-y-6">
        <StandardFilters
          mode="system"
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={() => setFilters({
            searchQuery: '',
            industryFilter: 'all',
            departmentFilter: 'all',
            typeFilter: 'all',
            levelFilter: 'all',
            statusFilter: 'all',
            showRecommended: false,
          })}
        />
        <div className="text-center py-12 space-y-4">
          <div className="text-6xl">🔍</div>
          <h3 className="text-xl font-semibold text-foreground">No agents match your filters</h3>
          <p className="text-body max-w-md mx-auto">
            Try adjusting your search query or filters to see more agents.
          </p>
          <p className="text-sm text-muted-foreground">
            Total available: {agents.length} agent{agents.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Standardized Filters */}
      <StandardFilters
        mode="system"
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={() => setFilters({
          searchQuery: '',
          industryFilter: 'all',
          departmentFilter: 'all',
          typeFilter: 'all',
          levelFilter: 'all',
          statusFilter: 'all',
          showRecommended: false,
        })}
      />

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-body">
          Showing {filteredAgents.length} of {agents.length} agent{agents.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent, index) => {
          const cardData: StandardCardData = {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            department: agent.department,
            twinType: agent.type,
            status: agent.status,
            grounding: agent.grounding,
            roi: agent.roi,
            totalRuns: agent.totalRuns,
            successRate: agent.successRate,
            lastActivity: agent.lastActivity,
            version: agent.version,
            tags: [agent.category],
          };

          return (
            <StandardCard
              key={agent.id}
              mode="system"
              data={cardData}
              onRun={() => onRun(agent)}
              onManage={() => onManage(agent)}
              onDelete={onDelete ? () => onDelete(agent) : undefined}
              animationDelay={index * 30}
            />
          );
        })}
      </div>
    </div>
  );
}
