/**
 * Security Badge Component
 *
 * Shows only the security controls AURA actually implements. Certification
 * claims (SOC 2, ISO 27001, PIPEDA readiness) are not published because no
 * audit evidence exists - see src/config/complianceClaims.ts.
 */

import { Shield, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { publishablePlatformClaims } from '@/config/complianceClaims';

const CLAIM_ICONS: Record<string, typeof Shield> = {
  'transport-encryption': Lock,
  'at-rest-encryption': Shield,
  rbac: CheckCircle2,
};

interface SecurityBadgeProps {
  variant?: 'default' | 'minimal';
  className?: string;
}

export function SecurityBadge({ variant = 'default', className }: SecurityBadgeProps) {
  const claims = publishablePlatformClaims();

  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-1.5 text-xs text-muted-foreground',
          className,
        )}
      >
        <Lock className="h-3 w-3" aria-hidden="true" />
        <span>Secured by M2M AURA</span>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-4 py-4', className)}>
      {claims.map((claim, index) => {
        const Icon = CLAIM_ICONS[claim.id] ?? Shield;
        return (
          <div key={claim.id} className="flex items-center gap-4">
            {index > 0 && <div className="w-px h-3 bg-border" aria-hidden="true" />}
            <div
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
              title={claim.evidence}
            >
              <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>{claim.publicStatement}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
