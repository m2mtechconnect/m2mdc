/**
 * Compact, consistent capability indicator.
 *
 * Reads the capability registry only. It never accepts a status prop, so a
 * page cannot assert a claim the registry does not support.
 */
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import {
  DSX_STATUS_LABEL,
  getCapability,
  type DsxStatus,
} from '@/config/dsxCapabilityRegistry';
import { allowedClaimsFor } from '@/config/dsxClaimsPolicy';
import { cn } from '@/lib/utils';

const TONE: Record<DsxStatus, string> = {
  AURA_NATIVE: 'border-border text-foreground',
  DSX_ALIGNED: 'border-border text-foreground',
  NVIDIA_INTEGRATED: 'border-border text-foreground',
  SIMREADY_VALIDATED: 'border-border text-foreground',
  PLANNED: 'border-border text-muted-foreground',
  BLOCKED: 'border-destructive/40 text-destructive',
  UNAVAILABLE: 'border-border text-muted-foreground',
};

interface Props {
  capabilityId: string;
  /** Authorized users get a link to the full provenance record. */
  canViewProvenance?: boolean;
  className?: string;
}

export function DsxCapabilityIndicator({ capabilityId, canViewProvenance, className }: Props) {
  const cap = getCapability(capabilityId);
  if (!cap) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={`capability-indicator-${cap.id}`}
          data-capability-status={cap.status}
          aria-label={`Capability status: ${DSX_STATUS_LABEL[cap.status]}`}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
            TONE[cap.status],
            className,
          )}
        >
          <Info className="h-3 w-3" aria-hidden />
          {DSX_STATUS_LABEL[cap.status]}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[100] w-80 bg-card text-xs">
        <p className="text-sm font-semibold text-foreground">{cap.name}</p>
        <dl className="mt-2 space-y-1.5">
          <div>
            <dt className="text-muted-foreground">Implemented by</dt>
            <dd className="text-foreground">{cap.owner}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">DSX area</dt>
            <dd className="text-foreground">{cap.dsxArea}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Data source</dt>
            <dd className="text-foreground">{cap.dataSource}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last validated</dt>
            <dd className="text-foreground">{cap.lastValidatedAt ?? 'Never validated'}</dd>
          </div>
          {cap.limitations.length > 0 && (
            <div>
              <dt className="text-muted-foreground">Limitations</dt>
              <dd>
                <ul className="list-disc pl-4 text-foreground">
                  {cap.limitations.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
          {cap.blockers.length > 0 && (
            <div>
              <dt className="text-muted-foreground">Blocked by</dt>
              <dd>
                <ul className="list-disc pl-4 text-foreground">
                  {cap.blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Claims allowed</dt>
            <dd className="text-foreground">{allowedClaimsFor(cap).join(', ') || 'None'}</dd>
          </div>
        </dl>
        {canViewProvenance && (
          <Link
            to="/admin/dsx-capabilities"
            className="mt-3 inline-block text-[11px] font-medium underline"
          >
            Open technical provenance
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default DsxCapabilityIndicator;