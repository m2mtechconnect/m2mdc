/**
 * Compact, manifest-driven summary of the AURA platform stack.
 *
 * Rendered only where a user genuinely needs to understand what the platform
 * is made of (Learning Hub architecture, Platform readiness overview). Every
 * row comes from `customerVisibleStack(surface)` so there is exactly one
 * customer-facing stack vocabulary, and each row carries its evidence
 * qualifier so an aligned-but-not-deployed capability can never read as live.
 *
 * No provider logos and no vendor names: named third-party technology appears
 * only when the manifest entry explicitly permits it.
 */
import { Badge } from '@/components/ui/badge';
import {
  customerVisibleStack,
  evidenceQualifier,
  type StackEvidenceStatus,
  type StackSurface,
} from '@/config/auraStackManifest';

function statusVariant(status: StackEvidenceStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'AVAILABLE') return 'secondary';
  if (status === 'UNAVAILABLE') return 'outline';
  return 'outline';
}

export interface AURAStackSummaryProps {
  surface: StackSurface;
  className?: string;
}

export function AURAStackSummary({ surface, className }: AURAStackSummaryProps) {
  const capabilities = customerVisibleStack(surface);
  if (capabilities.length === 0) return null;

  return (
    <ul className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${className ?? ''}`.trim()}>
      {capabilities.map((capability) => {
        const qualifier = evidenceQualifier(capability.evidenceStatus);
        return (
          <li
            key={capability.id}
            className="rounded-lg border border-border bg-card p-4"
            data-stack-capability={capability.id}
          >
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{capability.label}</span>
              <Badge variant={statusVariant(capability.evidenceStatus)} className="text-xs">
                {qualifier ?? 'Available'}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{capability.description}</p>
            {capability.namedTechnology ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Names {capability.namedTechnology.name}: {capability.namedTechnology.policyReason}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default AURAStackSummary;
