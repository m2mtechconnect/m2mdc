import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Zap, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AOCPerformancePanelProps {
  agentId: string;
}

export function AOCPerformancePanel({ agentId }: AOCPerformancePanelProps) {
  const { toast } = useToast();

  const optimizations = [
    {
      id: '1',
      title: 'Token Optimization',
      description: 'Reduce prompt size by removing redundant context',
      impact: 'High',
      savings: '23% token reduction',
      status: 'recommended',
      icon: Zap,
    },
    {
      id: '2',
      title: 'Cache Strategy',
      description: 'Enable response caching for repeated queries',
      impact: 'Medium',
      savings: '40% faster response',
      status: 'recommended',
      icon: TrendingUp,
    },
    {
      id: '3',
      title: 'Workflow Pruning',
      description: 'Remove unused workflow nodes',
      impact: 'Low',
      savings: '5% efficiency gain',
      status: 'applied',
      icon: CheckCircle2,
    },
    {
      id: '4',
      title: 'Batch Processing',
      description: 'Group similar requests for batch execution',
      impact: 'High',
      savings: '35% cost reduction',
      status: 'review',
      icon: AlertCircle,
    },
  ];

  const applyOptimization = (id: string) => {
    toast({
      title: '✓ Optimization Applied',
      description: 'Configuration updated successfully',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'default';
      case 'recommended': return 'secondary';
      case 'review': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Performance Optimization</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          AI-powered recommendations to improve efficiency
        </p>
      </div>

      {/* Health Score */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium">Overall Health Score</span>
          <span className="text-lg font-bold text-primary">87/100</span>
        </div>
        <Progress value={87} className="h-2" />
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span className="text-muted-foreground">+5 this week</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">3 optimizations available</span>
          </div>
        </div>
      </div>

      {/* Optimization Recommendations */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {optimizations.map((opt) => {
          const Icon = opt.icon;
          
          return (
            <Card key={opt.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  opt.status === 'applied' ? 'bg-green-500/10' :
                  opt.status === 'recommended' ? 'bg-primary/10' :
                  'bg-yellow-500/10'
                }`}>
                  <Icon className={`h-4 w-4 ${
                    opt.status === 'applied' ? 'text-green-500' :
                    opt.status === 'recommended' ? 'text-primary' :
                    'text-yellow-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium">{opt.title}</h4>
                    <Badge variant={getStatusColor(opt.status)} className="text-xs">
                      {opt.impact} Impact
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {opt.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary">
                      {opt.savings}
                    </span>
                    {opt.status !== 'applied' && (
                      <Button
                        size="sm"
                        variant={opt.status === 'recommended' ? 'default' : 'outline'}
                        onClick={() => applyOptimization(opt.id)}
                      >
                        Apply
                      </Button>
                    )}
                    {opt.status === 'applied' && (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Applied
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button variant="outline" size="sm" className="w-full">
          View Detailed Performance Report
        </Button>
      </div>
    </div>
  );
}
