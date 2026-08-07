-- Phase 1 / B-02 step 1b: the user_roles CHECK constraint and the frontend
-- AppRole union permit six labels absent from public.app_role. Add them so the
-- type conversion in step 2 cannot lose or reject a valid assignment.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'compliance';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'data_analyst';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';