-- AURA AI Usage Controls & Model Evaluation Lab — durable usage/rate policy.
--
-- This migration creates service-only accounting and atomic request reservation.
-- It does not configure a provider, create a credential, change the active model,
-- or assign monetary cost where no trustworthy pricing evidence is available.

create table if not exists public.ai_usage_policies (
  operation text primary key,
  bucket_group text not null,
  user_hourly_limit integer not null check (user_hourly_limit > 0),
  tenant_hourly_limit integer not null check (tenant_hourly_limit > 0),
  enabled boolean not null default true,
  rationale text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_rate_limit_buckets (
  subject_type text not null check (subject_type in ('user', 'tenant')),
  subject_id uuid not null,
  bucket_group text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (subject_type, subject_id, bucket_group, window_start)
);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  correlation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid null references public.organizations(id) on delete set null,
  agent_id uuid null references public.agents(id) on delete set null,
  operation text not null,
  provider_class text not null check (provider_class in ('aura-managed', 'nvidia-hosted', 'private-compatible', 'unknown')),
  model_profile text null check (model_profile is null or model_profile in ('fast', 'reasoning', 'supervisor')),
  model_id text null,
  status text not null check (status in ('reserved', 'completed', 'failed', 'quota-blocked')),
  input_tokens bigint null check (input_tokens is null or input_tokens >= 0),
  output_tokens bigint null check (output_tokens is null or output_tokens >= 0),
  total_tokens bigint null check (total_tokens is null or total_tokens >= 0),
  latency_ms integer null check (latency_ms is null or latency_ms >= 0),
  estimated_cost_usd numeric(18, 8) null check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  benchmark_mode boolean not null default false,
  provider_usage jsonb not null default '{}'::jsonb,
  error_code text null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events (user_id, created_at desc);
create index if not exists ai_usage_events_tenant_created_idx
  on public.ai_usage_events (tenant_id, created_at desc)
  where tenant_id is not null;
create index if not exists ai_usage_events_agent_created_idx
  on public.ai_usage_events (agent_id, created_at desc)
  where agent_id is not null;
create index if not exists ai_usage_events_provider_model_idx
  on public.ai_usage_events (provider_class, model_id, created_at desc);

alter table public.ai_usage_policies enable row level security;
alter table public.ai_rate_limit_buckets enable row level security;
alter table public.ai_usage_events enable row level security;

-- These tables are server control-plane state. Signed-in users never mutate or
-- query them directly; approved UI reporting goes through audited Edge Functions.
create policy ai_usage_policies_service_only on public.ai_usage_policies
  for all to authenticated using (false) with check (false);
create policy ai_rate_limit_buckets_service_only on public.ai_rate_limit_buckets
  for all to authenticated using (false) with check (false);
create policy ai_usage_events_service_only on public.ai_usage_events
  for all to authenticated using (false) with check (false);

revoke all on table public.ai_usage_policies from anon, authenticated;
revoke all on table public.ai_rate_limit_buckets from anon, authenticated;
revoke all on table public.ai_usage_events from anon, authenticated;

-- Safety defaults are request-rate controls, not pricing claims. The existing
-- streaming path already used 30 requests/hour per process; this preserves that
-- user-level ceiling while making it durable and shared across all instances.
insert into public.ai_usage_policies (
  operation, bucket_group, user_hourly_limit, tenant_hourly_limit, enabled, rationale
) values
  ('agent_run', 'agent-interactive', 30, 300, true, 'Durable replacement for the prior 30/hour instance-local agent limit.'),
  ('agent_execute', 'agent-interactive', 30, 300, true, 'Shares the interactive-agent ceiling so alternate endpoints cannot bypass it.'),
  ('agent_stream', 'agent-interactive', 30, 300, true, 'Preserves the existing 30/hour user safety ceiling with distributed enforcement.'),
  ('agent_preview', 'builder-ai', 20, 200, true, 'Builder preview is paid inference and is intentionally lower-volume than normal execution.'),
  ('agent_suggestions', 'builder-ai', 20, 200, true, 'Suggestions share the Builder paid-inference ceiling with preview.'),
  ('model_test', 'model-test', 10, 100, true, 'Connectivity tests are explicit operator actions and should remain low-volume.'),
  ('model_compare', 'model-evaluation', 10, 100, true, 'Multi-model comparison can multiply spend; a dedicated evaluation budget is required.'),
  ('shadow_evaluation', 'model-evaluation', 10, 100, true, 'Shadow evaluation shares the model-evaluation ceiling and never bypasses budget controls.')
on conflict (operation) do update set
  bucket_group = excluded.bucket_group,
  user_hourly_limit = excluded.user_hourly_limit,
  tenant_hourly_limit = excluded.tenant_hourly_limit,
  enabled = excluded.enabled,
  rationale = excluded.rationale,
  updated_at = now();

create or replace function public.reserve_ai_request(
  _user_id uuid,
  _tenant_id uuid,
  _operation text,
  _now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.ai_usage_policies%rowtype;
  w timestamptz := date_trunc('hour', _now);
  user_count integer;
  tenant_count integer := null;
begin
  if _user_id is null then
    raise exception 'AURA_AI_USER_REQUIRED';
  end if;

  select * into p
  from public.ai_usage_policies
  where operation = _operation and enabled = true;

  if not found then
    raise exception 'AURA_AI_POLICY_MISSING';
  end if;

  insert into public.ai_rate_limit_buckets(subject_type, subject_id, bucket_group, window_start, request_count)
  values ('user', _user_id, p.bucket_group, w, 0)
  on conflict do nothing;

  select request_count into user_count
  from public.ai_rate_limit_buckets
  where subject_type = 'user'
    and subject_id = _user_id
    and bucket_group = p.bucket_group
    and window_start = w
  for update;

  if user_count >= p.user_hourly_limit then
    raise exception 'AURA_AI_RATE_LIMIT_USER';
  end if;

  update public.ai_rate_limit_buckets
  set request_count = request_count + 1, updated_at = now()
  where subject_type = 'user'
    and subject_id = _user_id
    and bucket_group = p.bucket_group
    and window_start = w
  returning request_count into user_count;

  if _tenant_id is not null then
    insert into public.ai_rate_limit_buckets(subject_type, subject_id, bucket_group, window_start, request_count)
    values ('tenant', _tenant_id, p.bucket_group, w, 0)
    on conflict do nothing;

    select request_count into tenant_count
    from public.ai_rate_limit_buckets
    where subject_type = 'tenant'
      and subject_id = _tenant_id
      and bucket_group = p.bucket_group
      and window_start = w
    for update;

    if tenant_count >= p.tenant_hourly_limit then
      raise exception 'AURA_AI_RATE_LIMIT_TENANT';
    end if;

    update public.ai_rate_limit_buckets
    set request_count = request_count + 1, updated_at = now()
    where subject_type = 'tenant'
      and subject_id = _tenant_id
      and bucket_group = p.bucket_group
      and window_start = w
    returning request_count into tenant_count;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'operation', p.operation,
    'bucket_group', p.bucket_group,
    'window_start', w,
    'user_count', user_count,
    'user_limit', p.user_hourly_limit,
    'tenant_count', tenant_count,
    'tenant_limit', case when _tenant_id is null then null else p.tenant_hourly_limit end
  );
end;
$$;

revoke all on function public.reserve_ai_request(uuid, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_ai_request(uuid, uuid, text, timestamptz) to service_role;
