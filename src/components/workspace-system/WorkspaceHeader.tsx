/**
 * AURA shared workspace header.
 *
 * One premium, manifest-backed page banner used by every primary workspace
 * (Command Center, Blueprint, Simulation, Evidence, Connections, Runtime,
 * Learning Hub) so the product reads as a single system instead of a set of
 * one-off page shells.
 *
 * Truth rules: the header renders capability copy straight from the AURA stack
 * manifest and never invents status. Callers pass real badges/actions only.
 */
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { stackCopy } from '@/config/auraStackManifest';

export interface WorkspaceHeaderProps {
  /** Small uppercase context line, e.g. "Workspace" or "Govern". */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /**
   * Manifest capability id. When provided, the canonical customer-facing
   * description is rendered and its truth qualifier is shown as a chip.
   */
  capabilityId?: string;
  /** Overrides the manifest description when the surface needs local copy. */
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Status / provenance badges rendered under the title. */
  badges?: React.ReactNode;
  /** Right-aligned contextual actions. */
  actions?: React.ReactNode;
  /** Optional dense meta row (ids, timestamps). */
  meta?: React.ReactNode;
  as?: 'h1' | 'h2';
  /** `compact` is for full-height canvas workspaces with no vertical budget. */
  density?: 'default' | 'compact';
  className?: string;
}

export function WorkspaceHeader({
  eyebrow,
  title,
  capabilityId,
  description,
  icon: Icon,
  badges,
  actions,
  meta,
  as: Heading = 'h1',
  density = 'default',
  className,
}: WorkspaceHeaderProps) {
  const capability = capabilityId ? stackCopy(capabilityId) : null;
  const body = description ?? capability?.description ?? null;

  return (
    <header
      className={cn('aura-ws-header', className)}
      data-testid="workspace-header"
      data-capability={capabilityId}
      data-density={density}
    >
      <div className="aura-ws-header-main">
        {Icon ? (
          <span className="aura-ws-header-icon" aria-hidden="true">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="aura-ws-eyebrow">{eyebrow}</p> : null}
          <Heading className="aura-ws-title">{title}</Heading>
          {body ? <p className="aura-ws-description">{body}</p> : null}
          {badges || capability?.qualifier ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {capability?.qualifier ? (
                <span className="aura-ws-chip" data-variant="qualifier">
                  {capability.qualifier}
                </span>
              ) : null}
              {badges}
            </div>
          ) : null}
        </div>
      </div>
      {actions ? <div className="aura-ws-header-actions">{actions}</div> : null}
      {meta ? <div className="aura-ws-header-meta">{meta}</div> : null}
    </header>
  );
}

export default WorkspaceHeader;
