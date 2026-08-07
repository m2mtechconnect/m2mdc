-- Phase 1 / B-02 step 1: extend canonical role enum with labels already in use.
-- Must be its own migration: new enum labels cannot be USED in the transaction
-- that adds them.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';