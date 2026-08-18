REVOKE ALL ON public.twin_telemetry FROM anon, authenticated;
REVOKE ALL ON public.twin_kpi_snapshots FROM anon, authenticated;

COMMENT ON TABLE public.twin_telemetry IS
  'DEPRECATED (Phase 11). Superseded by public.twin_property_values, which carries provenance. No client access.';
COMMENT ON TABLE public.twin_kpi_snapshots IS
  'DEPRECATED (Phase 11). Superseded by the KPI envelope on public.simulation_runs. No client access.';