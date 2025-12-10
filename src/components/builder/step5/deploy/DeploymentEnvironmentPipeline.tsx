/**
 * Deployment Environment Pipeline
 * Multi-environment deployment options (Dev/Staging/Production)
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, Server, Shield, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeploymentEnvironmentPipelineProps {
  currentEnvironment?: string;
  onDeploy: (environment: 'dev' | 'staging' | 'production') => void;
  isDeploying: boolean;
  deployingTo?: string;
  readinessScore: number;
}

const environments = [
  { id: 'dev', label: 'Development', icon: Server, description: 'Test changes safely', color: 'text-info border-info' },
  { id: 'staging', label: 'Staging', icon: Shield, description: 'Pre-production validation', color: 'text-warning border-warning' },
  { id: 'production', label: 'Production', icon: Rocket, description: 'Live deployment', color: 'text-success border-success' },
] as const;

export function DeploymentEnvironmentPipeline({
  currentEnvironment,
  onDeploy,
  isDeploying,
  deployingTo,
  readinessScore
}: DeploymentEnvironmentPipelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Deploy to Environment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {environments.map((env, idx) => {
            const Icon = env.icon;
            const isActive = currentEnvironment === env.id;
            const isDeployingHere = isDeploying && deployingTo === env.id;
            const canDeploy = env.id === 'dev' || (env.id === 'staging' && readinessScore >= 70) || (env.id === 'production' && readinessScore >= 90);
            
            return (
              <div key={env.id} className="flex items-center flex-1">
                <Button
                  variant={isActive ? 'default' : 'outline'}
                  onClick={() => onDeploy(env.id)}
                  disabled={isDeploying || !canDeploy}
                  className={cn("flex-1 h-auto py-3 flex-col gap-1", env.color)}
                >
                  {isDeployingHere ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isActive ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                  <span className="font-medium">{env.label}</span>
                  <span className="text-xs opacity-70">{env.description}</span>
                </Button>
                {idx < environments.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
        {readinessScore < 90 && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Production deployment requires 90% readiness score. Current: {readinessScore}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}
