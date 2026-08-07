/**
 * AI Recommendations Panel
 * Displays AI-generated recommendations after simulation runs
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, TrendingUp, Shield, DollarSign, Leaf, 
  AlertTriangle, CheckCircle2, ChevronRight, Zap
} from 'lucide-react';
import type { AIRecommendation, SimulationSummary } from '@/twins/sovereignDataCenter/enhancedSimulationEngine';
import { cn } from '@/lib/utils';
import { signalLabel, signalStrength, SIGNAL_BASIS } from '@/capabilities/recommendationSignal';

interface AIRecommendationsPanelProps {
  summary: SimulationSummary | null;
  onDismiss?: () => void;
  onActionClick?: (recommendation: AIRecommendation, action: string) => void;
}

const categoryConfig = {
  optimization: { icon: Zap, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  risk: { icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  compliance: { icon: Shield, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  cost: { icon: DollarSign, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  sustainability: { icon: Leaf, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
};

const priorityConfig = {
  high: { label: 'High Priority', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  medium: { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  low: { label: 'Low', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
};

export function AIRecommendationsPanel({ 
  summary, 
  onDismiss,
  onActionClick 
}: AIRecommendationsPanelProps) {
  if (!summary) return null;

  const { recommendations, riskScore, overallImpact, scenario } = summary;

  const impactConfig = {
    positive: { icon: CheckCircle2, color: 'text-green-500', label: 'Positive Impact' },
    negative: { icon: AlertTriangle, color: 'text-red-500', label: 'Negative Impact' },
    neutral: { icon: Brain, color: 'text-muted-foreground', label: 'Neutral Impact' },
  }[overallImpact];

  const ImpactIcon = impactConfig.icon;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Recommendations</CardTitle>
              <p className="text-sm text-muted-foreground">
                Based on {scenario.name} simulation results
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <ImpactIcon className={cn('h-4 w-4', impactConfig.color)} />
                <span className="text-sm font-medium">{impactConfig.label}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Risk Score: {riskScore}%
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Risk Score Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Risk Assessment</span>
            <span className={cn(
              'font-medium',
              riskScore < 30 ? 'text-green-500' : riskScore < 60 ? 'text-yellow-500' : 'text-red-500'
            )}>
              {riskScore < 30 ? 'Low Risk' : riskScore < 60 ? 'Moderate Risk' : 'High Risk'}
            </span>
          </div>
          <Progress 
            value={riskScore} 
            className={cn(
              'h-2',
              riskScore < 30 ? '[&>div]:bg-green-500' : riskScore < 60 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
            )}
          />
        </div>

        {/* Recommendations List */}
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const CategoryIcon = categoryConfig[rec.category]?.icon || Zap;
            const catConfig = categoryConfig[rec.category] || categoryConfig.optimization;
            const priConfig = priorityConfig[rec.priority];

            return (
              <div 
                key={rec.id}
                className="p-4 rounded-lg border bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg shrink-0', catConfig.bgColor)}>
                    <CategoryIcon className={cn('h-4 w-4', catConfig.color)} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{rec.title}</h4>
                      <Badge variant="outline" className={cn('text-xs', priConfig.color)}>
                        {priConfig.label}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {rec.description}
                    </p>
                    
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs text-green-600 font-medium">
                          {rec.predictedGain}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground" title={SIGNAL_BASIS}>
                          {signalLabel(rec.confidence)}
                        </span>
                      </div>
                    </div>

                    {/* Action Items */}
                    <div className="space-y-1.5">
                      {rec.actions.map((action, idx) => (
                        <Button
                          key={idx}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between h-8 text-xs hover:bg-primary/5"
                          onClick={() => onActionClick?.(rec, action)}
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">
                              {idx + 1}
                            </span>
                            {action}
                          </span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {recommendations.filter(r => r.priority === 'high').length}
            </div>
            <div className="text-xs text-muted-foreground">High Priority</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {recommendations.length}
            </div>
            <div className="text-xs text-muted-foreground">Total Actions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">
              {signalStrength(recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length)}
            </div>
            <div className="text-xs text-muted-foreground">Rule-based signal</div>
          </div>
        </div>

        {onDismiss && (
          <Button variant="outline" className="w-full" onClick={onDismiss}>
            Dismiss Recommendations
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
