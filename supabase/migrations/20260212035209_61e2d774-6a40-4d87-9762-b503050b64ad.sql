
-- Create onboarding_submissions table for prospect questionnaire data
CREATE TABLE public.onboarding_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_size TEXT NOT NULL,
  num_data_centres TEXT NOT NULL,
  rack_count TEXT NOT NULL,
  workload_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_pue TEXT,
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  challenge TEXT,
  timeline TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;

-- Public insert policy (no auth required for lead capture)
CREATE POLICY "Anyone can submit onboarding form"
  ON public.onboarding_submissions
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated admins can read submissions
CREATE POLICY "Admins can view submissions"
  ON public.onboarding_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
