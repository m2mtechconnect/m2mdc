import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Cloud, 
  ChevronRight, 
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

interface Environment {
  id: string;
  name: string;
  type: 'development' | 'test' | 'staging' | 'production';
  status: 'active' | 'inactive';
  version: string;
  deployedAt?: string;
  health: 'healthy' | 'degraded' | 'down';
}

interface AOCEnvironmentManagerProps {
  agentId: string;
  currentEnvironment: string;
  onPromote: (targetEnv: string) => void;
}

export function AOCEnvironmentManager({ 
  agentId, 
  currentEnvironment,
  onPromote 
}: AOCEnvironmentManagerProps) {
  const [targetEnv, setTargetEnv] = useState<string>('');

  // Mock environments - in production, fetch from database
  const environments: Environment[] = [
    {
      id: 'dev',
      name: 'Development',
      type: 'development',
      status: 'active',
      version: 'v1.0.0',
      deployedAt: new Date().toISOString(),
      health: 'healthy',
    },
    {
      id: 'test',
      name: 'Test',
      type: 'test',
      status: 'inactive',
      version: 'v0.9.0',
      health: 'healthy',
    },
    {
      id: 'staging',
      name: 'Staging',
      type: 'staging',
      status: 'inactive',
      version: 'v0.8.0',
      health: 'healthy',
    },
    {
      id: 'prod',
      name: 'Production',
      type: 'production',
      status: 'inactive',
      version: 'v0.7.0',
      health: 'healthy',
    },
  ];

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'down': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getEnvColor = (type: string) => {
    switch (type) {
      case 'development': return 'bg-blue-500';
      case 'test': return 'bg-yellow-500';
      case 'staging': return 'bg-orange-500';
      case 'production': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Cloud className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Environment Pipeline</h3>
      </div>

      {/* Environment Cards */}
      <div className="space-y-3">
        {environments.map((env, idx) => (
          <div key={env.id}>
            <Card 
              className={`p-3 ${env.status === 'active' ? 'border-primary' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Status Indicator */}
                <div className={`w-3 h-3 rounded-full ${getEnvColor(env.type)} ${env.status === 'active' ? 'animate-pulse' : 'opacity-50'}`} />

                {/* Environment Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{env.name}</span>
                    {env.status === 'active' && (
                      <Badge variant="default" className="text-xs">Current</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{env.version}</span>
                    {getHealthIcon(env.health)}
                    {env.deployedAt && (
                      <span>{new Date(env.deployedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Arrow between environments */}
            {idx < environments.length - 1 && (
              <div className="flex justify-center my-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Promote Actions */}
      <Card className="p-4 bg-muted/50">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Promote Version</h4>
          </div>
          <div className="flex gap-2">
            <Select value={targetEnv} onValueChange={setTargetEnv}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select target environment" />
              </SelectTrigger>
              <SelectContent>
                {environments
                  .filter(env => env.status !== 'active')
                  .map(env => (
                    <SelectItem key={env.id} value={env.id}>
                      {env.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button 
              size="sm"
              disabled={!targetEnv}
              onClick={() => {
                if (targetEnv) {
                  onPromote(targetEnv);
                  setTargetEnv('');
                }
              }}
            >
              Promote
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Promoting will deploy the current version to the selected environment
          </p>
        </div>
      </Card>
    </div>
  );
}
