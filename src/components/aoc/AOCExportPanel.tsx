import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Table, BarChart3, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface AOCExportPanelProps {
  agentId: string;
}

export function AOCExportPanel({ agentId }: AOCExportPanelProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState<string | null>(null);

  const exportData = async (type: string, format: string) => {
    setExporting(`${type}-${format}`);
    
    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: '✓ Export Complete',
      description: `${type} exported as ${format.toUpperCase()}`,
    });
    
    setExporting(null);
  };

  const exportOptions = [
    {
      id: 'logs',
      title: 'Activity Logs',
      description: 'Export all agent execution logs',
      icon: FileText,
      formats: ['CSV', 'JSON'],
      size: '2.4 MB',
    },
    {
      id: 'metrics',
      title: 'Performance Metrics',
      description: 'Export aggregated metrics and KPIs',
      icon: BarChart3,
      formats: ['CSV', 'JSON', 'Excel'],
      size: '1.8 MB',
    },
    {
      id: 'audit',
      title: 'Audit Trail',
      description: 'Export governance and compliance logs',
      icon: Table,
      formats: ['CSV', 'PDF'],
      size: '856 KB',
    },
    {
      id: 'schedule',
      title: 'Scheduled Reports',
      description: 'Configure automated report delivery',
      icon: Calendar,
      formats: ['Configure'],
      size: null,
    },
  ];

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Download className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Export & Reports</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Download data and configure automated reports
        </p>
      </div>

      {/* Export Options */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {exportOptions.map((option) => {
          const Icon = option.icon;
          
          return (
            <Card key={option.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium">{option.title}</h4>
                    {option.size && (
                      <Badge variant="secondary" className="text-xs">
                        {option.size}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {option.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {option.formats.map((format) => (
                      <Button
                        key={format}
                        size="sm"
                        variant="outline"
                        onClick={() => exportData(option.id, format)}
                        disabled={exporting === `${option.id}-${format}`}
                      >
                        {exporting === `${option.id}-${format}` ? (
                          <>Exporting...</>
                        ) : (
                          <>
                            <Download className="h-3 w-3 mr-1.5" />
                            {format}
                          </>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {/* Recent Exports */}
        <div className="pt-4 border-t">
          <h4 className="text-xs font-semibold mb-3 text-muted-foreground">
            Recent Exports
          </h4>
          <div className="space-y-2">
            {[
              { name: 'agent-logs-2024-01.csv', time: '2 hours ago', size: '2.4 MB' },
              { name: 'metrics-report.xlsx', time: 'Yesterday', size: '1.8 MB' },
              { name: 'audit-trail.pdf', time: '3 days ago', size: '856 KB' },
            ].map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-2 rounded hover:bg-accent/50 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-muted-foreground">{file.size}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
