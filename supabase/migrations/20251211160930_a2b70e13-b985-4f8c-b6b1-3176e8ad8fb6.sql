-- ============================================================================
-- P0: Add simulation_runs table for persisting simulation history
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.simulation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES public.data_centre_twins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  scenario_key TEXT NOT NULL,
  scenario_name TEXT,
  run_label TEXT,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  baseline_kpis JSONB DEFAULT '{}',
  final_kpis JSONB DEFAULT '{}',
  kpi_snapshots JSONB DEFAULT '[]',
  events JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for simulation_runs
CREATE POLICY "Users can view their own simulation runs"
ON public.simulation_runs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own simulation runs"
ON public.simulation_runs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own simulation runs"
ON public.simulation_runs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own simulation runs"
ON public.simulation_runs
FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_simulation_runs_twin_id ON public.simulation_runs(twin_id);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_user_id ON public.simulation_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_scenario_key ON public.simulation_runs(scenario_key);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_status ON public.simulation_runs(status);

-- ============================================================================
-- P0: Add missing timestamp fields to data_centre_twins for createdAt/updatedAt tracking
-- (Already has created_at and updated_at, this ensures we have deployed_at)
-- ============================================================================

ALTER TABLE public.data_centre_twins 
ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- Add trigger to update updated_at on data_centre_twins
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_data_centre_twins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_data_centre_twins_timestamp ON public.data_centre_twins;
CREATE TRIGGER update_data_centre_twins_timestamp
  BEFORE UPDATE ON public.data_centre_twins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_data_centre_twins_updated_at();