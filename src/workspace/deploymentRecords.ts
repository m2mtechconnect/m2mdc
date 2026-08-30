/**
 * Canonical AURA activation / deployment evidence model.
 *
 * `public.deployments` stores the current recorded state and
 * `public.deployment_events` stores immutable step evidence. An `active`
 * database row means the AURA configuration was activated. It does not prove
 * that an external runtime was provisioned or is healthy.
 */

import { supabase } from '@/integrations/supabase/client';

export type DeploymentEventStatus = 'started' | 'succeeded' | 'failed' | 'skipped';
export type DeploymentTruthState =
  | 'in_progress'
  | 'configuration_active'
  | 'runtime_connected'
  | 'runtime_verified'
  | 'failed';

export interface DeploymentEventRecord {
  id: string;
  deployment_id: string;
  system_id: string;
  sequence: number;
  stage: string;
  status: DeploymentEventStatus;
  detail: Record<string, unknown>;
  actor_id: string;
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
  deployed_by: string;
  org_id: string | null;
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

const VERIFIED_HEALTH = new Set(['OK', 'HEALTHY']);

/**
 * Derives what AURA can truthfully claim from persisted evidence.
 * Runtime verification requires both a concrete runtime URL and positive
 * health evidence. A configuration-only activation is never promoted.
 */
export function classifyDeploymentTruth(record: Pick<DeploymentRecord, 'status' | 'runtime_url' | 'health'>): DeploymentTruthState {
  if (record.status === 'failed') return 'failed';
  if (record.status !== 'active') return 'in_progress';

  const hasRuntime = typeof record.runtime_url === 'string' && record.runtime_url.trim().length > 0;
  const health = record.health?.trim().toUpperCase() ?? '';

  if (hasRuntime && VERIFIED_HEALTH.has(health)) return 'runtime_verified';
  if (hasRuntime && health.length > 0) return 'runtime_connected';
  return 'configuration_active';
}

export function deploymentTruthLabel(state: DeploymentTruthState): string {
  switch (state) {
    case 'configuration_active': return 'Configuration active';
    case 'runtime_connected': return 'Runtime connected';
    case 'runtime_verified': return 'Runtime verified';
    case 'failed': return 'Failed';
    default: return 'In progress';
  }
}

/** Opens an activation/deployment evidence record in `pending`. */
export async function openDeployment(input: OpenDeploymentInput): Promise<DeploymentRecord> {
  const { data, error } = await supabase
    .from('deployments')
    .insert({
      system_id: input.systemId,
      version: input.version ?? 'v1',
      status: 'pending',
      // Region is an optional evidence field. Do not fabricate a cloud runtime
      // region for configuration-only activation.
      region: input.region ?? 'not-applicable',
      model: input.model ?? null,
      grounding: input.grounding ?? null,
      deployed_by: input.actorId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as DeploymentRecord;
}

/** Appends one immutable stage outcome. */
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
    detail: (params.detail ?? {}) as never,
  }]);

  // An activation cannot be reported as successful when its immutable evidence
  // failed to persist. Let the caller record a truthful failed terminal state.
  if (error) throw error;
}

/** Records the terminal database state without inferring runtime evidence. */
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

/** Reads immutable stage evidence in recorded sequence. */
export async function listDeploymentEvents(deploymentId: string): Promise<DeploymentEventRecord[]> {
  const { data, error } = await supabase
    .from('deployment_events')
    .select('*')
    .eq('deployment_id', deploymentId)
    .order('sequence', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as DeploymentEventRecord[];
}
