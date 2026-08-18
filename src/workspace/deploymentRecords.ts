/**
 * AURA platform rebuild - Phase 9.
 *
 * Canonical deployment read/write model.
 *
 * Before this module the deployment UI advanced a stage list on `setTimeout`
 * timers: the progress a user saw was scripted, not observed, and the only
 * durable trace was a single terminal row written after the animation. Two
 * overlapping tables (`deployments`, `deployment_tracking`) recorded partly
 * the same facts.
 *
 * Canonical model from Phase 9 onward:
 *   - `public.deployments`        - current deployment state (mutable row)
 *   - `public.deployment_events`  - immutable, append-only step log
 *
 * `deployment_tracking` is deprecated and has no client grants.
 *
 * Every stage reported in the UI must correspond to a real operation whose
 * outcome is appended here. No stage may be advanced by a timer.
 */

import { supabase } from '@/integrations/supabase/client';

export type DeploymentEventStatus = 'started' | 'succeeded' | 'failed' | 'skipped';

export interface DeploymentEventRecord {
  id: string;
  deployment_id: string;
  system_id: string;
  sequence: number;
  stage: string;
  status: DeploymentEventStatus;
  detail: Record<string, unknown>;
  actor_id: string | null;
  occurred_at: string;
}

export interface DeploymentRecord {
  id: string;
  system_id: string;
  version: string;
  status: string;
  region: string;
  model: string | null;
  grounding: boolean | null;
  runtime_url: string | null;
  health: string | null;
  error_message: string | null;
  deployed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpenDeploymentInput {
  systemId: string;
  actorId: string;
  version?: string;
  region?: string;
  model?: string | null;
  grounding?: boolean | null;
}

/** Opens a deployment in `pending`. The row exists before any stage runs. */
export async function openDeployment(input: OpenDeploymentInput): Promise<DeploymentRecord> {
  const { data, error } = await supabase
    .from('deployments')
    .insert({
      system_id: input.systemId,
      version: input.version ?? 'v1',
      status: 'pending',
      region: input.region ?? 'northamerica-northeast1',
      model: input.model ?? null,
      grounding: input.grounding ?? null,
      deployed_by: input.actorId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as DeploymentRecord;
}

/**
 * Appends one immutable step outcome. `sequence` is caller-assigned and unique
 * per deployment, so a replayed log always reconstructs the same order.
 */
export async function appendDeploymentEvent(params: {
  deploymentId: string;
  systemId: string;
  actorId: string;
  sequence: number;
  stage: string;
  status: DeploymentEventStatus;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from('deployment_events').insert([{
    deployment_id: params.deploymentId,
    system_id: params.systemId,
    actor_id: params.actorId,
    sequence: params.sequence,
    stage: params.stage,
    status: params.status,
    detail: params.detail ?? {},
  }]);

  // Evidence loss must be visible, but it must not abort a deployment that
  // otherwise succeeded; the terminal state below is still recorded.
  if (error) console.error('[deploymentRecords] event append failed', error.message);
}

/** Records the terminal state of a deployment. */
export async function closeDeployment(params: {
  deploymentId: string;
  status: 'active' | 'failed';
  runtimeUrl?: string | null;
  health?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('deployments')
    .update({
      status: params.status,
      runtime_url: params.runtimeUrl ?? null,
      health: params.health ?? null,
      error_message: params.errorMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.deploymentId);

  if (error) throw error;
}

/** Reads the immutable step log for one deployment, in recorded order. */
export async function listDeploymentEvents(deploymentId: string): Promise<DeploymentEventRecord[]> {
  const { data, error } = await supabase
    .from('deployment_events')
    .select('*')
    .eq('deployment_id', deploymentId)
    .order('sequence', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as DeploymentEventRecord[];
}
