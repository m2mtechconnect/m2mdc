import { Card } from '@/components/ui/card';
import { TrendingUp, Check, ArrowUpRight } from 'lucide-react';

interface ROIEstimate {
  scenario: string;
  estimated_annual_roi_pct: number;
  estimated_savings?: string;
  time_frame?: string;
}

interface ROISectionProps {
  headline?: string;
  benefits?: string[];
  estimates?: ROIEstimate[];
}

export function ROISection({ headline, benefits, estimates }: ROISectionProps) {
  if (!headline && (!benefits || benefits.length === 0) && (!estimates || estimates.length === 0)) {
    return null;
  }
  
  return (
    <Card className="p-6 bg-white border-[#E5E7EB]">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-6 w-6 text-[#F59E0B]" />
        <h3 className="text-[20px] font-semibold text-[#111827]">Business Impact & ROI</h3>
      </div>
      
      <div className="space-y-6">
        {/* ROI Headline */}
        {headline && (
          <div className="p-4 bg-[#FFF7E6] border border-[#E5E7EB] rounded-lg">
            <p className="text-[18px] font-medium text-[#111827]">{headline}</p>
          </div>
        )}
        
        {/* ROI Benefits */}
        {benefits && benefits.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-[12px] uppercase tracking-wide text-[#6B7280]">
              Key Benefits
            </h4>
            <div className="space-y-2">
              {benefits.map((benefit: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-[#F9FAFB]">
                  <Check className="h-5 w-5 text-[#16A34A] shrink-0 mt-0.5" />
                  <p className="text-[14px] text-[#4B5563] leading-relaxed">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* ROI Estimate Cards */}
        {estimates && estimates.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-[12px] uppercase tracking-wide text-[#6B7280]">
              Example Impact Estimates
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {estimates.map((estimate: ROIEstimate, idx: number) => (
                <Card key={idx} className="p-4 bg-white border-[#E5E7EB] border-l-4 border-l-[#FDE68A] hover:border-[#F59E0B] transition-colors">
                  <div className="space-y-2">
                    <p className="text-[12px] text-[#6B7280]">{estimate.scenario}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-[32px] font-bold text-[#111827]">
                        {estimate.estimated_annual_roi_pct}%
                      </p>
                      <ArrowUpRight className="h-4 w-4 text-[#F59E0B]" />
                    </div>
                    <p className="text-[12px] font-medium text-[#111827]">Annual ROI</p>
                    {estimate.estimated_savings && (
                      <p className="text-[12px] text-[#6B7280] pt-2 border-t border-[#E5E7EB]">
                        Est. Savings: {estimate.estimated_savings}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
