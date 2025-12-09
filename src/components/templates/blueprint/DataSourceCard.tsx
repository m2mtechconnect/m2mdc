/**
 * Data Source Card Component
 * Visual card with status indicators for data sources
 */

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Database, Activity, TrendingUp, Table2 } from 'lucide-react';

interface DataSourceCardProps {
  source: {
    name: string;
    type: string;
    connection_type?: string;
    required?: boolean;
    description: string;
    id?: string;
  };
}

// Map data source types to icons
const getTypeIcon = (type?: string) => {
  const typeStr = (type || '').toLowerCase();
  if (typeStr.includes('api')) return Activity;
  if (typeStr.includes('time_series') || typeStr.includes('stream')) return TrendingUp;
  if (typeStr.includes('relational') || typeStr.includes('database')) return Table2;
  return Database;
};

// Get status indicator
const getStatusIndicator = (required?: boolean) => {
  if (required) {
    return { icon: '🟢', label: 'Ready', variant: 'default' as const };
  }
  return { icon: '🟡', label: 'Optional', variant: 'secondary' as const };
};

export function DataSourceCard({ source }: DataSourceCardProps) {
  const Icon = getTypeIcon(source?.type);
  const status = getStatusIndicator(source?.required);
  const name = source?.name || 'Unknown Source';
  const type = source?.type || 'data';
  const description = source?.description || '';
  
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold">{name}</h4>
            <Badge variant={status.variant} className="text-xs">
              {status.icon} {status.label}
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="outline" className="text-xs">
              {type}
            </Badge>
            {source?.connection_type && (
              <Badge variant="secondary" className="text-xs">
                {source.connection_type}
              </Badge>
            )}
            {source?.required && (
              <Badge className="bg-primary/10 text-primary text-xs">
                Required
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );
}
