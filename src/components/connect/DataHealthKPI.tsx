import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface DataHealthKPIProps {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
}

export default function DataHealthKPI({ label, value, change, trend }: DataHealthKPIProps) {
  const isPositive = trend === "up";
  
  return (
    <Card className="p-6">
      <div className="text-sm text-muted-foreground mb-2">{label}</div>
      <div className="flex items-end justify-between">
        <div className="text-3xl font-bold">{value}</div>
        <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-primary" : "text-destructive"}`}>
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {change}
        </div>
      </div>
    </Card>
  );
}
