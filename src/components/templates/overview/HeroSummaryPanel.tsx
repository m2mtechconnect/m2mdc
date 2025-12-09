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
    <Card className="p-6 bg-[#FFF7E6] border-[#E5E7EB]">
      <div className="space-y-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="text-5xl shrink-0">{icon}</div>
            <div className="flex-1">
              <h1 className="text-[32px] font-bold leading-[1.2] mb-2 text-[#111827]">{name}</h1>
              <p className="text-[#4B5563] text-[14px] leading-relaxed mb-3">{description}</p>
              
              {/* Chips */}
              <div className="flex flex-wrap gap-2">
                {certified && (
                  <Badge className="bg-[#FDE68A] text-[#111827] border-[#F59E0B]">
                    <Shield className="h-3 w-3 mr-1" />
                    Certified
                  </Badge>
                )}
                {industries.map((industry: string) => (
                  <Badge key={industry} variant="outline" className="text-[#111827]">{industry}</Badge>
                ))}
                {departments.map((dept: string) => (
                  <Badge key={dept} variant="outline" className="text-[#111827]">{dept}</Badge>
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
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#FDE68A]">
              <TrendingUp className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-[12px] text-[#6B7280]">ROI</p>
              <p className="text-[20px] font-bold text-[#111827]">{roiPct}%</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#FDE68A]">
              <Clock className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-[12px] text-[#6B7280]">Time Saved</p>
              <p className="text-[20px] font-bold text-[#111827]">{timeSaved}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#FDE68A]">
              <Download className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-[12px] text-[#6B7280]">Downloads</p>
              <p className="text-[20px] font-bold text-[#111827]">{downloads}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
