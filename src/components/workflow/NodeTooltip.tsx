import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface NodeTooltipProps {
  title: string;
  description: string;
  example: string;
  children: React.ReactNode;
}

export function NodeTooltip({ title, description, example, children }: NodeTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs p-4">
          <div className="space-y-2">
            <div className="font-semibold flex items-center gap-2">
              {title}
              <Info className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-primary mb-1">Example:</p>
              <p className="text-xs text-muted-foreground italic">{example}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}