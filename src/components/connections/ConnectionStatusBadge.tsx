import { Badge } from '@/components/ui/badge';
import { CheckCircle2, CircleDashed, AlertTriangle, XCircle } from 'lucide-react';
import { STATUS_DESCRIPTORS, type ConnectionStatus } from '@/connections/model';

const TONE_CLASS: Record<string, string> = {
  positive: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  caution: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  critical: 'border-destructive/40 bg-destructive/10 text-destructive',
  neutral: 'border-border bg-muted text-muted-foreground',
};

const TONE_ICON = {
  positive: CheckCircle2,
  caution: AlertTriangle,
  critical: XCircle,
  neutral: CircleDashed,
};

/** Status is never conveyed by colour alone: icon + text label always present. */
export function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  const descriptor = STATUS_DESCRIPTORS[status] ?? STATUS_DESCRIPTORS.DRAFT;
  const Icon = TONE_ICON[descriptor.tone];
  return (
    <Badge variant="outline" className={`gap-1.5 text-xs ${TONE_CLASS[descriptor.tone]}`} title={descriptor.meaning}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {descriptor.label}
    </Badge>
  );
}