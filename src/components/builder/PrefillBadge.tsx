import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PrefillBadgeProps {
  show: boolean;
  source?: string;
}

export function PrefillBadge({ show, source = "template" }: PrefillBadgeProps) {
  if (!show) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="ml-2 gap-1 bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 transition-smooth"
          >
            <Sparkles className="h-3 w-3" />
            Prefilled
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-caption">Auto-populated from {source}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
