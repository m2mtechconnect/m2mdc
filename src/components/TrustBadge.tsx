import { Shield, FileCheck, DollarSign, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type BadgeType = "grounded" | "draft" | "private" | "roi";

interface TrustBadgeProps {
  type: BadgeType;
  value?: string;
  className?: string;
}

export default function TrustBadge({ type, value, className }: TrustBadgeProps) {
  const badges = {
    grounded: {
      icon: FileCheck,
      label: "Grounded",
      color: "bg-secondary/10 text-secondary border-secondary/30",
      description: "Uses verified data sources",
    },
    draft: {
      icon: AlertCircle,
      label: "Draft AI",
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      description: "Assistant still training",
    },
    private: {
      icon: Shield,
      label: "Private Data",
      color: "bg-muted text-muted-foreground border-border",
      description: "Internal documents only",
    },
    roi: {
      icon: DollarSign,
      label: value || "ROI",
      color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
      description: "Measured business impact",
    },
  };

  const badge = badges[type];
  const Icon = badge.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-smooth",
        badge.color,
        className
      )}
      title={badge.description}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{badge.label}</span>
    </div>
  );
}
