/**
 * Blueprint Agents Tab - List of all agents in the blueprint
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  AlertTriangle
} from 'lucide-react';
import type { AgentBlueprint, DomainSection } from '@/types/dataCentreBlueprint';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface BlueprintAgentsTabProps {
  agents: AgentBlueprint[];
  domains: Record<string, DomainSection>;
  highlightAgentId?: string;
}

const domainIcons: Record<string, React.ReactNode> = {
  thermal: <Thermometer className="h-4 w-4 text-orange-500" />,
  power: <Zap className="h-4 w-4 text-yellow-500" />,
  cooling: <Wind className="h-4 w-4 text-blue-500" />,
  network: <Network className="h-4 w-4 text-purple-500" />,
  facility: <Building2 className="h-4 w-4 text-gray-500" />,
  workload: <Cpu className="h-4 w-4 text-pink-500" />,
  sovereignty: <Globe className="h-4 w-4 text-green-500" />,
  financial: <DollarSign className="h-4 w-4 text-emerald-500" />,
};

const typeIcons: Record<string, React.ReactNode> = {
  monitoring: <Eye className="h-3.5 w-3.5" />,
  control: <Settings className="h-3.5 w-3.5" />,
  analytics: <Activity className="h-3.5 w-3.5" />,
  incident: <AlertTriangle className="h-3.5 w-3.5" />,
};

const typeBadgeColors: Record<string, string> = {
  monitoring: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  control: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  analytics: 'bg-green-500/10 text-green-600 border-green-500/30',
  incident: 'bg-red-500/10 text-red-600 border-red-500/30',
};

export function BlueprintAgentsTab({ agents, domains, highlightAgentId }: BlueprintAgentsTabProps) {
  // Group agents by domain
  const agentsByDomain = agents.reduce((acc, agent) => {
    const domain = agent.domain;
    if (!acc[domain]) {
      acc[domain] = [];
    }
    acc[domain].push(agent);
    return acc;
  }, {} as Record<string, AgentBlueprint[]>);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            Agent Registry ({agents.length} agents)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(agentsByDomain).map(([domain, domainAgents]) => (
              <Badge key={domain} variant="outline" className="gap-2">
                {domainIcons[domain]}
                <span className="capitalize">{domain}</span>
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
                <TableHead>Inputs</TableHead>
                <TableHead>Outputs</TableHead>
                <TableHead>Tools</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow 
                  key={agent.id} 
                  className={highlightAgentId === agent.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''}
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
                      {domainIcons[agent.domain]}
                      <span className="capitalize text-sm">{agent.domain}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 ${typeBadgeColors[agent.type] || ''}`}>
                      {typeIcons[agent.type]}
                      <span className="capitalize">{agent.type}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {agent.inputs.slice(0, 3).map((input, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {input}
                        </Badge>
                      ))}
                      {agent.inputs.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{agent.inputs.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {agent.outputs.slice(0, 2).map((output, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {output}
                        </Badge>
                      ))}
                      {agent.outputs.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{agent.outputs.length - 2}
                        </Badge>
                      )}
                    </div>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
