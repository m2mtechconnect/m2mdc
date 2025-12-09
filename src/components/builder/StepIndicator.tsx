import { CheckCircle2, AlertCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  step: number;
  label: string;
  status: "complete" | "incomplete" | "not-started";
  isActive: boolean;
  onClick?: () => void;
}

export function StepIndicator({ step, label, status, isActive, onClick }: StepIndicatorProps) {
  const getIcon = () => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />;
      case "incomplete":
        return <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />;
      case "not-started":
        return <Circle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />;
    }
  };

  const getColors = () => {
    if (isActive) {
      return "border-primary bg-primary/10 text-primary";
    }
    switch (status) {
      case "complete":
        return "border-success bg-success/10 text-success hover:bg-success/20";
      case "incomplete":
        return "border-warning bg-warning/10 text-warning hover:bg-warning/20";
      case "not-started":
        return "border-muted text-muted-foreground hover:bg-muted/50";
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 sm:px-4 rounded-lg border transition-all min-h-[44px] w-full sm:w-auto",
        getColors(),
        onClick && "cursor-pointer active:scale-[0.98]"
      )}
      disabled={!onClick}
      aria-label={`Step ${step}: ${label}`}
      aria-current={isActive ? "step" : undefined}
    >
      {getIcon()}
      <div className="flex flex-col items-start flex-1 min-w-0">
        <span className="text-xs font-medium">Step {step}</span>
        <span className="text-sm truncate w-full text-left">{label}</span>
      </div>
    </button>
  );
}
