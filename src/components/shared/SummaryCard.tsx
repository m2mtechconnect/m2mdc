/**
 * Summary Card - Reusable metric summary card with status styling
 */

import { Card, CardContent } from '@/components/ui/card';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ElementType;
}

export function SummaryCard({ title, value, subtitle, status, icon: Icon }: SummaryCardProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'good': return { text: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
      case 'warning': return { text: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
      case 'critical': return { text: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/20' };
    }
  };

  const styles = getStatusStyles();

  return (
    <Card className={`border-border/50 ${styles.border}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${styles.bg}`}>
            <Icon className={`h-5 w-5 ${styles.text}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className={`text-xl font-bold ${styles.text}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
