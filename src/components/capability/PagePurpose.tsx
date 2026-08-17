/**
 * Truthful page positioning header.
 *
 * Renders the page purpose statement and the compact capability indicator.
 * Both come from source-controlled configuration, so a page can never state
 * a purpose or a status the registry does not back.
 */
import { useEffect } from 'react';
import { positioningFor } from '@/config/pagePositioning';
import { DsxCapabilityIndicator } from './DsxCapabilityIndicator';
import { useRBAC } from '@/contexts/RBACContext';
import { cn } from '@/lib/utils';

interface Props {
  /** Canonical route key, e.g. '/analytics'. */
  route: string;
  /** Set the document title from the positioning map. */
  setDocumentTitle?: boolean;
  className?: string;
}

export function PagePurpose({ route, setDocumentTitle = true, className }: Props) {
  const positioning = positioningFor(route);
  const { can } = useRBAC();

  useEffect(() => {
    if (positioning && setDocumentTitle) {
      document.title = `${positioning.title} | AURA`;
    }
  }, [positioning, setDocumentTitle]);

  if (!positioning) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} data-page-purpose={route}>
      <p className="text-sm text-muted-foreground">{positioning.purpose}</p>
      <DsxCapabilityIndicator
        capabilityId={positioning.capabilityId}
        canViewProvenance={can('platform.view_admin_console')}
      />
    </div>
  );
}

export default PagePurpose;