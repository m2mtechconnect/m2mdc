/**
 * Agent Card Component
 * Visual card for displaying agent information in Blueprint tab
 */

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Bot, Brain, BarChart3, Code2 } from 'lucide-react';

interface AgentCardProps {
  agent: {
    name: string;
    role?: string;
    llm_profile?: string;
    tools?: string[];
    description: string;
    id?: string;
  };
}

// Map agent roles to icons
const getRoleIcon = (role?: string) => {
  const roleStr = (role || '').toLowerCase();
  if (roleStr.includes('supervisor') || roleStr.includes('coordinator')) return Brain;
  if (roleStr.includes('simulation') || roleStr.includes('analytics')) return BarChart3;
  return Bot;
};

export function AgentCard({ agent }: AgentCardProps) {
  const Icon = getRoleIcon(agent.role);
  
  return (
    <Card className="p-5 hover:shadow-md transition-shadow border-l-4 border-l-primary/50">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        
        <div className="flex-1">
          <h4 className="font-semibold text-lg mb-2">{agent.name}</h4>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {agent.role && (
              <Badge variant="default" className="text-xs">
                {agent.role}
              </Badge>
            )}
            {agent.llm_profile && (
              <Badge variant="secondary" className="text-xs">
                {agent.llm_profile}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
            {agent.description}
          </p>
          
          {agent.tools && agent.tools.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Tools:</p>
              <div className="flex flex-wrap gap-1.5">
                {agent.tools.map((tool, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    <Code2 className="h-3 w-3 mr-1" />
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
