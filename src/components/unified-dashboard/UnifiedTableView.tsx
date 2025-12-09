import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Play, Settings, Trash2 } from 'lucide-react';
import { UnifiedItem } from './UnifiedItemCard';

interface UnifiedTableViewProps {
  items: UnifiedItem[];
  onRun: (item: UnifiedItem) => void;
  onManage: (item: UnifiedItem) => void;
  onDelete: (item: UnifiedItem) => void;
}

export function UnifiedTableView({ items, onRun, onManage, onDelete }: UnifiedTableViewProps) {
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
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left py-3 px-4 text-sm font-semibold">Name</th>
            <th className="text-left py-3 px-4 text-sm font-semibold">Department</th>
            <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
            <th className="text-left py-3 px-4 text-sm font-semibold">ROI</th>
            <th className="text-left py-3 px-4 text-sm font-semibold">Last Activity</th>
            <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t hover:bg-muted/30 transition-smooth">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.name}</span>
                  {item.grounding && (
                    <Shield className="h-3 w-3 text-green-500" aria-label="Grounded" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate max-w-md">{item.description}</p>
              </td>
              <td className="py-3 px-4 text-sm">{item.department}</td>
              <td className="py-3 px-4">
                <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
              </td>
              <td className="py-3 px-4">
                <span className="text-yellow-500 font-semibold">{item.roi}%</span>
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {formatDate(item.lastActivity)}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRun(item)}
                    className="h-8"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onManage(item)}
                    className="h-8"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(item)}
                    className="h-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
