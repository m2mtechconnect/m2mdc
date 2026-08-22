import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');

const MIGRATION = 'supabase/migrations/20260822195500_aura_ai_usage_controls.sql';

describe('durable AI usage architecture', () => {
  it('keeps AI usage accounting separate from public-intake rate limiting', () => {
    const migration = read(MIGRATION);
    const helper = read('supabase/functions/_shared/ai-usage.ts');
    expect(migration).toContain('ai_usage_events');
    expect(migration).toContain('ai_rate_limit_buckets');
    expect(migration).not.toContain('public_intake_rate_limits');
    expect(helper).not.toContain('public_intake_rate_limits');
  });

  it('makes the ledger and limiter service-only', () => {
    const migration = read(MIGRATION);
    expect(migration).toContain('ai_usage_events_service_only');
    expect(migration).toContain('ai_rate_limit_buckets_service_only');
    expect(migration).toContain('revoke all on table public.ai_usage_events from anon, authenticated');
    expect(migration).toContain('grant execute on function public.reserve_ai_request');
    expect(migration).not.toMatch(/grant\s+(select|insert|update|delete).*authenticated/i);
  });

  it('uses one durable interactive bucket across run execute and stream', () => {
    const migration = read(MIGRATION);
    for (const operation of ['agent_run', 'agent_execute', 'agent_stream']) {
      expect(migration).toContain(`('${operation}', 'agent-interactive', 30, 300`);
    }
  });

  it('reserves capacity and ledger evidence before paid inference', () => {
    const helper = read('supabase/functions/_shared/ai-usage.ts');
    expect(helper).toContain("rpc('reserve_ai_request'");
    expect(helper).toContain("status: 'reserved'");
    expect(helper).toContain('AI_USAGE_LEDGER_WRITE_FAILED');
    expect(helper).toContain('finalizeAiUsage');
  });

  it('does not invent model pricing', () => {
    const migration = read(MIGRATION);
    const helper = read('supabase/functions/_shared/ai-usage.ts');
    expect(migration).toContain('estimated_cost_usd numeric(18, 8) null');
    expect(helper).not.toMatch(/pricePer|costPer|usdPer|tokenPrice/i);
  });
});
