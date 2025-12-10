/**
 * Last Scan Banner
 * Shows the user's last scan session with quick actions
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  ExternalLink, 
  RefreshCw, 
  Eye,
  Building2
} from "lucide-react";
import type { LastScanSummary } from "@/types/dcScan";
import { INDUSTRY_LABELS } from "@/types/dcScan";
import { formatDistanceToNow } from "date-fns";

interface LastScanBannerProps {
  lastScan: LastScanSummary;
  onViewRecommendation: () => void;
  onRescan: () => void;
  onOpenTwin: () => void;
}

export function LastScanBanner({
  lastScan,
  onViewRecommendation,
  onRescan,
  onOpenTwin
}: LastScanBannerProps) {
  if (!lastScan.exists || !lastScan.url) {
    return null;
  }

  const domain = (() => {
    try {
      return new URL(lastScan.url).hostname.replace("www.", "");
    } catch {
      return lastScan.url;
    }
  })();

  const industryLabel = lastScan.detectedIndustry 
    ? INDUSTRY_LABELS[lastScan.detectedIndustry] 
    : "Unknown";

  const timeAgo = lastScan.createdAt 
    ? formatDistanceToNow(new Date(lastScan.createdAt), { addSuffix: true })
    : "";

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg border mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-studio-muted" />
          <span className="text-studio-muted">Last scan:</span>
          <span className="font-medium text-foreground">{domain}</span>
        </div>
        
        <Badge variant="secondary" className="text-xs">
          <Building2 className="h-3 w-3 mr-1" />
          {industryLabel}
        </Badge>
        
        {lastScan.blueprintName && (
          <span className="text-sm text-studio-body">
            → {lastScan.blueprintName}
          </span>
        )}
        
        {timeAgo && (
          <span className="text-xs text-studio-muted">
            ({timeAgo})
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onViewRecommendation}
          className="h-8"
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRescan}
          className="h-8"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Re-scan
        </Button>
        
        {lastScan.blueprintId && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onOpenTwin}
            className="h-8"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open Twin
          </Button>
        )}
      </div>
    </div>
  );
}
