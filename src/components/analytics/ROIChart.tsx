import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPercentage } from "@/lib/formatters";

interface ROIChartProps {
  data: { week: number; roi: number }[];
}

export default function ROIChart({ data }: ROIChartProps) {
  const firstROI = data?.[0]?.roi || 0;
  const lastROI = data?.[data.length - 1]?.roi || 0;
  const growth = firstROI !== 0 ? ((lastROI - firstROI) / firstROI) * 100 : 0;

  return (
    <Card className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-display font-bold">ROI Growth Over Time</h2>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-secondary" />
          <span className="font-semibold text-secondary">
            +{Math.round(growth)}% Growth
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="week"
            label={{ value: 'Week', position: 'insideBottom', offset: -5 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            label={{ value: 'ROI %', angle: -90, position: 'insideLeft' }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [formatPercentage(value, 0), 'ROI']}
          />
          <Area
            type="monotone"
            dataKey="roi"
            stroke="hsl(var(--secondary))"
            strokeWidth={2}
            fill="url(#roiGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-6 flex items-center justify-center gap-8">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">Week 1</p>
          <p className="text-sm text-muted-foreground">{Math.round(firstROI)}% ROI</p>
        </div>
        <div className="h-px w-24 bg-primary" />
        <div className="text-center">
          <p className="text-2xl font-bold text-secondary">Week 12</p>
          <p className="text-sm text-muted-foreground">{Math.round(lastROI)}% ROI</p>
        </div>
      </div>
    </Card>
  );
}
