import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, TrendingUp, Clock, Download, Rocket } from 'lucide-react';

interface HeroSummaryPanelProps {
  icon: string;
  name: string;
  description: string;
  industries: string[];
  departments: string[];
  certified?: boolean;
  roiPct: number;
  timeSaved: string;
  downloads: number;
  onUseTemplate?: () => void;
  mode: 'marketplace' | 'deployed' | 'preview';
  isDeploying?: boolean;
}

export function HeroSummaryPanel({
  icon,
  name,
  description,
  industries,
  departments,
  certified = false,
  roiPct,
  timeSaved,
  downloads,
  onUseTemplate,
  mode,
  isDeploying = false
}: HeroSummaryPanelProps) {
  return (
    <Card className="p-6 bg-amber-50 border-border">
      <div className="space-y-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="text-5xl shrink-0">{icon}</div>
            <div className="flex-1">
              <h1 className="text-[32px] font-bold leading-[1.2] mb-2 text-foreground">{name}</h1>
              <p className="text-studio-muted text-[14px] leading-relaxed mb-3">{description}</p>
              
              {/* Chips */}
              <div className="flex flex-wrap gap-2">
                {certified && (
                  <Badge className="bg-amber-200 text-foreground border-warning">
                    <Shield className="h-3 w-3 mr-1" />
                    Certified
                  </Badge>
                )}
                {industries.map((industry: string) => (
                  <Badge key={industry} variant="outline" className="text-foreground">{industry}</Badge>
                ))}
                {departments.map((dept: string) => (
                  <Badge key={dept} variant="outline" className="text-foreground">{dept}</Badge>
                ))}
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          {mode === 'marketplace' && onUseTemplate && (
            <Button onClick={onUseTemplate} size="lg" className="gap-2 shrink-0">
              <Rocket className="h-4 w-4" />
              Use This Template
            </Button>
          )}
        </div>
        
        {/* KPI Summary Row */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-200">
              <TrendingUp className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-studio-muted">ROI</p>
              <p className="text-xl font-bold text-foreground">{roiPct}%</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-200">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-studio-muted">Time Saved</p>
              <p className="text-xl font-bold text-foreground">{timeSaved}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-200">
              <Download className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-studio-muted">Downloads</p>
              <p className="text-xl font-bold text-foreground">{downloads}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
