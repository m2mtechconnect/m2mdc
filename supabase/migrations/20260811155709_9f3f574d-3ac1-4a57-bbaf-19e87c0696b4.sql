-- Stage 7J P0: capacity_kw stored as watts on legacy rows.
-- Rows above 1,000,000 kW (1 GW) are not credible facilities; they are watt
-- values written into a kilowatt column. Rescale once, at the source, so the
-- UI no longer needs a read-time heuristic that different surfaces applied
-- inconsistently (10 GW badge vs 10 MW model).
UPDATE public.data_centre_twins
SET capacity_kw = capacity_kw / 1000
WHERE capacity_kw > 1000000;

-- Prevent the defect from reappearing through any write path.
CREATE OR REPLACE FUNCTION public.validate_twin_capacity_kw()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.capacity_kw IS NOT NULL AND NEW.capacity_kw > 1000000 THEN
    RAISE EXCEPTION 'capacity_kw % exceeds the 1,000,000 kW (1 GW) plausibility limit. Store kilowatts, not watts.', NEW.capacity_kw;
  END IF;
  IF NEW.capacity_kw IS NOT NULL AND NEW.capacity_kw <= 0 THEN
    RAISE EXCEPTION 'capacity_kw must be greater than zero.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_twin_capacity_kw ON public.data_centre_twins;
CREATE TRIGGER validate_twin_capacity_kw
BEFORE INSERT OR UPDATE ON public.data_centre_twins
FOR EACH ROW EXECUTE FUNCTION public.validate_twin_capacity_kw();