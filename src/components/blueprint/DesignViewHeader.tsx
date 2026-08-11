/**
 * Design View Header
 * READ-ONLY summary header for the Design tab (formerly Blueprint tab)
 * Shows architecture summary with CTA to open Blueprint Designer
 */

import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPower } from '@/lib/units/power';
import { 
  Eye, ExternalLink, FileText, Lock, 
  Cpu, Zap, Thermometer, Globe
} from 'lucide-react';

interface DesignViewHeaderProps {
  twinName?: string;
  twinId?: string;
  facilityLocation?: string;
  capacityKw?: number;
  tier?: string;
  renewablePercent?: number;
}

export function DesignViewHeader({
  twinName = 'Sovereign AI Data Centre',
  twinId = 'default',
  facilityLocation = 'Montreal, QC',
  capacityKw = 10000,
  tier = 'Tier IV',
  renewablePercent = 95,
}: DesignViewHeaderProps) {
  const navigate = useNavigate();

  const handleOpenDesigner = () => {
    navigate(`/blueprint/${twinId}`);
  };

  return (
    <div className="rounded-lg border-2 border-muted bg-gradient-to-r from-muted/40 to-muted/20 p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Title and Status */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold">Design Overview</h2>
              <Badge variant="secondary" className="gap-1">
                <Eye className="h-3 w-3" />
                Read-Only Summary
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                View Only
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {twinName}
            </p>
          </div>
        </div>
        
        {/* Center: Architecture Summary Chips */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <Globe className="h-3.5 w-3.5" />
            {facilityLocation}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <Zap className="h-3.5 w-3.5" />
            {formatPower(capacityKw)}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <Thermometer className="h-3.5 w-3.5" />
            {tier}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1 text-success">
            <Cpu className="h-3.5 w-3.5" />
            {renewablePercent}% Renewable
          </Badge>
        </div>
        
        {/* Right: CTA Button */}
        <Button 
          onClick={handleOpenDesigner}
          className="gap-2 shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
          Open in Blueprint Designer
        </Button>
      </div>
      
      {/* Info Banner */}
      <div className="mt-4 pt-4 border-t border-muted">
        <p className="text-xs text-muted-foreground">
          This is a read-only summary of the design configuration. 
          To modify agents, KPIs, workflows, scenarios, or topology, use the Blueprint Designer.
        </p>
      </div>
    </div>
  );
}
