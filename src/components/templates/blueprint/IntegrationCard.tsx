/**
 * Integration Card Component
 * Visual card with icons for integrations
 */

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Zap, Cloud, Link2, Webhook } from 'lucide-react';

interface IntegrationCardProps {
  integration: {
    name: string;
    type: string;
    description: string;
    status?: string;
    id?: string;
  };
}

// Map integration types to icons
const getIntegrationIcon = (type?: string, name?: string) => {
  const typeStr = (type || '').toLowerCase();
  const nameStr = (name || '').toLowerCase();
  
  if (nameStr.includes('webhook') || typeStr.includes('webhook')) return Webhook;
  if (nameStr.includes('cloud') || typeStr.includes('cloud')) return Cloud;
  if (typeStr.includes('api') || typeStr.includes('rest')) return Link2;
  return Zap;
};

export function IntegrationCard({ integration }: IntegrationCardProps) {
  const Icon = getIntegrationIcon(integration?.type, integration?.name);
  const name = integration?.name || 'Unknown Integration';
  const type = integration?.type || 'integration';
  const description = integration?.description || '';
  
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold">{name}</h4>
            {integration?.status && (
              <Badge variant="outline" className="text-xs">
                {integration.status}
              </Badge>
            )}
          </div>
          
          <Badge variant="secondary" className="text-xs mb-3">
            {type}
          </Badge>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );
}
