-- 1. Create data_centre_locations table (single source of truth for each DC)
CREATE TABLE IF NOT EXISTS public.data_centre_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT,
  country TEXT NOT NULL DEFAULT 'Canada',
  cloud_region TEXT,
  provider_type TEXT NOT NULL DEFAULT 'On-prem',
  industry TEXT NOT NULL DEFAULT 'cloud_saas',
  capacity_kw NUMERIC NOT NULL DEFAULT 5000,
  tier TEXT NOT NULL DEFAULT 'Tier III',
  tags JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_centre_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for locations
CREATE POLICY "Users can view their own locations"
ON public.data_centre_locations FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own locations"
ON public.data_centre_locations FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own locations"
ON public.data_centre_locations FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own locations"
ON public.data_centre_locations FOR DELETE
USING (auth.uid() = created_by);

-- 2. Add location_id to data_centre_twins table
ALTER TABLE public.data_centre_twins 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.data_centre_locations(id) ON DELETE SET NULL;

-- 3. Add twin_id foreign key to agent_definitions
ALTER TABLE public.agent_definitions
DROP CONSTRAINT IF EXISTS agent_definitions_twin_id_fkey;

ALTER TABLE public.agent_definitions
ADD CONSTRAINT agent_definitions_twin_id_fkey
FOREIGN KEY (twin_id) REFERENCES public.data_centre_twins(id) ON DELETE CASCADE;

-- 4. Add twin_id to agent_runs if not exists
ALTER TABLE public.agent_runs
DROP CONSTRAINT IF EXISTS agent_runs_twin_id_fkey;

ALTER TABLE public.agent_runs
ADD CONSTRAINT agent_runs_twin_id_fkey
FOREIGN KEY (twin_id) REFERENCES public.data_centre_twins(id) ON DELETE CASCADE;

-- 5. Add twin_id to agent_workflows
ALTER TABLE public.agent_workflows
DROP CONSTRAINT IF EXISTS agent_workflows_twin_id_fkey;

ALTER TABLE public.agent_workflows
ADD CONSTRAINT agent_workflows_twin_id_fkey
FOREIGN KEY (twin_id) REFERENCES public.data_centre_twins(id) ON DELETE CASCADE;

-- 6. Add twin_id to agent_definition_runs
ALTER TABLE public.agent_definition_runs
DROP CONSTRAINT IF EXISTS agent_definition_runs_twin_id_fkey;

ALTER TABLE public.agent_definition_runs
ADD CONSTRAINT agent_definition_runs_twin_id_fkey
FOREIGN KEY (twin_id) REFERENCES public.data_centre_twins(id) ON DELETE CASCADE;

-- 7. Create index for faster twin lookups
CREATE INDEX IF NOT EXISTS idx_data_centre_twins_location_id ON public.data_centre_twins(location_id);
CREATE INDEX IF NOT EXISTS idx_agent_definitions_twin_id ON public.agent_definitions(twin_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_twin_id ON public.agent_runs(twin_id);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_twin_id ON public.agent_workflows(twin_id);

-- 8. Update timestamp trigger for locations
CREATE TRIGGER update_data_centre_locations_updated_at
BEFORE UPDATE ON public.data_centre_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();