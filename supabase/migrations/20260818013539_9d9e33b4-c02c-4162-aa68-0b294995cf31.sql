-- Phase 7: `simulation_runs` is the canonical run table (full run envelope).
-- The earlier generations carry no engine version, execution origin, validation
-- status, snapshots or checksum. Both are empty and have no remaining readers,
-- so their Data API access is withdrawn now; the DROP is deliberately left to a
-- separate migration after an observation window.

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.twin_simulation_runs FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.twin_simulation_runs FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.sovereign_dc_simulation_runs FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.sovereign_dc_simulation_runs FROM anon;

COMMENT ON TABLE public.twin_simulation_runs IS
  'DEPRECATED (Phase 7). Superseded by public.simulation_runs, which carries the full run envelope. Data API access revoked; retained empty pending a separate drop migration.';
COMMENT ON TABLE public.sovereign_dc_simulation_runs IS
  'DEPRECATED (Phase 7). Superseded by public.simulation_runs, which carries the full run envelope. Data API access revoked; retained empty pending a separate drop migration.';