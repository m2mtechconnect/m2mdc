CREATE TABLE public.decision_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  recommendation_id text not null,
  outcome text not null check (outcome in ('approved','rejected','escalated')),
  rationale text not null check (length(btrim(rationale)) >= 10),
  approver text not null,
  comment text,
  escalated_to text,
  execution_status text not null default 'not_executed' check (execution_status in ('not_executed','manual_execution_pending','manual_execution_recorded')),
  decided_at timestamptz not null,
  timeline_id text not null,
  data_mode text not null check (data_mode in ('SIMULATED','REPLAYED')),
  observation_tick integer not null,
  evidence_snapshot jsonb not null,
  snapshot_hash text not null,
  created_at timestamptz not null default now()
);

COMMENT ON TABLE public.decision_records IS 'Phase 12 canonical append-only human decision log for Evidence recommendations. Rows are immutable: no update or delete grants.';

CREATE INDEX decision_records_user_decided_idx ON public.decision_records (user_id, decided_at DESC);
CREATE UNIQUE INDEX decision_records_dedupe_idx ON public.decision_records (user_id, recommendation_id, snapshot_hash);

GRANT SELECT, INSERT ON public.decision_records TO authenticated;
GRANT ALL ON public.decision_records TO service_role;

ALTER TABLE public.decision_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "decision_records_select_own" ON public.decision_records
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "decision_records_insert_own" ON public.decision_records
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());