/**
 * Agent Definition Card - Display card for an agent
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Thermometer, Zap, Wind, Network, Shield, Cpu, Globe, Leaf, AlertTriangle, 
  Bot, Play, Settings, MoreVertical, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { AgentDefinition, DOMAIN_INFO, TYPE_INFO } from '@/types/agentDefinition';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Thermometer,
  Zap,
  Wind,
  Network,
  Shield,
  Cpu,
  Globe,
  Leaf,
  AlertTriangle,
  Bot,
};

interface AgentDefinitionCardProps {
  agent: AgentDefinition;
  onRun?: () => void;
  onEdit?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export const AgentDefinitionCard: React.FC<AgentDefinitionCardProps> = ({
  agent,
  onRun,
  onEdit,
  showActions = true,
  compact = false,
}) => {
  const IconComponent = ICON_MAP[agent.icon] || Bot;
  const domainInfo = DOMAIN_INFO[agent.domain];
  const typeInfo = TYPE_INFO[agent.type];
  
  const successRateColor = agent.successRate >= 90 
    ? 'text-green-500' 
    : agent.successRate >= 70 
      ? 'text-yellow-500' 
      : 'text-red-500';

  if (compact) {
    return (
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-muted", domainInfo.color)}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <Link to={`/agents/${agent.slug}`} className="font-medium hover:underline truncate block">
                {agent.name}
              </Link>
              <p className="text-xs text-muted-foreground">{domainInfo.label}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {typeInfo.label}
            </Badge>
            {showActions && onRun && (
              <Button size="icon" variant="ghost" onClick={onRun}>
                <Play className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-lg bg-muted", domainInfo.color)}>
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <Link to={`/agents/${agent.slug}`} className="font-semibold hover:underline">
                {agent.name}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {domainInfo.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {typeInfo.label}
                </Badge>
              </div>
            </div>
          </div>
          
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/agents/${agent.slug}`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                  </Link>
                </DropdownMenuItem>
                {onRun && (
                  <DropdownMenuItem onClick={onRun}>
                    <Play className="mr-2 h-4 w-4" />
                    Run Now
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {agent.description}
        </p>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Runs</p>
            <p className="font-medium">{agent.totalRuns.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Success Rate</p>
            <p className={cn("font-medium", successRateColor)}>
              {agent.successRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Avg Duration</p>
            <p className="font-medium">
              {agent.avgDurationMs > 0 ? `${(agent.avgDurationMs / 1000).toFixed(1)}s` : '-'}
            </p>
          </div>
        </div>
        
        {agent.tools.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Tools ({agent.tools.length})</p>
            <div className="flex flex-wrap gap-1">
              {agent.tools.slice(0, 3).map(tool => (
                <Badge key={tool.id} variant="outline" className="text-xs">
                  {tool.name}
                </Badge>
              ))}
              {agent.tools.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{agent.tools.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {showActions && (
          <div className="mt-4 pt-3 border-t flex gap-2">
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1"
              onClick={onRun}
            >
              <Play className="mr-2 h-4 w-4" />
              Run
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              asChild
            >
              <Link to={`/agents/${agent.slug}`}>
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
