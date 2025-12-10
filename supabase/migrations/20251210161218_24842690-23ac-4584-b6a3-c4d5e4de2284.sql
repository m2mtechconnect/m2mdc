-- Seed initial locations for existing data centre twins that have null location_id

-- First, create locations based on existing twins' cities
INSERT INTO public.data_centre_locations (name, city, country, created_by)
SELECT DISTINCT 
  t.city || ' Data Centre Location' as name,
  t.city,
  CASE 
    WHEN t.region_code LIKE 'CA-%' THEN 'Canada'
    WHEN t.region_code LIKE 'US-%' THEN 'United States'
    ELSE 'Canada'
  END as country,
  t.created_by_user as created_by
FROM public.data_centre_twins t
WHERE t.location_id IS NULL
  AND t.city IS NOT NULL
ON CONFLICT DO NOTHING;

-- Now update twins to link to their matching locations
UPDATE public.data_centre_twins t
SET location_id = l.id
FROM public.data_centre_locations l
WHERE t.location_id IS NULL
  AND t.city = l.city
  AND t.created_by_user = l.created_by;