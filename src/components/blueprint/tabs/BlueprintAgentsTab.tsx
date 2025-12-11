/**
 * Blueprint Agents Tab - List of all agents in the blueprint
 * Now integrates with agent_definitions table for real data
 */

import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bot, 
  Thermometer, 
  Zap, 
  Wind, 
  Network, 
  Building2, 
  Cpu, 
  Globe, 
  DollarSign,
  Eye,
  Settings,
  Activity,
  AlertTriangle,
  ExternalLink,
  Play
} from 'lucide-react';
import { AGENTS, getAgentSummary } from '@/ux';
import type { AgentBlueprint, DomainSection } from '@/types/dataCentreBlueprint';
import { useAgentDefinitions } from '@/hooks/useAgentDefinitions';
import { DOMAIN_INFO, TYPE_INFO } from '@/types/agentDefinition';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AgentHealthPanel } from '../AgentHealthPanel';

export interface BlueprintAgentsTabProps {
  agents: AgentBlueprint[];
  domains: Record<string, DomainSection>;
  highlightAgentId?: string;
  useRealData?: boolean;
}

const domainIcons: Record<string, React.ReactNode> = {
  thermal: <Thermometer className="h-4 w-4 text-warning" />,
  thermal_hardware: <Thermometer className="h-4 w-4 text-warning" />,
  power: <Zap className="h-4 w-4 text-warning" />,
  power_ups: <Zap className="h-4 w-4 text-warning" />,
  cooling: <Wind className="h-4 w-4 text-info" />,
  network: <Network className="h-4 w-4 text-primary" />,
  facility: <Building2 className="h-4 w-4 text-muted-foreground" />,
  facility_safety: <Building2 className="h-4 w-4 text-muted-foreground" />,
  workload: <Cpu className="h-4 w-4 text-primary" />,
  workload_gpu: <Cpu className="h-4 w-4 text-primary" />,
  sovereignty: <Globe className="h-4 w-4 text-success" />,
  financial: <DollarSign className="h-4 w-4 text-success" />,
  financial_carbon: <DollarSign className="h-4 w-4 text-success" />,
  incident_response: <AlertTriangle className="h-4 w-4 text-destructive" />,
};

const typeIcons: Record<string, React.ReactNode> = {
  monitoring: <Eye className="h-3.5 w-3.5" />,
  control: <Settings className="h-3.5 w-3.5" />,
  analytics: <Activity className="h-3.5 w-3.5" />,
  incident: <AlertTriangle className="h-3.5 w-3.5" />,
  optimizer: <Activity className="h-3.5 w-3.5" />,
  scheduler: <Cpu className="h-3.5 w-3.5" />,
};

const typeBadgeColors: Record<string, string> = {
  monitoring: 'bg-info/10 text-info border-info/30',
  control: 'bg-primary/10 text-primary border-primary/30',
  analytics: 'bg-success/10 text-success border-success/30',
  incident: 'bg-destructive/10 text-destructive border-destructive/30',
  optimizer: 'bg-warning/10 text-warning border-warning/30',
  scheduler: 'bg-primary/10 text-primary border-primary/30',
};

export function BlueprintAgentsTab({ agents, domains, highlightAgentId, useRealData = true }: BlueprintAgentsTabProps) {
  const navigate = useNavigate();
  const { data: dbAgents, isLoading } = useAgentDefinitions();
  
  // Define a common display agent type
  type DisplayAgent = {
    id: string;
    name: string;
    description: string;
    domain: string;
    type: string;
    inputs: string[];
    outputs: string[];
    toolsUsed: string[];
    kpiBindings: string[];
    slug: string;
    totalRuns?: number;
    successRate?: number;
  };

  // Use database agents if available and useRealData is true
  const displayAgents: DisplayAgent[] = useRealData && dbAgents && dbAgents.length > 0 
    ? dbAgents.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description || '',
        domain: agent.domain,
        type: agent.type,
        inputs: agent.inputs.map(i => i.name),
        outputs: agent.outputs.map(o => o.name),
        toolsUsed: agent.tools.map(t => t.name),
        kpiBindings: agent.kpiBindings.map(k => k.kpiId),
        slug: agent.slug,
        totalRuns: agent.totalRuns,
        successRate: agent.successRate,
      }))
    : agents.map(a => ({ 
        id: a.id,
        name: a.name,
        description: a.description,
        domain: a.domain,
        type: a.type,
        inputs: a.inputs,
        outputs: a.outputs,
        toolsUsed: a.toolsUsed,
        kpiBindings: [],
        slug: a.id,
      }));

  // Group agents by domain
  const agentsByDomain = displayAgents.reduce((acc, agent) => {
    const domain = agent.domain;
    if (!acc[domain]) {
      acc[domain] = [];
    }
    acc[domain].push(agent);
    return acc;
  }, {} as Record<string, typeof displayAgents>);

  const handleViewAgent = (slug: string) => {
    navigate(`/app/agents/${slug}/detail`);
  };

  if (isLoading && useRealData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Intro */}
      <div className="text-sm text-muted-foreground">
        {AGENTS.SECTION_INTRO}
      </div>

      {/* Agent Health Panel */}
      <AgentHealthPanel />

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            Agent Registry ({displayAgents.length} agents)
            {useRealData && dbAgents && dbAgents.length > 0 && (
              <Badge variant="secondary" className="ml-2">Live Data</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(agentsByDomain).map(([domain, domainAgents]) => (
              <Badge key={domain} variant="outline" className="gap-2">
                {domainIcons[domain] || <Bot className="h-4 w-4" />}
                <span className="capitalize">{DOMAIN_INFO[domain as keyof typeof DOMAIN_INFO]?.label || domain}</span>
                <span className="bg-muted px-1.5 rounded text-xs">{domainAgents.length}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agents Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Tools</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayAgents.map((agent) => (
                <TableRow 
                  key={agent.id} 
                  className={highlightAgentId === agent.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-muted/50 cursor-pointer'}
                  onClick={() => handleViewAgent(agent.slug)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{agent.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {domainIcons[agent.domain] || <Bot className="h-4 w-4" />}
                      <span className="text-sm">{DOMAIN_INFO[agent.domain as keyof typeof DOMAIN_INFO]?.label || agent.domain}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 ${typeBadgeColors[agent.type] || ''}`}>
                      {typeIcons[agent.type] || <Bot className="h-3.5 w-3.5" />}
                      <span className="capitalize">{TYPE_INFO[agent.type as keyof typeof TYPE_INFO]?.label || agent.type}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {'totalRuns' in agent && 'successRate' in agent ? (
                      <div className="text-sm">
                        <span className="font-medium">{agent.totalRuns}</span>
                        <span className="text-muted-foreground"> runs</span>
                        <span className="mx-1">•</span>
                        <span className={agent.successRate >= 90 ? 'text-green-600' : agent.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                          {agent.successRate.toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {agent.toolsUsed.slice(0, 2).map((tool, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs bg-primary/10">
                          {tool}
                        </Badge>
                      ))}
                      {agent.toolsUsed.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{agent.toolsUsed.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleViewAgent(agent.slug)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => navigate(`/agents/${agent.id}/chat`)}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
