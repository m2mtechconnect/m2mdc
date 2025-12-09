import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Play, Settings, Trash2, TrendingUp, Activity } from 'lucide-react';

export interface UnifiedItem {
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
}

interface UnifiedItemCardProps {
  item: UnifiedItem;
  onRun: (item: UnifiedItem) => void;
  onManage: (item: UnifiedItem) => void;
  onDelete: (item: UnifiedItem) => void;
}

export function UnifiedItemCard({ item, onRun, onManage, onDelete }: UnifiedItemCardProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'draft':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'archived':
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
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
    <Card className="p-4 hover:shadow-lg transition-smooth group">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate text-foreground">{item.name}</h3>
              {item.grounding && (
                <Shield className="h-4 w-4 text-green-500 flex-shrink-0" aria-label="Grounded" />
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
          </div>
          <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            ROI: {item.roi}%
          </span>
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {item.totalRuns} runs
          </span>
          <span>{Math.round(item.successRate)}% success</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">{item.department}</Badge>
          <Badge variant="outline" className="text-xs">{item.type === 'agent' ? 'agent twin' : item.type}</Badge>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">{formatDate(item.lastActivity)}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRun(item)}
              className="h-8 px-3"
            >
              <Play className="h-3 w-3 mr-1" />
              Run
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onManage(item)}
              className="h-8 px-3"
            >
              <Settings className="h-3 w-3 mr-1" />
              Manage
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(item)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
