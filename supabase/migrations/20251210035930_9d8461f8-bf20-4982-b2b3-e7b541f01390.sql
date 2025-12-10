-- PHASE 1: Create data_centre_twins table
CREATE TABLE public.data_centre_twins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  region_code TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Tier III',
  capacity_kw NUMERIC NOT NULL DEFAULT 5000,
  blueprint_id UUID REFERENCES public.digital_twins(id),
  created_by_user UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  industry TEXT DEFAULT 'cloud_saas',
  pue_target NUMERIC DEFAULT 1.3,
  renewable_target_pct INTEGER DEFAULT 80,
  carbon_intensity NUMERIC DEFAULT 30,
  sovereignty_level TEXT DEFAULT 'standard'
);

-- Create index on user and region
CREATE INDEX idx_data_centre_twins_user ON public.data_centre_twins(created_by_user);
CREATE INDEX idx_data_centre_twins_region ON public.data_centre_twins(region_code);

-- Enable RLS
ALTER TABLE public.data_centre_twins ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own twins"
  ON public.data_centre_twins FOR SELECT
  USING (auth.uid() = created_by_user);

CREATE POLICY "Users can create their own twins"
  ON public.data_centre_twins FOR INSERT
  WITH CHECK (auth.uid() = created_by_user);

CREATE POLICY "Users can update their own twins"
  ON public.data_centre_twins FOR UPDATE
  USING (auth.uid() = created_by_user);

CREATE POLICY "Users can delete their own twins"
  ON public.data_centre_twins FOR DELETE
  USING (auth.uid() = created_by_user);

-- Add twin_id to agents table
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS twin_id UUID REFERENCES public.data_centre_twins(id);
CREATE INDEX IF NOT EXISTS idx_agents_twin_id ON public.agents(twin_id);

-- Add twin_id to agent_definitions table
ALTER TABLE public.agent_definitions ADD COLUMN IF NOT EXISTS twin_id UUID REFERENCES public.data_centre_twins(id);
CREATE INDEX IF NOT EXISTS idx_agent_definitions_twin_id ON public.agent_definitions(twin_id);

-- Add twin_id to agent_runs table
ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS twin_id UUID REFERENCES public.data_centre_twins(id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_twin_id ON public.agent_runs(twin_id);

-- Add twin_id to agent_workflows table
ALTER TABLE public.agent_workflows ADD COLUMN IF NOT EXISTS twin_id UUID REFERENCES public.data_centre_twins(id);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_twin_id ON public.agent_workflows(twin_id);

-- Add twin_id to dc_scan_sessions table
ALTER TABLE public.dc_scan_sessions ADD COLUMN IF NOT EXISTS twin_id UUID REFERENCES public.data_centre_twins(id);

-- Create twin_telemetry table for rack/power/cooling data
CREATE TABLE public.twin_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES public.data_centre_twins(id) ON DELETE CASCADE,
  domain TEXT NOT NULL, -- thermal, power, cooling, network, facility, workload, sovereignty, financial
  metric_key TEXT NOT NULL,
  metric_value NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_twin_telemetry_twin_domain ON public.twin_telemetry(twin_id, domain);
CREATE INDEX idx_twin_telemetry_recorded_at ON public.twin_telemetry(recorded_at DESC);

ALTER TABLE public.twin_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view telemetry for their twins"
  ON public.twin_telemetry FOR SELECT
  USING (twin_id IN (SELECT id FROM public.data_centre_twins WHERE created_by_user = auth.uid()));

CREATE POLICY "Users can insert telemetry for their twins"
  ON public.twin_telemetry FOR INSERT
  WITH CHECK (twin_id IN (SELECT id FROM public.data_centre_twins WHERE created_by_user = auth.uid()));

-- Create twin_kpi_snapshots table
CREATE TABLE public.twin_kpi_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES public.data_centre_twins(id) ON DELETE CASCADE,
  kpi_key TEXT NOT NULL,
  kpi_value NUMERIC,
  kpi_unit TEXT,
  domain TEXT,
  snapshot_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_twin_kpi_snapshots_twin ON public.twin_kpi_snapshots(twin_id, kpi_key);

ALTER TABLE public.twin_kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view KPIs for their twins"
  ON public.twin_kpi_snapshots FOR SELECT
  USING (twin_id IN (SELECT id FROM public.data_centre_twins WHERE created_by_user = auth.uid()));

CREATE POLICY "Users can insert KPIs for their twins"
  ON public.twin_kpi_snapshots FOR INSERT
  WITH CHECK (twin_id IN (SELECT id FROM public.data_centre_twins WHERE created_by_user = auth.uid()));

-- Create twin_simulation_runs table
CREATE TABLE public.twin_simulation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES public.data_centre_twins(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  scenario_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  kpi_deltas JSONB DEFAULT '{}'::jsonb,
  events JSONB DEFAULT '[]'::jsonb,
  result_summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_twin_simulation_runs_twin ON public.twin_simulation_runs(twin_id);

ALTER TABLE public.twin_simulation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view simulations for their twins"
  ON public.twin_simulation_runs FOR SELECT
  USING (twin_id IN (SELECT id FROM public.data_centre_twins WHERE created_by_user = auth.uid()));

CREATE POLICY "Users can create simulations for their twins"
  ON public.twin_simulation_runs FOR INSERT
  WITH CHECK (twin_id IN (SELECT id FROM public.data_centre_twins WHERE created_by_user = auth.uid()));

CREATE POLICY "Users can update simulations for their twins"
  ON public.twin_simulation_runs FOR UPDATE
  USING (twin_id IN (SELECT id FROM public.data_centre_twins WHERE created_by_user = auth.uid()));

-- Create twin_sovereignty_events table
CREATE TABLE public.twin_sovereignty_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES public.data_centre_twins(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  source_region TEXT,
  destination_region TEXT,
  data_classification TEXT,
  compliance_status TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_twin_sovereignty_events_twin ON public.twin_sovereignty_events(twin_id);

ALTER TABLE public.twin_sovereignty_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sovereignty events for their twins"
  ON public.twin_sovereignty_events FOR SELECT
  USING (twin_id IN (SELECT id FROM public.data_centre_twins WHERE created_by_user = auth.uid()));

CREATE POLICY "Users can insert sovereignty events for their twins"
  ON public.twin_sovereignty_events FOR INSERT
  WITH CHECK (twin_id IN (SELECT id FROM public.data_centre_twins WHERE created_by_user = auth.uid()));

-- Create twin_carbon_emissions table
CREATE TABLE public.twin_carbon_emissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES public.data_centre_twins(id) ON DELETE CASCADE,
  emissions_kg NUMERIC NOT NULL,
  renewable_pct NUMERIC,
  grid_carbon_intensity NUMERIC,
  power_consumption_kwh NUMERIC,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_twin_carbon_emissions_twin ON public.twin_carbon_emissions(twin_id);

ALTER TABLE public.twin_carbon_emissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view carbon emissions for their twins"
  ON public.twin_carbon_emissions FOR SELECT
  USING (twin_id IN (SELECT id FROM public.data_centre_twins WHERE created_by_user = auth.uid()));

CREATE POLICY "Users can insert carbon emissions for their twins"
  ON public.twin_carbon_emissions FOR INSERT
  WITH CHECK (twin_id IN (SELECT id FROM public.data_centre_twins WHERE created_by_user = auth.uid()));

-- Create twin_financial_records table
CREATE TABLE public.twin_financial_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES public.data_centre_twins(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL, -- opex, capex, revenue, cost
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'CAD',
  category TEXT,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_twin_financial_records_twin ON public.twin_financial_records(twin_id);

ALTER TABLE public.twin_financial_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view financial records for their twins"
  ON public.twin_financial_records FOR SELECT
  USING (twin_id IN (SELECT id FROM public.data_centre_twins WHERE created_by_user = auth.uid()));

CREATE POLICY "Users can insert financial records for their twins"
  ON public.twin_financial_records FOR INSERT
  WITH CHECK (twin_id IN (SELECT id FROM public.data_centre_twins WHERE created_by_user = auth.uid()));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_data_centre_twins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_data_centre_twins_updated_at
  BEFORE UPDATE ON public.data_centre_twins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_data_centre_twins_updated_at();