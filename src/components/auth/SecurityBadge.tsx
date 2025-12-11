/**
 * Security Badge Component
 * Shows trust indicators for enterprise auth
 */

import { Shield, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SecurityBadgeProps {
  variant?: 'default' | 'minimal';
  className?: string;
}

export function SecurityBadge({ variant = 'default', className }: SecurityBadgeProps) {
  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center justify-center gap-1.5 text-xs text-muted-foreground", className)}>
        <Lock className="h-3 w-3" />
        <span>Secured by M2M Sovereign Cloud</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center gap-4 py-4", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5 text-success" />
        <span>SOC 2 Compliant</span>
      </div>
      <div className="w-px h-3 bg-border" />
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 text-primary" />
        <span>256-bit Encryption</span>
      </div>
      <div className="w-px h-3 bg-border" />
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-info" />
        <span>PIPEDA Ready</span>
      </div>
    </div>
  );
}
