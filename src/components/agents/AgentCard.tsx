import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Play, Settings, Trash2, TrendingUp, Activity, Clock } from 'lucide-react';

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
}

interface AgentCardProps {
  agent: Agent;
  onRun: (agent: Agent) => void;
  onManage: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
  showActions?: boolean;
  animationDelay?: number;
}

export function AgentCard({ 
  agent, 
  onRun, 
  onManage, 
  onDelete,
  showActions = true,
  animationDelay = 0 
}: AgentCardProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'deployed':
        return 'bg-success/10 text-success border-success/20';
      case 'draft':
        return 'bg-muted/50 text-muted-foreground border-border';
      case 'archived':
        return 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <Card 
      className="group relative overflow-hidden bg-card hover:shadow-elegant transition-smooth border-border/50 hover:border-primary/30"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Hover gradient effect */}
      <div className="absolute inset-0 bg-gradient-subtle opacity-0 group-hover:opacity-100 transition-smooth" />
      
      <div className="relative p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-display font-semibold text-lg truncate text-foreground group-hover:text-primary transition-smooth">
                {agent.name}
              </h3>
              {agent.grounding && (
                <Shield className="h-4 w-4 text-success flex-shrink-0" aria-label="Grounded" />
              )}
            </div>
            <p className="text-sm text-body line-clamp-2 mb-3">{agent.description}</p>
          </div>
          <Badge className={getStatusColor(agent.status)} variant="outline">
            {agent.status}
          </Badge>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 py-3 border-y border-border/50">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-success mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-sm font-semibold">{agent.roi}%</span>
            </div>
            <span className="text-xs text-body">ROI</span>
          </div>
          <div className="flex flex-col items-center border-x border-border/50">
            <div className="flex items-center gap-1 text-primary mb-1">
              <Activity className="h-3.5 w-3.5" />
              <span className="text-sm font-semibold">{agent.totalRuns}</span>
            </div>
            <span className="text-xs text-body">Runs</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-accent mb-1">
              <span className="text-sm font-semibold">{Math.round(agent.successRate)}%</span>
            </div>
            <span className="text-xs text-body">Success</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs font-medium">
            {agent.department}
          </Badge>
          <Badge variant="secondary" className="text-xs font-medium">
            {agent.type === 'agent' ? 'Agent Twin' : 'Digital Twin'}
          </Badge>
        </div>

        {/* Footer */}
        {showActions && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1 text-xs text-body">
              <Clock className="h-3 w-3" />
              <span>{formatDate(agent.lastActivity)}</span>
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                onClick={() => onRun(agent)}
                className="h-8 px-3 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground"
              >
                <Play className="h-3 w-3 mr-1" />
                Run
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onManage(agent)}
                className="h-8 px-3"
              >
                <Settings className="h-3 w-3 mr-1" />
                Manage
              </Button>
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(agent)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
