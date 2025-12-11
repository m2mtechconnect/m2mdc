/**
 * ReadOnlyGuard Component
 * Wraps content and disables interactions in snapshot/read-only mode
 * Shows visual indicator that content is read-only
 */

import { ReactNode } from 'react';
import { useBlueprintView } from '@/context/BlueprintViewContext';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReadOnlyGuardProps {
  children: ReactNode;
  className?: string;
  showBadge?: boolean;
  badgePosition?: 'top-left' | 'top-right';
}

/**
 * Wraps content to disable pointer events in read-only/snapshot mode
 * Use this around editable sections that should be locked in simulation
 */
export function ReadOnlyGuard({ 
  children, 
  className,
  showBadge = false,
  badgePosition = 'top-right'
}: ReadOnlyGuardProps) {
  const { readOnly } = useBlueprintView();

  if (!readOnly) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Read-only overlay with reduced opacity */}
      <div className="pointer-events-none select-none opacity-75">
        {children}
      </div>
      
      {/* Optional read-only badge */}
      {showBadge && (
        <Badge 
          variant="secondary" 
          className={cn(
            "absolute gap-1 text-xs",
            badgePosition === 'top-left' ? 'top-2 left-2' : 'top-2 right-2'
          )}
        >
          <Lock className="h-3 w-3" />
          Read-Only
        </Badge>
      )}
    </div>
  );
}

/**
 * Hook to get read-only status for conditional rendering
 */
export function useReadOnlyMode() {
  const { readOnly, mode, capabilities } = useBlueprintView();
  
  return {
    isReadOnly: readOnly,
    isSnapshot: mode === 'simulationSnapshot',
    isDesignView: mode === 'designView',
    isDesigner: mode === 'designer',
    canEdit: !readOnly,
    capabilities,
  };
}

/**
 * Higher-order component to disable inputs in read-only mode
 */
export function withReadOnlyDisabled<P extends { disabled?: boolean }>(
  WrappedComponent: React.ComponentType<P>
) {
  return function ReadOnlyDisabledComponent(props: P) {
    const { isReadOnly } = useReadOnlyMode();
    return <WrappedComponent {...props} disabled={isReadOnly || props.disabled} />;
  };
}
