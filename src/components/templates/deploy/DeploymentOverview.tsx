import { Card } from '@/components/ui/card';
import { Layers } from 'lucide-react';

interface DeploymentOverviewProps {
  templateName: string;
  description?: string;
}

export function DeploymentOverview({ templateName, description }: DeploymentOverviewProps) {
  const defaultDescription = "Deploy this Digital Twin to AWS, Azure, or GCP using optimized agentic runtime patterns.";
  
  return (
    <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
          <Layers className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">{templateName}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {description || defaultDescription}
          </p>
        </div>
      </div>
    </Card>
  );
}
