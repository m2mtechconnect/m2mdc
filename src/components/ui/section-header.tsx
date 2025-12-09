import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
  };
  badge?: ReactNode;
}

export function SectionHeader({ title, description, action, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-h1 gradient-text">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="text-body text-muted-foreground max-w-3xl">{description}</p>
        )}
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || "default"}
          className={action.variant === "default" ? "glow-yellow" : ""}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
